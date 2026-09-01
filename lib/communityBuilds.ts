import { listRecords, isAirtableConfigured, type AirtableRecord } from "@/lib/airtable";
import { builds as teamBuilds, type Build, type BuildCategory, type BuildSpec, type BuildStat } from "@/lib/builds";

// Own base (not Road & Trail Crew or Testimonials) — keeps its record and
// attachment counts independent on the free plan. Photos are compressed
// client-side before upload (see lib/imageCompress.ts), so per-base
// attachment storage should stay well within the free plan's limit.
const BASE_ID = process.env.AIRTABLE_BUILD_SUBMISSIONS_BASE_ID;
const TABLE = process.env.AIRTABLE_BUILD_SUBMISSIONS_TABLE || "Submissions";

// Mirrors the <select> in BuildSubmissionForm and the Category single-select's
// exact choices in Airtable.
export const CATEGORY_LABELS: Record<BuildCategory, string> = {
  "daily-driven": "Daily-Driven",
  "trail-built": "Trail-Built",
  overland: "Overland",
  performance: "Performance",
};

const CATEGORY_BY_LABEL: Record<string, BuildCategory> = Object.fromEntries(
  Object.entries(CATEGORY_LABELS).map(([slug, label]) => [label, slug as BuildCategory]),
);

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function uniqueSlug(base: string, used: Set<string>) {
  let slug = base || "rig";
  let i = 2;
  while (used.has(slug)) {
    slug = `${base}-${i}`;
    i++;
  }
  used.add(slug);
  return slug;
}

interface AttachmentField {
  url: string;
  filename?: string;
}

function mapRecordToBuild(record: AirtableRecord, usedSlugs: Set<string>): Build | null {
  const f = record.fields;
  const submitterName = ((f.Name as string) || "").trim();
  const rigName = ((f["Rig Name"] as string) || "").trim();
  const vehicle = ((f.Vehicle as string) || "").trim();
  const photos = (f.Photos as AttachmentField[] | undefined) || [];

  // Not enough to render a real build page — skip rather than show a broken card.
  if (!rigName || !vehicle || photos.length === 0) return null;

  const category = CATEGORY_BY_LABEL[(f.Category as string) || ""] || "trail-built";
  const slug = uniqueSlug(slugify(rigName), usedSlugs);

  const heroImage = { src: photos[0].url, alt: `${rigName}, ${submitterName ? `${submitterName}'s ` : ""}${vehicle}` };
  const gallery = photos.slice(1).map((p, i) => ({ src: p.url, alt: `${rigName} photo ${i + 2}` }));

  const stats: BuildStat[] = (
    [
      f["Stat Power"] && { value: f["Stat Power"] as string, unit: "Horsepower / Engine", icon: "bolt" as const },
      f["Stat Tires"] && { value: f["Stat Tires"] as string, unit: "Tire Size", icon: "compass" as const },
      f["Stat Lift"] && { value: f["Stat Lift"] as string, unit: "Lift Height", icon: "lift" as const },
    ] as (BuildStat | undefined)[]
  ).filter((s): s is BuildStat => Boolean(s));

  const specs: BuildSpec[] = (
    [
      { label: "Base Vehicle", value: vehicle, icon: "vehicle" as const },
      f["Spec Engine"] && { label: "Engine", value: f["Spec Engine"] as string, icon: "bolt" as const },
      f["Spec Suspension"] && { label: "Suspension", value: f["Spec Suspension"] as string, icon: "lift" as const },
      f["Spec Wheels Tires"] && { label: "Wheels & Tires", value: f["Spec Wheels Tires"] as string, icon: "compass" as const },
      f["Spec Other"] && { label: "Other Mods", value: f["Spec Other"] as string, icon: "wrench" as const },
    ] as (BuildSpec | undefined)[]
  ).filter((s): s is BuildSpec => Boolean(s));

  return {
    slug,
    nameLines: [rigName],
    vehicle,
    lead: (f.Tagline as string) || "",
    kicker: submitterName ? `${submitterName}'s Submission` : "Community Submission",
    category,
    stats,
    listingImage: heroImage,
    heroImage,
    listingSpecs: specs.filter((s) => s.label !== "Base Vehicle").slice(0, 4).map(({ label, value }) => ({ label, value })),
    specs,
    aboutText: (f.Story as string) || "",
    aboutStats: [],
    gallery: gallery.length > 0 ? gallery : undefined,
  };
}

/** Approved community build submissions, shaped as real Build records so
 *  they render on /builds and get a full /builds/[slug] page exactly like
 *  the 4 team builds. Always call after the static `builds` array so slugs
 *  are deduped against team slugs first — team builds keep their URLs. */
export async function getApprovedCommunityBuilds(): Promise<Build[]> {
  if (!isAirtableConfigured(BASE_ID)) return [];

  try {
    const records = await listRecords(TABLE, "{Approved}=1", { revalidate: 900, baseId: BASE_ID });
    const usedSlugs = new Set(teamBuilds.map((b) => b.slug));
    return records
      .map((r) => mapRecordToBuild(r, usedSlugs))
      .filter((b): b is Build => b !== null);
  } catch (err) {
    console.error("Community builds fetch error", err);
    return [];
  }
}
