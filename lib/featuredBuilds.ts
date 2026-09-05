import { listRecords, isAirtableConfigured } from "@/lib/airtable";
import type { Build } from "@/lib/builds";

// Own base (Website APIs — the same one Quick Links lives in), not the
// Road & Trail Crew base the ambassador/application tables use.
const BASE_ID = process.env.AIRTABLE_FEATURED_BUILDS_BASE_ID;
const TABLE = process.env.AIRTABLE_FEATURED_BUILDS_TABLE || "Featured Builds";

const GRID_SIZE = 4;

/** Which 4 builds show in the "Featured Rigs" grid on /builds, in order —
 *  looked up by slug against whatever build list the caller has (team
 *  builds, or team + approved community builds). Falls back to the first 4
 *  of the caller's own list if Airtable isn't configured, the table is
 *  empty, or a configured slug doesn't match a real build (e.g. renamed) —
 *  the grid is never just empty because of a stale Airtable row.
 *  Cached for 15 minutes since this hits the public /builds page. */
export async function getFeaturedBuilds(allBuilds: Build[]): Promise<Build[]> {
  const fallback = allBuilds.slice(0, GRID_SIZE);
  if (!isAirtableConfigured(BASE_ID)) return fallback;

  try {
    const records = await listRecords(TABLE, "{Featured}=1", { revalidate: 900, baseId: BASE_ID });

    const bySlug = new Map(allBuilds.map((b) => [b.slug, b]));
    const featured = records
      .map((r) => ({
        slug: (r.fields["Build Slug"] as string) || "",
        order: Number(r.fields["Display Order"]) || 0,
      }))
      .sort((a, b) => a.order - b.order)
      .map((r) => bySlug.get(r.slug))
      .filter((b): b is Build => Boolean(b))
      .slice(0, GRID_SIZE);

    return featured.length ? featured : fallback;
  } catch (err) {
    console.error("Featured builds fetch error", err);
    return fallback;
  }
}
