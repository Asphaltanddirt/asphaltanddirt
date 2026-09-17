import { revalidatePath } from "next/cache";
import { createRecord, listRecords, updateRecord, isAirtableConfigured, type AirtableRecord } from "@/lib/airtable";
import { builds as teamBuilds } from "@/lib/builds";
import { getApprovedCommunityBuilds } from "@/lib/communityBuilds";
import { MERCH_COLLECTIONS } from "@/lib/fourthwall";

/**
 * The Garage review screens (replace the Airtable Build Submissions Review,
 * Testimonials Review and Featured Builds/Products editing): approve or
 * decline what the public sends in, and pick what the site features. Same
 * tables and fields the site already reads. Owners only; routes check.
 */

const BUILDS_BASE = process.env.AIRTABLE_BUILD_SUBMISSIONS_BASE_ID;
const BUILDS_TABLE = process.env.AIRTABLE_BUILD_SUBMISSIONS_TABLE || "Submissions";
const REVIEWS_BASE = process.env.AIRTABLE_TESTIMONIALS_BASE_ID;
const REVIEWS_TABLE = process.env.AIRTABLE_TESTIMONIALS_TABLE || "Testimonials";
const SOCIAL_TABLE = "Social Proof";
const FEATURED_BUILDS_BASE = process.env.AIRTABLE_FEATURED_BUILDS_BASE_ID;
const FEATURED_BUILDS_TABLE = process.env.AIRTABLE_FEATURED_BUILDS_TABLE || "Featured Builds";
const FEATURED_PRODUCTS_BASE = process.env.AIRTABLE_FEATURED_PRODUCTS_BASE_ID;
const FEATURED_PRODUCTS_TABLE = process.env.AIRTABLE_FEATURED_PRODUCTS_TABLE || "Featured Products";

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const attachments = (v: unknown) =>
  ((v as { url: string; thumbnails?: { large?: { url: string } } }[] | undefined) || []).map((a) => ({
    thumb: a.thumbnails?.large?.url || a.url,
    full: a.url,
  }));

export type ReviewState = "waiting" | "approved" | "declined";
const stateOf = (f: AirtableRecord["fields"]): ReviewState => (f.Approved === true ? "approved" : f.Declined === true ? "declined" : "waiting");

function refresh(paths: string[]) {
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch (err) {
      console.error("revalidate failed", path, err);
    }
  }
}

// ---------------------------------------------------------------------------
// Build submissions
// ---------------------------------------------------------------------------

export interface BuildSubmission {
  id: string;
  created: string;
  state: ReviewState;
  ambassador: boolean;
  name: string;
  email: string;
  handle: string;
  rigName: string;
  vehicle: string;
  category: string;
  oneLine: string;
  specs: { label: string; value: string }[];
  about: string;
  photos: { thumb: string; full: string }[];
  /** Why it can't show on the site even if approved (the site skips it). */
  missing: string[];
}

const BUILD_SPEC_FIELDS: [string, string][] = [
  ["Horsepower / Engine", "Horsepower / engine"],
  ["Tire Size", "Tire size"],
  ["Lift Height", "Lift height"],
  ["Engine", "Engine"],
  ["Suspension / Lift", "Suspension / lift"],
  ["Wheels & Tires", "Wheels & tires"],
  ["Other Mods, Armor, Electronics, Etc.", "Other mods"],
];

export async function listBuildSubmissions(): Promise<BuildSubmission[]> {
  if (!isAirtableConfigured(BUILDS_BASE)) return [];
  const records = await listRecords(BUILDS_TABLE, undefined, { baseId: BUILDS_BASE });
  return records
    .map((r) => {
      const f = r.fields;
      const photos = attachments(f.Photos);
      const rigName = str(f["Rig Name"]);
      const vehicle = str(f.Vehicle);
      return {
        id: r.id,
        created: (r.createdTime || "").slice(0, 10),
        state: stateOf(f),
        ambassador: f.Ambassador === true,
        name: str(f["Full Name"]),
        email: str(f.Email),
        handle: str(f["Instagram / Social Handle"]),
        rigName,
        vehicle,
        category: str(f["Build Category"]),
        oneLine: str(f["One-Line Description"]),
        specs: BUILD_SPEC_FIELDS.map(([field, label]) => ({ label, value: str(f[field]) })).filter((s) => s.value),
        about: str(f["About This Build"]),
        photos,
        missing: [!rigName && "a rig name", !vehicle && "the vehicle", !photos.length && "a photo"].filter(Boolean) as string[],
      };
    })
    .sort((a, b) => b.created.localeCompare(a.created));
}

