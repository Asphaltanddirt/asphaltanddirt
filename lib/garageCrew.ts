import { listRecords, updateRecord, isAirtableConfigured, type AirtableFields } from "@/lib/airtable";
import { ambassadorSocials, firstSocial, formatSocialLines, type SocialLink } from "@/lib/socialLinks";

/**
 * The Crew screen's data: an ambassador's own record from the Road & Trail
 * Crew base — their code, tracking link, commissions — plus the public profile
 * fields they can edit themselves (the "team profile socials" job that used to
 * be a chase over text).
 *
 * Matched on the email they signed in with. Someone with no ambassador record
 * (Jose, Anthony) simply gets no crew card.
 */

const BASE_ID = process.env.AIRTABLE_BASE_ID;
const AMBASSADORS = "Ambassadors";
const SNAPSHOTS = "Monthly Commission Snapshots";

export interface CrewProfile {
  id: string;
  name: string;
  tier: string;
  status: string;
  promoCode: string;
  trackingLink: string;
  commissionRate: number | null;
  foundingCrew: boolean;
  agreementSigned: boolean;
  buildSlug: string;
  /** Editable by the ambassador in the Garage. */
  tagline: string;
  bio: string;
  vehicle: string;
  /** Every social link, any platform. */
  socials: SocialLink[];
  featured: boolean;
  photoUrl: string;
}

export interface CrewMonth {
  month: string;
  orders: number;
  subtotal: number;
  owed: number;
  payoutStatus: string;
}

function toProfile(r: { id: string; fields: AirtableFields }): CrewProfile {
  const photos = r.fields["Profile Photo"] as { url: string }[] | undefined;
  const vehicleLookup = r.fields["Vehicle (from Application)"] as string[] | undefined;
  return {
    id: r.id,
    name: (r.fields.Name as string) || "",
    tier: (r.fields.Tier as string) || "",
    status: (r.fields.Status as string) || "",
    promoCode: (r.fields["Promo Code"] as string) || "",
    trackingLink: (r.fields["Tracking Link"] as string) || "",
    commissionRate: typeof r.fields["Commission Rate"] === "number" ? (r.fields["Commission Rate"] as number) : null,
    foundingCrew: Boolean(r.fields["Founding Crew (2026)"]),
    agreementSigned: Boolean(r.fields["Agreement Signed"]),
    buildSlug: (r.fields["Linked Build Slug"] as string) || "",
    tagline: (r.fields["Public Tagline"] as string) || "",
    bio: (r.fields["Public Bio"] as string) || "",
    vehicle: (r.fields["Vehicle / Build"] as string) || vehicleLookup?.[0] || "",
    socials: ambassadorSocials(r.fields),
    featured: Boolean(r.fields["Featured on Team Page"]),
    photoUrl: photos?.[0]?.url || "",
  };
}

export async function getCrewProfile(email: string): Promise<CrewProfile | null> {
  if (!isAirtableConfigured(BASE_ID) || !email) return null;
  const records = await listRecords(AMBASSADORS, undefined, { baseId: BASE_ID });
  const want = email.trim().toLowerCase();
  const match = records.find((r) => ((r.fields.Email as string) || "").trim().toLowerCase() === want);
  return match ? toProfile(match) : null;
}

/** Their last few months of commission, newest first. */
export async function getCrewMonths(ambassadorId: string): Promise<CrewMonth[]> {
  if (!isAirtableConfigured(BASE_ID)) return [];
  const records = await listRecords(SNAPSHOTS, undefined, { baseId: BASE_ID });
  return records
    .filter((r) => ((r.fields.Ambassador as string[]) || []).includes(ambassadorId))
    .map((r) => ({
      month: (r.fields.Month as string) || "",
      orders: Number(r.fields["Tracked Orders Count"]) || 0,
      subtotal: Number(r.fields["Net Merch Subtotal"]) || 0,
      owed: Number(r.fields["Commission Owed"]) || 0,
      payoutStatus: (r.fields["Payout Status"] as string) || "",
    }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 6);
}

export interface CrewProfileEdit {
  tagline: string;
  bio: string;
  vehicle: string;
  socials: SocialLink[];
}

const httpOnly = (url: string) => (/^https?:\/\//i.test(url) ? url : null);

/** What an ambassador may change about themselves. Tier, code, commission and
 *  whether they're featured are deliberately not in this list. */
export async function saveCrewProfile(id: string, edit: CrewProfileEdit): Promise<void> {
  if (!isAirtableConfigured(BASE_ID)) throw new Error("Road & Trail Crew base is not configured.");
  await updateRecord(
    AMBASSADORS,
    id,
    {
      "Public Tagline": edit.tagline.slice(0, 120),
      "Public Bio": edit.bio.slice(0, 2000),
      "Vehicle / Build": edit.vehicle.slice(0, 120),
      "Social Links": formatSocialLines(edit.socials) || null,
      "Instagram URL": httpOnly(firstSocial(edit.socials, "Instagram")),
      "TikTok URL": httpOnly(firstSocial(edit.socials, "TikTok")),
      "YouTube URL": httpOnly(firstSocial(edit.socials, "YouTube")),
    },
    { baseId: BASE_ID },
  );
}
