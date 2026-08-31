import { listRecords, isAirtableConfigured } from "@/lib/airtable";

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  rating: number;
  quote: string;
}

const TABLE = process.env.AIRTABLE_TESTIMONIALS_TABLE || "Testimonials";

/** Approved, community-submitted testimonials — cached for 15 minutes since
 *  this gets fetched on every visit to pages that show it (Home, Community),
 *  not just an admin dashboard. */
export async function getApprovedTestimonials(limit = 3): Promise<Testimonial[]> {
  if (!isAirtableConfigured()) return [];

  try {
    const records = await listRecords(TABLE, "{Approved}=1", { revalidate: 900 });

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
