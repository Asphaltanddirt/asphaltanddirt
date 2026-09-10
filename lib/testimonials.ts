import { listRecords, isAirtableConfigured } from "@/lib/airtable";

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  rating: number;
  quote: string;
}

// Own base (not the Road & Trail Crew base the other Airtable-backed
// features use) — keeps its record count independent on the free plan.
const BASE_ID = process.env.AIRTABLE_TESTIMONIALS_BASE_ID;
const TABLE = process.env.AIRTABLE_TESTIMONIALS_TABLE || "Testimonials";

/** "customer" = merch buyers (Role = Customer), shown on the Merch page.
 *  "community" = everyone else (Podcast Listener, Event Attendee,
 *  Community Member, Other), shown on the Community page.
 *  "homepage" = a hand-picked 3-up on the home page (the Homepage checkbox
 *  in Airtable), ordered Customer -> Community -> Event so the merch /
 *  community / event angles line up. */
export type TestimonialAudience = "all" | "customer" | "community" | "homepage";

// Home-page ordering: merch, then community, then event.
const HOMEPAGE_ROLE_ORDER = ["Customer", "Community Member", "Event Attendee"];

function filterFor(audience: TestimonialAudience) {
  if (audience === "customer") return "AND({Approved}=1, {Role}='Customer')";
  if (audience === "community") return "AND({Approved}=1, {Role}!='Customer')";
  if (audience === "homepage") return "AND({Approved}=1, {Homepage}=1)";
  return "{Approved}=1";
}

/** Approved, community-submitted testimonials — cached for 15 minutes since
 *  this gets fetched on every visit to pages that show it (Merch, Community),
 *  not just an admin dashboard. */
export async function getApprovedTestimonials(limit = 3, audience: TestimonialAudience = "all"): Promise<Testimonial[]> {
  if (!isAirtableConfigured(BASE_ID)) return [];

  try {
    const records = await listRecords(TABLE, filterFor(audience), { revalidate: 900, baseId: BASE_ID });

    return records
      .map((r) => ({
        id: r.id,
        name: (r.fields.Name as string) || "Anonymous",
        role: (r.fields.Role as string) || "Community Member",
        rating: Number(r.fields.Rating) || 5,
        quote: (r.fields.Quote as string) || "",
        createdTime: r.createdTime,
      }))
      .filter((t) => t.quote)
      .sort((a, b) => {
        if (audience === "homepage") {
          const rank = (role: string) => {
            const i = HOMEPAGE_ROLE_ORDER.indexOf(role);
            return i === -1 ? HOMEPAGE_ROLE_ORDER.length : i;
          };
          return rank(a.role) - rank(b.role);
        }
        return a.createdTime < b.createdTime ? 1 : -1; // newest first
      })
      .slice(0, limit)
      .map(({ id, name, role, rating, quote }) => ({ id, name, role, rating, quote }));
  } catch (err) {
    console.error("Testimonials fetch error", err);
    return [];
  }
}
