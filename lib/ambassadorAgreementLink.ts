import crypto from "node:crypto";
import { listRecords } from "@/lib/airtable";
import { parseSocialLines, type SocialLink } from "@/lib/socialLinks";

/**
 * A personal link to the Brand Ambassador Agreement, sent in Welcome Email 1.
 * It carries the Ambassador record ID plus a signature, so the page can fill in
 * what we already know (from the application and the ambassador record) and
 * the new ambassador only confirms it. Without a valid signature the page is
 * the same blank form as before: nobody can type an email and see someone
 * else's phone or address.
 */

const SITE = "https://www.asphaltanddirt.com";
const AMBASSADORS_TABLE = process.env.AIRTABLE_AMBASSADORS_TABLE || "Ambassadors";
const APPLICATIONS_TABLE = "Applications";

function sign(recordId: string): string {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) throw new Error("ADMIN_API_SECRET is not configured.");
  return crypto.createHmac("sha256", secret).update(`ambassador-agreement:${recordId}`).digest("base64url");
}

export function agreementLinkFor(recordId: string): string {
  try {
    return `${SITE}/ambassadors/agreement?id=${recordId}&t=${sign(recordId)}`;
  } catch {
    return `${SITE}/ambassadors/agreement`;
  }
}

export function verifyAgreementLink(id: unknown, token: unknown): id is string {
  if (typeof id !== "string" || typeof token !== "string" || !/^rec[A-Za-z0-9]{14}$/.test(id)) return false;
  let expected: Buffer;
  try {
    expected = Buffer.from(sign(id));
  } catch {
    return false;
  }
  const given = Buffer.from(token);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

export interface AgreementPrefill {
  email: string;
  phone: string;
  /** Every social they've given us, on any platform. */
  socials: SocialLink[];
  vehicle: string;
  shippingAddress: string;
  shirtSize: string;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** What we already know for this ambassador, preferring their Ambassador record
 *  and falling back to their application. */
export async function getAgreementPrefill(recordId: string): Promise<AgreementPrefill | null> {
  const [ambassador] = await listRecords(AMBASSADORS_TABLE, `RECORD_ID() = '${recordId}'`);
  if (!ambassador) return null;
  const a = ambassador.fields;
  const appId = ((a["Related Application"] as string[]) || [])[0];
  const app = appId ? (await listRecords(APPLICATIONS_TABLE, `RECORD_ID() = '${appId}'`))[0]?.fields || {} : {};

  // Their main handle first, then everything else, without repeats.
  const socials = parseSocialLines(
    [
      str(app["Primary Social Handle"]),
      str(a["Instagram URL"]),
      str(a["TikTok URL"]),
      str(a["YouTube URL"]),
      str(a["Social Links"]),
      str(app["Social Links"]),
    ].join("\n"),
  );

  return {
    email: str(a.Email) || str(app.Email),
    phone: str(a.Phone) || str(app.Phone),
    socials,
    vehicle: str(a["Vehicle / Build"]) || str(app["Primary Vehicle / Build"]),
    shippingAddress: str(a["Shipping Address"]),
    shirtSize: str(a["Shirt Size"]),
  };
}
