/**
 * Fourthwall Platform (Open API) client — Basic Auth, shop-level API key.
 * Distinct from lib/fourthwall.ts, which wraps the public Storefront API
 * (storefront-api.fourthwall.com, public token) used for product/cart pages.
 * This one talks to api.fourthwall.com/open-api/v1.0 and is only used
 * server-side for ambassador commission reporting — never expose these
 * credentials to the browser.
 */

const API_URL = "https://api.fourthwall.com/open-api/v1.0";

export interface FourthwallOrder {
  id: string;
  friendlyId: string;
  status: string;
  email: string;
  /** Whether the customer ticked the marketing-email box at checkout. Only
   *  opt-in orders are eligible for the post-purchase follow-up sequence. */
  emailMarketingOptIn?: boolean;
  promotionId?: string;
  amounts: {
    subtotal: { value: number; currency: string };
    discount?: { value: number; currency: string };
    total: { value: number; currency: string };
  };
  billing?: { address?: { name?: string } };
  offers?: { name?: string }[];
  /** `ORDER` for a real customer order; `SAMPLES_ORDER`, `GIFT`, etc. for
   *  the rest. Only `ORDER` is eligible for the follow-up sequence. */
  source?: { type?: string };
  createdAt: string;
  updatedAt?: string;
}

function authHeader() {
  const username = process.env.FOURTHWALL_API_USERNAME;
  const password = process.env.FOURTHWALL_API_PASSWORD;
  if (!username || !password) {
    throw new Error("Fourthwall Platform API credentials are not configured.");
  }
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

/** Fetches every order created within [createdAfter, createdBefore), across all pages. */
export async function getOrdersInRange(createdAfter: Date, createdBefore: Date): Promise<FourthwallOrder[]> {
  const orders: FourthwallOrder[] = [];
  let page = 0;
  const size = 100;

  while (true) {
    const url = new URL(`${API_URL}/order`);
    url.searchParams.set("createdAt[gt]", createdAfter.toISOString());
    url.searchParams.set("createdAt[lt]", createdBefore.toISOString());
    url.searchParams.set("page", String(page));
    url.searchParams.set("size", String(size));

    const res = await fetch(url.toString(), {
      headers: { Authorization: authHeader() },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Fourthwall orders request failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { results: FourthwallOrder[]; totalPages: number };
    orders.push(...data.results);

    page += 1;
    if (page >= data.totalPages) break;
  }

  return orders;
}

/** Orders created in the last `days` days — the window the follow-up sync
 *  walks (order placed -> POD -> transit -> delivered -> +12-day email is
 *  ~35 days worst case; 45 gives margin). */
export async function getRecentOrders(days = 45): Promise<FourthwallOrder[]> {
  const now = new Date();
  const after = new Date(now.getTime() - days * 86_400_000);
  return getOrdersInRange(after, now);
}

/** The Fourthwall promotion for a discount code (case-insensitive), or null if
 *  no such code exists. Used to fill an ambassador's Fourthwall Promotion ID,
 *  which is what commission reports match orders on. */
export async function findPromotionByCode(
  code: string,
): Promise<{ id: string; code: string; status: string; percentage: number | null } | null> {
  const want = code.trim().toUpperCase();
  if (!want) return null;
  for (let page = 0; page < 20; page++) {
    const url = new URL(`${API_URL}/promotions`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("size", "100");
    const res = await fetch(url.toString(), { headers: { Authorization: authHeader() }, cache: "no-store" });
    if (!res.ok) throw new Error(`Fourthwall promotions request failed: ${res.status}`);
    const data = (await res.json()) as {
      results?: { id: string; code?: string; status?: string; discount?: { type?: string; percentage?: number } }[];
      totalPages?: number;
    };
    const match = (data.results || []).find((p) => (p.code || "").trim().toUpperCase() === want);
    if (match) {
      return {
        id: match.id,
        code: match.code || code,
        status: match.status || "",
        percentage: typeof match.discount?.percentage === "number" ? match.discount.percentage : null,
      };
    }
    if (!data.totalPages || page + 1 >= data.totalPages) break;
  }
  return null;
}

export class PromotionCodeTakenError extends Error {
  constructor(code: string) {
    super(`Promo code ${code} already exists in Fourthwall.`);
    this.name = "PromotionCodeTakenError";
  }
}

/** Creates a single-code percentage discount on the whole order, shipping not
 *  discounted, unlimited uses: the same settings as the ambassador codes made
 *  by hand in Fourthwall. Throws PromotionCodeTakenError if the code exists. */
export async function createPercentPromotion(code: string, percentage: number): Promise<{ id: string; code: string }> {
  const res = await fetch(`${API_URL}/promotions`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "SHOP_SINGLE",
      code,
      discount: { type: "PERCENTAGE", percentage, shipping: "Excluded" },
      limits: { oneUsePerCustomer: false },
    }),
    cache: "no-store",
  });
  if (res.status === 409) throw new PromotionCodeTakenError(code);
  if (!res.ok) throw new Error(`Fourthwall create promotion failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { id: string; code?: string };
  return { id: data.id, code: data.code || code };
}
