// Storefront API client. Field shapes confirmed against Fourthwall's own
// reference implementation (github.com/FourthwallHQ/vercel-commerce) and a
// live request to our shop's API.

const API_URL = "https://storefront-api.fourthwall.com/v1";

// Not secret — this is the public domain shoppers land on for checkout, safe
// to reference in code. Confirmed via GET /v1/shop and the Fourthwall dashboard.
const SHOP_DOMAIN = "asphalt-and-dirt-shop.fourthwall.com";

type FourthwallMoney = { value: number; currency: string };

type FourthwallProductImage = {
  id: string;
  url: string;
  transformedUrl: string;
  width: number;
  height: number;
};

type FourthwallProductVariant = {
  id: string;
  name: string;
  unitPrice: FourthwallMoney;
  stock: { type: "UNLIMITED" | "LIMITED"; inStock?: number };
};

type FourthwallProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  images: FourthwallProductImage[];
  variants: FourthwallProductVariant[];
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  price: string;
  currency: string;
  image: { url: string; alt: string };
  /** Direct checkout link for this product's default variant — no cart API needed. */
  checkoutUrl: string;
  inStock: boolean;
};

function checkoutUrlFor(variantId: string, quantity = 1) {
  return `https://${SHOP_DOMAIN}/cart/checkout?products=${variantId}:${quantity}`;
}

function reshapeProduct(product: FourthwallProduct): Product | undefined {
  const firstVariant = product.variants[0];
  if (!firstVariant) return undefined;

  const image = product.images[0];
  const inStock =
    firstVariant.stock.type === "UNLIMITED" || (firstVariant.stock.inStock ?? 0) > 0;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: firstVariant.unitPrice.value.toFixed(2),
    currency: firstVariant.unitPrice.currency,
    image: { url: image?.url ?? "", alt: product.name },
    checkoutUrl: checkoutUrlFor(firstVariant.id),
    inStock,
  };
}

/** Fetches products from a collection (default "all"). Returns [] on any error
 *  or if the collection has no published products — callers should render an
 *  empty state, not treat this as fatal.
 *
 *  Note: the Storefront API ignores a larger `limit` and always pages at 10
 *  per request, so this walks pages until it has enough or runs out. */
export async function getFeaturedProducts(
  collectionSlug = "all",
  limit = 5
): Promise<Product[]> {
  const token = process.env.FOURTHWALL_STOREFRONT_TOKEN;
  if (!token) {
    console.error("Missing FOURTHWALL_STOREFRONT_TOKEN");
    return [];
  }

  const products: Product[] = [];

  try {
    for (let page = 0; products.length < limit; page++) {
      const url = new URL(`${API_URL}/collections/${collectionSlug}/products`);
      url.searchParams.set("storefront_token", token);
      url.searchParams.set("currency", "USD");
      url.searchParams.set("page", String(page));

      const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
      if (!res.ok) {
        console.error("Fourthwall products fetch failed", res.status, await res.text());
        break;
      }

      const data: { results: FourthwallProduct[]; paging: { hasNextPage: boolean } } =
        await res.json();
      products.push(
        ...data.results.map(reshapeProduct).filter((p): p is Product => Boolean(p))
      );

      if (!data.paging?.hasNextPage) break;
    }
  } catch (err) {
    console.error("Fourthwall products fetch error", err);
  }

  return products.slice(0, limit);
}

// Fourthwall itself only has one real collection ("All Products") for this
// shop — there's no server-side grouping by product line. These mappings are
// maintained by hand here (same pattern as lib/builds.tsx / lib/blog.tsx)
// purely so the merch page can group live products into the brand's actual
// collections. Keyed by Storefront slug.
export const MERCH_COLLECTIONS = [
  {
    slug: "core",
    name: "Core",
    tagline: "The original wordmark. Every ride, every road.",
    productSlugs: [
      "split-terrain-heavyweight-tee",
      "road-trail-heavyweight-tee",
      "after-hours-hoodie",
      "trailhead-hoodie",
      "trailhead-trucker",
      "cold-start-beanie",
    ],
  },
  {
    slug: "podcast",
    name: "Podcast",
    tagline: "For the people who listen because they live it.",
    productSlugs: [
      "open-road-podcast-tee",
      "behind-the-mic-heavyweight-tee",
      "roadside-stories-heavyweight-tee",
      "open-road-podcast-hoodie",
      "behind-the-mic-hoodie",
      "roadside-stories-hoodie",
    ],
  },
  {
    slug: "youth",
    name: "Youth",
    tagline: "The next generation doesn't need watered-down gear.",
    productSlugs: ["next-generation-heavyweight-tee", "next-generation-hoodie"],
  },
  {
    slug: "little-crawlers",
    name: "Little Crawlers",
    tagline: "Because you're never too little for your first adventure.",
    productSlugs: ["little-crawlers-trail-tee", "first-crawl-bodysuit"],
  },
  {
    slug: "show-culture",
    name: "Show Culture",
    tagline: "Real builds. Real people. Real car culture.",
    productSlugs: [
      "earn-it-heavyweight-tee",
      "earn-it-hoodie",
      "protect-the-culture-heavyweight-tee",
      "protect-the-culture-hoodie",
    ],
  },
  {
    slug: "accessories",
    name: "Accessories",
    tagline: "Bring the garage to the desk.",
    productSlugs: ["garage-desk-mat", "pit-lane-mouse-pad"],
  },
] as const;

export type MerchCollection = {
  slug: string;
  name: string;
  tagline: string;
  products: Product[];
};

/** Fetches every published product once, then groups them into the brand's
 *  named collections per MERCH_COLLECTIONS. Products not listed in any
 *  collection's productSlugs are dropped silently (e.g. personal-use items
 *  that are intentionally never published). */
export async function getMerchCollections(): Promise<MerchCollection[]> {
  const allProducts = await getFeaturedProducts("all", 100);
  const bySlug = new Map(allProducts.map((p) => [p.slug, p]));

  return MERCH_COLLECTIONS.map((c) => ({
    slug: c.slug,
    name: c.name,
    tagline: c.tagline,
    products: c.productSlugs
      .map((slug) => bySlug.get(slug))
      .filter((p): p is Product => Boolean(p)),
  })).filter((c) => c.products.length > 0);
}
