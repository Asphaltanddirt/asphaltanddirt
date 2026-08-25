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
 *  empty state, not treat this as fatal. */
export async function getFeaturedProducts(
  collectionSlug = "all",
  limit = 5
): Promise<Product[]> {
  const token = process.env.FOURTHWALL_STOREFRONT_TOKEN;
  if (!token) {
    console.error("Missing FOURTHWALL_STOREFRONT_TOKEN");
    return [];
  }

  try {
    const url = new URL(`${API_URL}/collections/${collectionSlug}/products`);
    url.searchParams.set("storefront_token", token);
    url.searchParams.set("currency", "USD");
    url.searchParams.set("limit", String(limit));

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) {
      console.error("Fourthwall products fetch failed", res.status, await res.text());
      return [];
    }

    const data: { results: FourthwallProduct[] } = await res.json();
    return data.results
      .map(reshapeProduct)
      .filter((p): p is Product => Boolean(p));
  } catch (err) {
    console.error("Fourthwall products fetch error", err);
    return [];
  }
}
