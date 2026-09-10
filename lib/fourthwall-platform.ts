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
