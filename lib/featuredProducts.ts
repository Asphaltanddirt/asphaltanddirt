import { listRecords, isAirtableConfigured } from "@/lib/airtable";

// Same "Website APIs" base as Featured Builds / Quick Links. Set
// AIRTABLE_FEATURED_PRODUCTS_BASE_ID to that base's id in the environment;
// if it's unset the callers fall back to their built-in slug lists.
const BASE_ID = process.env.AIRTABLE_FEATURED_PRODUCTS_BASE_ID;
const TABLE = process.env.AIRTABLE_FEATURED_PRODUCTS_TABLE || "Featured Products";

export type ProductSection = "Home" | "Merch Featured" | "Merch New Release";

/** Ordered product slugs for one section of the site, from the Featured
 *  Products table (Active rows, sorted by Display Order). Returns [] if
 *  Airtable isn't configured, the section is empty, or the fetch fails —
 *  callers treat [] as "use the built-in default list". Cached 15 min since
 *  this runs on the public Home and Merch pages. */
export async function getProductSlugsFor(section: ProductSection): Promise<string[]> {
  if (!isAirtableConfigured(BASE_ID)) return [];

  try {
    const records = await listRecords(
      TABLE,
      `AND({Active}=1, {Section}='${section}')`,
      { revalidate: 900, baseId: BASE_ID },
    );

    return records
      .map((r) => ({
        slug: ((r.fields["Product Slug"] as string) || "").trim(),
        order: Number(r.fields["Display Order"]) || 0,
      }))
      .filter((r) => r.slug)
      .sort((a, b) => a.order - b.order)
      .map((r) => r.slug);
  } catch (err) {
    console.error("Featured products fetch error", err);
    return [];
  }
}