export async function setBuildSubmission(id: string, change: { state?: ReviewState; ambassador?: boolean }): Promise<void> {
  if (!isAirtableConfigured(BUILDS_BASE)) throw new Error("Build Submissions base is not configured.");
  const fields: Record<string, boolean> = {};
  if (change.state) {
    fields.Approved = change.state === "approved";
    fields.Declined = change.state === "declined";
  }
  if (change.ambassador !== undefined) fields.Ambassador = change.ambassador;
  await updateRecord(BUILDS_TABLE, id, fields, { baseId: BUILDS_BASE });
  refresh(["/builds", "/builds/all", "/"]);
}

// ---------------------------------------------------------------------------
// Reviews (Testimonials) and tagged posts (Social Proof)
// ---------------------------------------------------------------------------

export interface ReviewItem {
  id: string;
  created: string;
  state: ReviewState;
  homepage: boolean;
  name: string;
  email: string;
  role: string;
  rating: number;
  quote: string;
  photos: { thumb: string; full: string }[];
}

export async function listReviews(): Promise<ReviewItem[]> {
  if (!isAirtableConfigured(REVIEWS_BASE)) return [];
  const records = await listRecords(REVIEWS_TABLE, undefined, { baseId: REVIEWS_BASE });
  return records
    .map((r) => ({
      id: r.id,
      created: (r.createdTime || "").slice(0, 10),
      state: stateOf(r.fields),
      homepage: r.fields.Homepage === true,
      name: str(r.fields.Name) || "Anonymous",
      email: str(r.fields.Email),
      role: str(r.fields.Role),
      rating: Number(r.fields.Rating) || 0,
      quote: str(r.fields.Quote),
      photos: attachments(r.fields.Photo),
    }))
    .sort((a, b) => b.created.localeCompare(a.created));
}

export async function setReview(id: string, change: { state?: ReviewState; homepage?: boolean }): Promise<void> {
  if (!isAirtableConfigured(REVIEWS_BASE)) throw new Error("Testimonials base is not configured.");
  const fields: Record<string, boolean> = {};
  if (change.state) {
    fields.Approved = change.state === "approved";
    fields.Declined = change.state === "declined";
    if (change.state !== "approved") fields.Homepage = false;
  }
  if (change.homepage !== undefined) fields.Homepage = change.homepage;
  await updateRecord(REVIEWS_TABLE, id, fields, { baseId: REVIEWS_BASE });
  refresh(["/", "/merch", "/community", "/reviews"]);
}

export interface TaggedPost {
  id: string;
  posterName: string;
  platform: string;
  postUrl: string;
  approved: boolean;
  order: number | null;
}

