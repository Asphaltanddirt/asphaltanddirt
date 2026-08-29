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
  /** Direct checkout link for this product's default variant — kept as a
   *  fallback/reference, but the site now uses the cart flow (see Cart
   *  types below) instead of linking straight to checkout on click. */
  checkoutUrl: string;
  /** The default (first) variant — used by the Add to Cart button. Products
   *  with multiple sizes/colors don't have a variant picker yet; this always
   *  adds the first listed variant, same scope as the old direct-checkout
   *  link this replaced. */
  variantId: string;
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
    variantId: firstVariant.id,
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

// ---------------------------------------------------------------------
// Cart — real Fourthwall cart sessions, so shoppers can add multiple items
// and review before checkout instead of a single click jumping straight to
// Fourthwall's hosted checkout for one variant. These functions are
// server-only (they use the storefront token directly) and are called from
// the app/api/cart/* route handlers — the browser never sees the token,
// it only talks to our own /api/cart endpoints.
// ---------------------------------------------------------------------

export type CartItem = {
  variantId: string;
  productName: string;
  productSlug: string;
  variantName: string;
  image: { url: string; alt: string };
  unitPrice: string;
  currency: string;
  quantity: number;
};

export type Cart = {
  id: string;
  items: CartItem[];
  itemCount: number;
  subtotal: string;
  currency: string;
};

type FourthwallCartItem = {
  variant: {
    id: string;
    name: string;
    unitPrice: FourthwallMoney;
    images: FourthwallProductImage[];
    product?: { name: string; slug: string };
  };
  quantity: number;
};

type FourthwallCart = { id: string; items: FourthwallCartItem[] };

function reshapeCart(cart: FourthwallCart): Cart {
  const items: CartItem[] = cart.items.map((item) => ({
    variantId: item.variant.id,
    productName: item.variant.product?.name ?? item.variant.name,
    productSlug: item.variant.product?.slug ?? "",
    variantName: item.variant.name,
    image: {
      url: item.variant.images[0]?.url ?? "",
      alt: item.variant.product?.name ?? item.variant.name,
    },
    unitPrice: item.variant.unitPrice.value.toFixed(2),
    currency: item.variant.unitPrice.currency,
    quantity: item.quantity,
  }));

  const subtotal = items.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return {
    id: cart.id,
    items,
    itemCount,
    subtotal: subtotal.toFixed(2),
    currency: items[0]?.currency ?? "USD",
  };
}

async function cartRequest(
  path: string,
  method: "GET" | "POST",
  body?: unknown
): Promise<FourthwallCart> {
  const token = process.env.FOURTHWALL_STOREFRONT_TOKEN;
  if (!token) throw new Error("Missing FOURTHWALL_STOREFRONT_TOKEN");

  const url = new URL(`${API_URL}${path}`);
  url.searchParams.set("storefront_token", token);
  url.searchParams.set("currency", "USD");

  const res = await fetch(url.toString(), {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Fourthwall cart request failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function createCart(variantId: string, quantity = 1): Promise<Cart> {
  const data = await cartRequest("/carts", "POST", { items: [{ variantId, quantity }] });
  return reshapeCart(data);
}

export async function addToCart(cartId: string, variantId: string, quantity = 1): Promise<Cart> {
  const data = await cartRequest(`/carts/${cartId}/add`, "POST", {
    items: [{ variantId, quantity }],
  });
  return reshapeCart(data);
}

/** Sets a variant's quantity to an absolute value; 0 removes it. */
export async function changeCartQuantity(
  cartId: string,
  variantId: string,
  quantity: number
): Promise<Cart> {
  const data = await cartRequest(`/carts/${cartId}/change`, "POST", {
    items: [{ variantId, quantity }],
  });
  return reshapeCart(data);
}

/** Returns null if the cart doesn't exist (e.g. expired) rather than throwing
 *  — callers should treat that as "start a new cart", not a fatal error. */
export async function getCart(cartId: string): Promise<Cart | null> {
  try {
    const data = await cartRequest(`/carts/${cartId}`, "GET");
    return reshapeCart(data);
  } catch {
    return null;
  }
}

export function checkoutUrlForCart(cartId: string) {
  return `https://${SHOP_DOMAIN}/cart/checkout?cartId=${cartId}&currency=USD`;
}

// ---------------------------------------------------------------------
// Product detail — full per-product data for the PDP (app/merch/[slug]),
// including color/size variant selection. Fetched from the single-product
// Storefront endpoint (not the collection listing, which only returns the
// first variant per product).
// ---------------------------------------------------------------------

export type ProductSize = {
  variantId: string;
  name: string;
  price: string;
  inStock: boolean;
};

export type ProductColorVariant = {
  colorName: string;
  swatch: string;
  images: { url: string; alt: string }[];
  sizes: ProductSize[];
};

export type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  description: string;
  colors: ProductColorVariant[];
};

type FourthwallVariantDetail = {
  id: string;
  name: string;
  unitPrice: FourthwallMoney;
  attributes: {
    color?: { name: string; swatch: string };
    size?: { name: string };
  };
  stock: { type: "UNLIMITED" | "LIMITED"; inStock?: number };
  images: FourthwallProductImage[];
};

type FourthwallProductDetail = {
  id: string;
  name: string;
  slug: string;
  description: string;
  variants: FourthwallVariantDetail[];
};

function reshapeProductDetail(product: FourthwallProductDetail): ProductDetail {
  const colorOrder: string[] = [];
  const colorMap = new Map<string, ProductColorVariant>();

  for (const v of product.variants) {
    const colorName = v.attributes.color?.name ?? "Default";
    if (!colorMap.has(colorName)) {
      colorOrder.push(colorName);
      colorMap.set(colorName, {
        colorName,
        swatch: v.attributes.color?.swatch ?? "#333333",
        images: v.images.map((img) => ({ url: img.url, alt: `${product.name} — ${colorName}` })),
        sizes: [],
      });
    }
    const inStock = v.stock.type === "UNLIMITED" || (v.stock.inStock ?? 0) > 0;
    colorMap.get(colorName)!.sizes.push({
      variantId: v.id,
      name: v.attributes.size?.name ?? "One Size",
      price: v.unitPrice.value.toFixed(2),
      inStock,
    });
  }

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    colors: colorOrder.map((name) => colorMap.get(name)!),
  };
}

/** Returns null if the product doesn't exist or isn't published. */
export async function getProductDetail(slug: string): Promise<ProductDetail | null> {
  const token = process.env.FOURTHWALL_STOREFRONT_TOKEN;
  if (!token) {
    console.error("Missing FOURTHWALL_STOREFRONT_TOKEN");
    return null;
  }

  try {
    const url = new URL(`${API_URL}/products/${slug}`);
    url.searchParams.set("storefront_token", token);
    url.searchParams.set("currency", "USD");

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) {
      if (res.status !== 404) {
        console.error("Fourthwall product detail fetch failed", res.status, await res.text());
      }
      return null;
    }

    const data: FourthwallProductDetail = await res.json();
    return reshapeProductDetail(data);
  } catch (err) {
    console.error("Fourthwall product detail fetch error", err);
    return null;
  }
}
