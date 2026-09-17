import { listRecords, updateRecord, isAirtableConfigured, type AirtableRecord } from "@/lib/airtable";
import { createPercentPromotion, findPromotionByCode, PromotionCodeTakenError } from "@/lib/fourthwall-platform";
import { isValidPromoCode, normalizePromoCode, referralLinkFor } from "@/lib/ambassadorReferral";

/**
 * Onboarding an accepted ambassador from the Garage, so nobody opens Airtable
 * or Fourthwall for it: send Welcome 1, create their discount code (in
 * Fourthwall, from a code + percent typed in the Garage), send Welcome 2.
 * Owners only; the API route checks.
 */

const AMBASSADORS_TABLE = process.env.AIRTABLE_AMBASSADORS_TABLE || "Ambassadors";

export interface Onboarding {
  id: string;
  name: string;
  tier: string;
  welcome1Sent: string;
  agreementSigned: string;
  promoCode: string;
  discountPercent: number | null;
  link: string;
  welcome2Sent: string;
  linkVisits: number;
  kitSent: string;
  shirtSize: string;
  shippingAddress: string;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
/** "" when not done, else the date it was done (or "yes" when there's no date). */
const done = (flag: unknown, date: unknown) => (flag === true ? str(date) || "yes" : "");

export async function getAmbassadorRecord(id: string): Promise<AirtableRecord | null> {
  if (!isAirtableConfigured() || !/^rec[A-Za-z0-9]{14}$/.test(id)) return null;
  return (await listRecords(AMBASSADORS_TABLE, `RECORD_ID() = '${id}'`))[0] || null;
}

export function toOnboarding(r: AirtableRecord): Onboarding {
  const f = r.fields;
  const code = str(f["Promo Code"]);
  return {
    id: r.id,
    name: str(f.Name),
    tier: str(f.Tier),
    welcome1Sent: done(f["Welcome 1 Sent"], f["Welcome 1 Sent Date"]),
    agreementSigned: done(f["Agreement Signed"], f["Agreement Signed Date"]),
    promoCode: code,
    discountPercent: typeof f["Discount Percent"] === "number" ? (f["Discount Percent"] as number) : null,
    link: str(f["Tracking Link"]) || (code ? referralLinkFor(code) : ""),
    welcome2Sent: done(f["Welcome 2 Sent"], f["Welcome 2 Sent Date"]),
    linkVisits: Number(f["Link Visits"]) || 0,
    kitSent: done(f["Kit Sent"], f["Kit Sent Date"]),
    shirtSize: str(f["Shirt Size"]),
    shippingAddress: str(f["Shipping Address"]),
  };
}

export type CreateCodeResult =
  | { ok: true; onboarding: Onboarding }
  | { ok: false; status: number; error: string; canUseExisting?: boolean };

/**
 * Creates the code in Fourthwall and saves it on the record with its
 * Promotion ID (what commission reports match on), the percent and the
 * ambassador's /r/ link. If the code is already in Fourthwall but no
 * ambassador has it (say a save failed after Fourthwall made it),
 * `useExisting` attaches that one instead of making a new one.
 */
export async function createAmbassadorCode(
  record: AirtableRecord,
  rawCode: unknown,
  rawPercent: unknown,
  useExisting = false,
): Promise<CreateCodeResult> {
  if (str(record.fields["Promo Code"])) {
    return { ok: false, status: 409, error: `${str(record.fields.Name)} already has code ${str(record.fields["Promo Code"])}.` };
  }
  const code = normalizePromoCode(rawCode);
  if (!isValidPromoCode(code)) {
    return { ok: false, status: 400, error: "Codes are 3 to 20 letters and numbers, no spaces." };
  }
  const percent = Math.round(Number(rawPercent));
  if (!Number.isFinite(percent) || percent < 1 || percent > 50) {
    return { ok: false, status: 400, error: "Pick a discount from 1% to 50%." };
  }

  const others = await listRecords(AMBASSADORS_TABLE, `UPPER({Promo Code}) = '${code}'`);
  const owner = others.find((o) => o.id !== record.id);
  if (owner) {
    return { ok: false, status: 409, error: `${code} already belongs to ${str(owner.fields.Name) || "another ambassador"}. Pick another.` };
  }

  let promotion: { id: string; percentage: number | null };
  try {
    const created = await createPercentPromotion(code, percent);
    promotion = { id: created.id, percentage: percent };
  } catch (err) {
    if (!(err instanceof PromotionCodeTakenError)) {
      console.error("Fourthwall create promotion failed", err);
      return { ok: false, status: 502, error: "Couldn't reach Fourthwall to create the code. Try again." };
    }
    const existing = await findPromotionByCode(code).catch(() => null);
    if (!existing) {
      return { ok: false, status: 409, error: `${code} is already taken in Fourthwall. Pick another.` };
    }
    if (!useExisting) {
      return {
        ok: false,
        status: 409,
        canUseExisting: true,
        error: `${code} already exists in Fourthwall${existing.percentage ? ` (${existing.percentage}% off)` : ""}, but it isn't anyone's code here. Use that one, or pick a different code.`,
      };
    }
    promotion = { id: existing.id, percentage: existing.percentage };
  }

  const updated = await updateRecord(AMBASSADORS_TABLE, record.id, {
    "Promo Code": code,
    "Fourthwall Promotion ID": promotion.id,
    "Discount Percent": promotion.percentage ?? percent,
    "Tracking Link": referralLinkFor(code),
  });
  return { ok: true, onboarding: toOnboarding(updated) };
}

/** Marks the welcome kit shipped (today) from the Garage. */
export async function markKitSent(record: AirtableRecord): Promise<Onboarding> {
  const updated = await updateRecord(AMBASSADORS_TABLE, record.id, {
    "Kit Sent": true,
    "Kit Sent Date": new Date().toISOString().slice(0, 10),
  });
  return toOnboarding(updated);
}