export async function listTaggedPosts(): Promise<TaggedPost[]> {
  if (!isAirtableConfigured(REVIEWS_BASE)) return [];
  const records = await listRecords(SOCIAL_TABLE, undefined, { baseId: REVIEWS_BASE });
  return records
    .map((r) => ({
      id: r.id,
      posterName: str(r.fields["Poster Name"]),
      platform: str(r.fields.Platform),
      postUrl: str(r.fields["Post URL"]),
      approved: r.fields.Approved === true,
      order: typeof r.fields["Display Order"] === "number" ? (r.fields["Display Order"] as number) : null,
    }))
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

export async function setTaggedPost(id: string, approved: boolean): Promise<void> {
  if (!isAirtableConfigured(REVIEWS_BASE)) throw new Error("Testimonials base is not configured.");
  await updateRecord(SOCIAL_TABLE, id, { Approved: approved }, { baseId: REVIEWS_BASE });
  refresh(["/community"]);
}

export async function addTaggedPost(post: { posterName: string; platform: string; postUrl: string }): Promise<void> {
  if (!isAirtableConfigured(REVIEWS_BASE)) throw new Error("Testimonials base is not configured.");
  await createRecord(
    SOCIAL_TABLE,
    { "Poster Name": post.posterName, Platform: post.platform, "Post URL": post.postUrl, Approved: true },
    { baseId: REVIEWS_BASE },
  );
  refresh(["/community"]);
}

// ---------------------------------------------------------------------------
// Featured builds (the Featured Rigs grid on /builds) and featured products
// ---------------------------------------------------------------------------

export const FEATURED_RIGS_MAX = 4;

export interface FeaturableBuild {
  slug: string;
  name: string;
  kicker: string;
  image: string;
}

/** Team builds plus approved community builds, with the slugs the site uses. */
export async function listFeaturableBuilds(): Promise<FeaturableBuild[]> {
  const community = await getApprovedCommunityBuilds({ fresh: true });
  return [...teamBuilds, ...community].map((b) => ({
    slug: b.slug,
    name: b.nameLines.join(" "),
    kicker: b.kicker,
    image: b.listingImage.src,
  }));
}

/** Slugs currently in the Featured Rigs grid, in order. */
export async function getFeaturedBuildSlugs(): Promise<string[]> {
  if (!isAirtableConfigured(FEATURED_BUILDS_BASE)) return [];
  const records = await listRecords(FEATURED_BUILDS_TABLE, "{Featured}=1", { baseId: FEATURED_BUILDS_BASE });
  return records
    .map((r) => ({ slug: str(r.fields["Build Slug"]), order: Number(r.fields["Display Order"]) || 0 }))
    .filter((r) => r.slug)
    .sort((a, b) => a.order - b.order)
    .map((r) => r.slug);
}

/** Makes the Featured rows match `slugs` (in order): reuses a row per slug,
 *  creates missing ones, unfeatures the rest. Nothing is deleted. */
async function syncFeaturedRows(opts: {
  base: string | undefined;
  table: string;
  slugField: string;
  onField: string;
  slugs: string[];
  scope?: { field: string; value: string };
}): Promise<void> {
  if (!isAirtableConfigured(opts.base)) throw new Error("Website APIs base is not configured.");
  const all = await listRecords(opts.table, undefined, { baseId: opts.base });
  const rows = opts.scope ? all.filter((r) => r.fields[opts.scope!.field] === opts.scope!.value) : all;
  const used = new Set<string>();
  for (const [i, slug] of opts.slugs.entries()) {
    const row = rows.find((r) => str(r.fields[opts.slugField]) === slug && !used.has(r.id));
    if (row) {
      used.add(row.id);
      if (row.fields[opts.onField] !== true || Number(row.fields["Display Order"]) !== i + 1) {
        await updateRecord(opts.table, row.id, { [opts.onField]: true, "Display Order": i + 1 }, { baseId: opts.base });
      }
    } else {
      await createRecord(
        opts.table,
        { [opts.slugField]: slug, [opts.onField]: true, "Display Order": i + 1, ...(opts.scope ? { [opts.scope.field]: opts.scope.value } : {}) },
        { baseId: opts.base },
      );
    }
  }
  for (const row of rows) {
    if (!used.has(row.id) && row.fields[opts.onField] === true) {
      await updateRecord(opts.table, row.id, { [opts.onField]: false }, { baseId: opts.base });
    }
  }
}

export async function setFeaturedBuilds(slugs: string[]): Promise<void> {
  await syncFeaturedRows({
    base: FEATURED_BUILDS_BASE,
    table: FEATURED_BUILDS_TABLE,
    slugField: "Build Slug",
    onField: "Featured",
    slugs: slugs.slice(0, FEATURED_RIGS_MAX),
  });
  refresh(["/builds"]);
}

export const PRODUCT_SECTIONS = [
  { value: "Home", label: "Home page", help: "The Rep The Culture grid on the home page." },
  { value: "Merch Featured", label: "Merch: featured", help: "The Featured row on /merch." },
  { value: "Merch New Release", label: "Merch: new releases", help: "The New Releases row on /merch." },
] as const;
export type ProductSectionValue = (typeof PRODUCT_SECTIONS)[number]["value"];

export function productCatalog(): { slug: string; collection: string }[] {
  return MERCH_COLLECTIONS.flatMap((c) => c.productSlugs.map((slug) => ({ slug, collection: c.name })));
}

export async function getFeaturedProductSlugs(): Promise<Record<ProductSectionValue, string[]>> {
  const out = { Home: [], "Merch Featured": [], "Merch New Release": [] } as Record<ProductSectionValue, string[]>;
  if (!isAirtableConfigured(FEATURED_PRODUCTS_BASE)) return out;
  const records = await listRecords(FEATURED_PRODUCTS_TABLE, "{Active}=1", { baseId: FEATURED_PRODUCTS_BASE });
  for (const section of PRODUCT_SECTIONS) {
    out[section.value] = records
      .filter((r) => r.fields.Section === section.value)
      .map((r) => ({ slug: str(r.fields["Product Slug"]), order: Number(r.fields["Display Order"]) || 0 }))
      .filter((r) => r.slug)
      .sort((a, b) => a.order - b.order)
      .map((r) => r.slug);
  }
  return out;
}

export async function setFeaturedProducts(section: ProductSectionValue, slugs: string[]): Promise<void> {
  await syncFeaturedRows({
    base: FEATURED_PRODUCTS_BASE,
    table: FEATURED_PRODUCTS_TABLE,
    slugField: "Product Slug",
    onField: "Active",
    slugs,
    scope: { field: "Section", value: section },
  });
  refresh(["/", "/merch"]);
}

/** Queue counts for Team, Control Room and the review hub. */
export async function reviewCounts(): Promise<{ builds: number | null; reviews: number | null }> {
  const count = async (base: string | undefined, table: string) => {
    if (!isAirtableConfigured(base)) return null;
    try {
      return (await listRecords(table, "AND(NOT({Approved}), NOT({Declined}))", { baseId: base })).length;
    } catch {
      return null;
    }
  };
  const [builds, reviews] = await Promise.all([count(BUILDS_BASE, BUILDS_TABLE), count(REVIEWS_BASE, REVIEWS_TABLE)]);
  return { builds, reviews };
}
