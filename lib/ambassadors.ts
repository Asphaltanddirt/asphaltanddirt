import { listRecords, isAirtableConfigured } from "@/lib/airtable";

export interface FeaturedAmbassador {
  id: string;
  slug: string;
  name: string;
  tier: string;
  tagline: string;
  bio: string;
  photo: string;
  vehicle?: string;
  buildSlug?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
}

const TABLE = process.env.AIRTABLE_AMBASSADORS_TABLE || "Ambassadors";

/** Active ambassadors the team has deliberately opted into showing on the
 *  public /team page — being Active alone isn't enough (Featured on Team
 *  Page is a separate checkbox), same "approve before public" pattern as
 *  testimonials/builds. Cached for 15 minutes since /team gets real traffic. */
export async function getFeaturedAmbassadors(): Promise<FeaturedAmbassador[]> {
  if (!isAirtableConfigured()) return [];

  try {
    const records = await listRecords(
      TABLE,
      "AND({Status}='Active', {Featured on Team Page}=1)",
      { revalidate: 900 },
    );

    return records
      .map((r) => {
        const photos = r.fields["Profile Photo"] as { url: string }[] | undefined;
        const vehicle = r.fields["Vehicle (from Application)"] as string[] | undefined;
        return {
          id: r.id,
          slug: (r.fields.Slug as string) || "",
          name: (r.fields.Name as string) || "",
          tier: (r.fields.Tier as string) || "Road & Trail Member",
          tagline: (r.fields["Public Tagline"] as string) || "",
          bio: (r.fields["Public Bio"] as string) || "",
          photo: photos?.[0]?.url || "",
          vehicle: vehicle?.[0],
          buildSlug: (r.fields["Linked Build Slug"] as string) || undefined,
          instagramUrl: (r.fields["Instagram URL"] as string) || undefined,
          tiktokUrl: (r.fields["TikTok URL"] as string) || undefined,
          youtubeUrl: (r.fields["YouTube URL"] as string) || undefined,
        };
      })
      .filter((a) => a.name && a.photo && a.bio && a.slug) // needs the essentials to render a real card
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error("Ambassadors fetch error", err);
    return [];
  }
}

/** Looks up one featured ambassador for their /team/[slug] bio page. Reuses
 *  the same cached list rather than a second Airtable query — there are only
 *  ever a handful of featured ambassadors at once. */
export async function findFeaturedAmbassadorBySlug(
  slug: string,
): Promise<FeaturedAmbassador | undefined> {
  const ambassadors = await getFeaturedAmbassadors();
  return ambassadors.find((a) => a.slug === slug);
}
