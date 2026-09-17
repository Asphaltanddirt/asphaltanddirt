/**
 * Meta (Instagram + Facebook Page) insights — the first-party numbers for the
 * two platforms the weekly analytics snapshot couldn't reach.
 *
 * What it needs (all dormant until they're set; nothing here runs without them):
 *   META_GRAPH_TOKEN   a System User token from our Business portfolio, with
 *                      instagram_basic, instagram_manage_insights,
 *                      pages_read_engagement and read_insights. A system user
 *                      token doesn't do the 60-day refresh dance a personal
 *                      token does. App Review isn't needed: these are our own
 *                      Page and our own IG account.
 *   META_IG_USER_ID    the Instagram professional account's id
 *   META_PAGE_ID       the Facebook Page's id
 *   META_GRAPH_VERSION optional, defaults to the version below
 *
 * Two facts that shape everything here:
 *   - Instagram keeps insights for ~90 days. Our Airtable archive is the long
 *     memory, so the weekly write matters more than the live read.
 *   - Meta renames metrics between Graph versions (impressions -> views, and
 *     several account metrics now need metric_type=total_value). Rather than
 *     pin to names that rot, every insights call asks for a wish list and
 *     drops whatever that version rejects — a renamed metric costs us one
 *     field, not the whole pull.
 */

const VERSION = process.env.META_GRAPH_VERSION || "v26.0";
const GRAPH = `https://graph.facebook.com/${VERSION}`;

const TOKEN = () => process.env.META_GRAPH_TOKEN || "";
const IG_USER_ID = () => process.env.META_IG_USER_ID || "";
const PAGE_ID = () => process.env.META_PAGE_ID || "";

export function isMetaConfigured() {
  return Boolean(TOKEN() && (IG_USER_ID() || PAGE_ID()));
}

interface GraphError {
  message?: string;
  code?: number;
  error_subcode?: number;
}

class GraphCallError extends Error {
  constructor(
    message: string,
    readonly detail: GraphError,
  ) {
    super(message);
  }
}

async function graph<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams({ ...params, access_token: TOKEN() });
  const res = await fetch(`${GRAPH}/${path}?${qs}`, { cache: "no-store" });
  const data = (await res.json()) as T & { error?: GraphError };
  if (!res.ok || data?.error) {
    const err = data?.error || { message: `HTTP ${res.status}` };
    throw new GraphCallError(err.message || "Graph API call failed", err);
  }
  return data;
}

/** The metric names a version rejects come back inside the error message, so
 *  pull them out and retry without them rather than losing the whole call. */
function unsupportedMetrics(message: string, asked: string[]): string[] {
  const lower = message.toLowerCase();
  return asked.filter((m) => lower.includes(m.toLowerCase()));
}

export interface InsightValue {
  metric: string;
  value: number;
}

/**
 * One insights call, retried without whatever this Graph version rejects.
 * `variants` are extra param sets to try in order — Meta moved several account
 * metrics behind metric_type=total_value, so we try plain first, then that.
 */
async function insights(
  path: string,
  wishList: string[],
  params: Record<string, string> = {},
  variants: Record<string, string>[] = [{}, { metric_type: "total_value" }],
): Promise<InsightValue[]> {
  for (const variant of variants) {
    let metrics = [...wishList];
    for (let attempt = 0; attempt < 3 && metrics.length; attempt++) {
      try {
        const data = await graph<{
          data?: { name?: string; values?: { value?: unknown }[]; total_value?: { value?: unknown } }[];
        }>(path, { ...params, ...variant, metric: metrics.join(",") });
        const out: InsightValue[] = [];
        for (const row of data.data ?? []) {
          if (!row.name) continue;
          // A day-period metric returns one value per day; sum the window.
          // total_value returns a single number for the whole window.
          const total =
            typeof row.total_value?.value === "number"
              ? row.total_value.value
              : (row.values ?? []).reduce((sum, v) => sum + (typeof v.value === "number" ? v.value : 0), 0);
          if (Number.isFinite(total)) out.push({ metric: row.name, value: total });
        }
        if (out.length) return out;
        break; // Call worked but said nothing — try the next variant.
      } catch (err) {
        if (!(err instanceof GraphCallError)) throw err;
        const drop = unsupportedMetrics(err.detail.message || "", metrics);
        if (!drop.length) break; // Not a metric-name problem; try the next variant.
        metrics = metrics.filter((m) => !drop.includes(m));
      }
    }
  }
  return [];
}

