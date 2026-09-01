import { listRecords, isAirtableConfigured } from "@/lib/airtable";

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  rating: number;
  quote: string;
}

const TABLE = process.env.AIRTABLE_TESTIMONIALS_TABLE || "Testimonials";

/** "customer" = merch buyers (Role = Customer), shown on the Merch page.
 *  "community" = everyone else (Podcast Listener, Event Attendee, Trail
 *  Rider, Community Member, Other), shown on the Community page. Each
 *  testimonial appears in exactly one of the two. */
export type TestimonialAudience = "all" | "customer" | "community";

function filterFor(audience: TestimonialAudience) {
  if (audience === "customer") return "AND({Approved}=1, {Role}='Customer')";
  if (audience === "community") return "AND({Approved}=1, {Role}!='Customer')";
  return "{Approved}=1";
}

/** Approved, community-submitted testimonials — cached for 15 minutes since
 *  this gets fetched on every visit to pages that show it (Merch, Community),
 *  not just an admin dashboard. */
export async function getApprovedTestimonials(limit = 3, audience: TestimonialAudience = "all"): Promise<Testimonial[]> {
  if (!isAirtableConfigured()) return [];

  try {
    const records = await listRecords(TABLE, filterFor(audience), { revalidate: 900 });

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
      .sort((a, b) => (a.createdTime < b.createdTime ? 1 : -1)) // newest first
      .slice(0, limit)
      .map(({ id, name, role, rating, quote }) => ({ id, name, role, rating, quote }));
  } catch (err) {
    console.error("Testimonials fetch error", err);
    return [];
  }
}