const byMetric = (rows: InsightValue[]) =>
  Object.fromEntries(rows.map((r) => [r.metric, r.value])) as Record<string, number>;

export interface MetaAccountSummary {
  followers?: number;
  mediaCount?: number;
  /** Rolling-window totals, keyed by whatever metric names survived. */
  window: Record<string, number>;
}

/** Instagram: follower count plus a rolling window of account-level insights. */
export async function instagramAccount(since: Date, until: Date): Promise<MetaAccountSummary> {
  const id = IG_USER_ID();
  const profile = await graph<{ followers_count?: number; media_count?: number }>(id, {
    fields: "followers_count,media_count",
  });
  const rows = await insights(
    `${id}/insights`,
    ["reach", "views", "profile_views", "accounts_engaged", "total_interactions", "website_clicks"],
    { period: "day", since: unix(since), until: unix(until) },
  );
  return { followers: profile.followers_count, mediaCount: profile.media_count, window: byMetric(rows) };
}

export interface MetaPost {
  id: string;
  permalink: string;
  caption: string;
  timestamp: string;
  mediaType?: string;
  stats: Record<string, number>;
}

/** Instagram posts since `since`, each with whatever per-media insights exist. */
export async function instagramPosts(since: Date, limit = 50): Promise<MetaPost[]> {
  const id = IG_USER_ID();
  const data = await graph<{
    data?: { id: string; permalink?: string; caption?: string; timestamp?: string; media_type?: string }[];
  }>(`${id}/media`, {
    fields: "id,permalink,caption,timestamp,media_type",
    limit: String(limit),
    since: unix(since),
  });

  const posts: MetaPost[] = [];
  for (const m of data.data ?? []) {
    const rows = await insights(
      `${m.id}/insights`,
      ["views", "reach", "likes", "comments", "saved", "shares", "total_interactions", "follows"],
      {},
      [{}], // Per-media insights don't take metric_type.
    );
    posts.push({
      id: m.id,
      permalink: m.permalink || "",
      caption: m.caption || "",
      timestamp: m.timestamp || "",
      mediaType: m.media_type,
      stats: byMetric(rows),
    });
  }
  return posts;
}

/** Facebook Page: follower count plus a rolling window of Page insights. */
export async function facebookPage(since: Date, until: Date): Promise<MetaAccountSummary> {
  const id = PAGE_ID();
  const profile = await graph<{ followers_count?: number; fan_count?: number }>(id, {
    fields: "followers_count,fan_count",
  });
  const rows = await insights(
    `${id}/insights`,
    ["page_impressions_unique", "page_impressions", "page_post_engagements", "page_views_total"],
    { period: "day", since: unix(since), until: unix(until) },
    [{}],
  );
  return { followers: profile.followers_count ?? profile.fan_count, window: byMetric(rows) };
}

/** Facebook Page posts since `since`, each with whatever per-post insights exist. */
export async function facebookPosts(since: Date, limit = 50): Promise<MetaPost[]> {
  const id = PAGE_ID();
  const data = await graph<{
    data?: { id: string; message?: string; created_time?: string; permalink_url?: string }[];
  }>(`${id}/posts`, {
    fields: "id,message,created_time,permalink_url",
    limit: String(limit),
    since: unix(since),
  });

  const posts: MetaPost[] = [];
  for (const p of data.data ?? []) {
    const rows = await insights(
      `${p.id}/insights`,
      ["post_impressions_unique", "post_impressions", "post_engaged_users", "post_clicks"],
      {},
      [{}],
    );
    posts.push({
      id: p.id,
      permalink: p.permalink_url || "",
      caption: p.message || "",
      timestamp: p.created_time || "",
      stats: byMetric(rows),
    });
  }
  return posts;
}

function unix(d: Date) {
  return String(Math.floor(d.getTime() / 1000));
}
