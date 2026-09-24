import { createRecord, listRecords, updateRecord, isAirtableConfigured } from "@/lib/airtable";
import { isXConfigured, xFetch } from "@/lib/xPost";

/**
 * The X reply queue (approved by Jose 2026-09-22, a test until the podcast
 * launches). Twice a day a paid X search finds posts worth replying to and
 * files them in Garage → Replies. The replies themselves are written BY HAND
 * in the X app: X's automation rules forbid automated replies, and its reply
 * ranking logs pasted text.
 *
 *  - Morning: newest original posts from our Reply Targets (big and mid-size
 *    car/off-road accounts), so we can reply early in big threads.
 *  - Evening: the most relevant recent posts on our topics, alternating dirt
 *    and asphalt by day.
 *
 * Cost (docs.x.com pricing, 2026-09-22): $0.005 per post returned, 10 per run
 * → about $3/month. No author lookups on the evening run ($0.010 each would
 * double it). Off switch: Garage Settings → "Reply search".
 */

const BASE_ID = process.env.AIRTABLE_ANALYTICS_BASE_ID || "appzbX0Mz3rXtc1GN";
const TARGETS = "Reply Targets";
const QUEUE = "Reply Queue";
const SETTINGS = "Garage Settings";
/** How many already-handled replies stay on screen as context. */
const HANDLED_SHOWN = 4;

const DIRT = `(jeep OR wrangler OR bronco OR rubicon OR overland OR overlanding OR "off road" OR offroad OR 4x4 OR "trail ride") -is:retweet -is:reply lang:en`;
const ASPHALT = `(corvette OR "LS swap" OR LS7 OR E36 OR miata OR "track day" OR "manual transmission" OR "car meet" OR "project car") -is:retweet -is:reply lang:en`;

export type ReplyRun = "Morning · accounts" | "Evening · dirt" | "Evening · asphalt";

export interface QueueItem {
  id: string;
  postId: string;
  url: string;
  author: string;
  text: string;
  likes: number;
  replies: number;
  reposts: number;
  postedAt: string;
  foundAt: string;
  run: string;
  status: "New" | "Replied" | "Skipped";
  replyUrl: string;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" ? v : 0);

export async function isReplySearchOn(): Promise<boolean> {
  if (!isAirtableConfigured(BASE_ID)) return false;
  const rows = await listRecords(SETTINGS, `{Setting} = 'Reply search'`, { baseId: BASE_ID });
  return rows[0]?.fields.On === true;
}

export async function setReplySearch(on: boolean, by: string) {
  const rows = await listRecords(SETTINGS, `{Setting} = 'Reply search'`, { baseId: BASE_ID });
  if (!rows[0]) throw new Error("The Reply search row is missing from Garage Settings.");
  await updateRecord(SETTINGS, rows[0].id, { On: on, "Changed By": by, "Changed At": new Date().toISOString() }, { baseId: BASE_ID });
}

interface SearchResult {
  data?: { id: string; text: string; author_id?: string; created_at?: string; public_metrics?: { like_count?: number; reply_count?: number; retweet_count?: number } }[];
}

async function search(query: string, opts: { sort: "recency" | "relevancy"; hours: number }) {
  const start = new Date(Date.now() - opts.hours * 3600_000).toISOString().replace(/\.\d{3}Z$/, "Z");
  const qs = new URLSearchParams({
    query,
    max_results: "10",
    sort_order: opts.sort,
    start_time: start,
    "tweet.fields": "created_at,public_metrics,author_id",
  });
  return xFetch<SearchResult>(`/2/tweets/search/recent?${qs}`, { method: "GET" });
}

/** Handles → numeric ids, looked up once ($0.010 each) and saved on the row. */
async function activeTargets(): Promise<{ handle: string; id: string }[]> {
  const rows = await listRecords(TARGETS, `{Active}`, { baseId: BASE_ID });
  const missing = rows.filter((r) => !str(r.fields["User ID"]) && str(r.fields.Handle));
  if (missing.length) {
    const names = missing.map((r) => str(r.fields.Handle).replace(/^@/, "")).slice(0, 100);
    const found = await xFetch<{ data?: { id: string; username: string; public_metrics?: { followers_count?: number } }[] }>(
      `/2/users/by?usernames=${names.join(",")}&user.fields=public_metrics`,
      { method: "GET" },
    );
    for (const u of found.data || []) {
      const row = missing.find((r) => str(r.fields.Handle).replace(/^@/, "").toLowerCase() === u.username.toLowerCase());
      if (!row) continue;
      row.fields["User ID"] = u.id;
      await updateRecord(TARGETS, row.id, { "User ID": u.id, Followers: u.public_metrics?.followers_count ?? null }, { baseId: BASE_ID });
    }
  }
  return rows
    .filter((r) => str(r.fields["User ID"]))
    .map((r) => ({ handle: str(r.fields.Handle).replace(/^@/, ""), id: str(r.fields["User ID"]) }));
}

/** Which run this is, by Eastern hour: before noon = morning. */
export function runFor(now = new Date()): ReplyRun {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" }).format(now));
  if (hour < 12) return "Morning · accounts";
  const day = Math.floor(now.getTime() / 86_400_000);
  return day % 2 === 0 ? "Evening · dirt" : "Evening · asphalt";
}

export async function runReplySearch(opts: { run?: ReplyRun; force?: boolean } = {}): Promise<{ run: ReplyRun; skipped?: string; found: number; added: number }> {
  const run = opts.run || runFor();
  if (!isXConfigured()) return { run, skipped: "X keys not set", found: 0, added: 0 };
  if (!opts.force && !(await isReplySearchOn())) return { run, skipped: "Reply search switched off", found: 0, added: 0 };

  let result: SearchResult;
  let authorOf = (id?: string) => (id ? `id:${id}` : "");
  if (run === "Morning · accounts") {
    const targets = await activeTargets();
    if (!targets.length) return { run, skipped: "No active Reply Targets yet", found: 0, added: 0 };
    // Search queries are capped at 512 characters on pay-per-use.
    let query = "";
    const suffix = ") -is:retweet -is:reply";
    for (const t of targets) {
      const next = `${query ? `${query} OR ` : "("}from:${t.handle}`;
      if (next.length + suffix.length > 512) break;
      query = next;
    }
    result = await search(query + suffix, { sort: "recency", hours: 16 });
    const byId = new Map(targets.map((t) => [t.id, t.handle]));
    authorOf = (id?: string) => (id && byId.get(id) ? `@${byId.get(id)}` : id ? `id:${id}` : "");
  } else {
    result = await search(run === "Evening · dirt" ? DIRT : ASPHALT, { sort: "relevancy", hours: 12 });
  }

  const posts = result.data || [];
  const existing = new Set(
    (await listRecords(QUEUE, `IS_AFTER({Found At}, DATEADD(NOW(), -14, 'days'))`, { baseId: BASE_ID })).map((r) => str(r.fields["Post ID"])),
  );
  let added = 0;
  const foundAt = new Date().toISOString();
  for (const p of posts) {
    if (existing.has(p.id)) continue;
    await createRecord(
      QUEUE,
      {
        "Post ID": p.id,
        URL: `https://x.com/i/status/${p.id}`,
        Author: authorOf(p.author_id),
        Text: p.text,
        Likes: p.public_metrics?.like_count ?? 0,
        Replies: p.public_metrics?.reply_count ?? 0,
        Reposts: p.public_metrics?.retweet_count ?? 0,
        ...(p.created_at ? { "Posted At": p.created_at } : {}),
        "Found At": foundAt,
        Run: run,
        Status: "New",
      },
      { baseId: BASE_ID, typecast: true },
    );
    added++;
  }
  return { run, found: posts.length, added };
}

/** Open items first (most engaged at the top), then the last few handled. */
export async function getReplyQueue(): Promise<QueueItem[]> {
  if (!isAirtableConfigured(BASE_ID)) return [];
  const rows = await listRecords(QUEUE, `IS_AFTER({Found At}, DATEADD(NOW(), -3, 'days'))`, { baseId: BASE_ID });
  const items = rows.map((r) => {
    const f = r.fields;
    return {
      id: r.id,
      postId: str(f["Post ID"]),
      url: str(f.URL),
      author: str(f.Author),
      text: str(f.Text),
      likes: num(f.Likes),
      replies: num(f.Replies),
      reposts: num(f.Reposts),
      postedAt: str(f["Posted At"]),
      foundAt: str(f["Found At"]),
      run: str(f.Run),
      status: (str(f.Status) || "New") as QueueItem["status"],
      replyUrl: str(f["Our Reply URL"]),
    };
  });
  const score = (i: QueueItem) => i.likes + 3 * i.replies + 2 * i.reposts;
  const open = items.filter((i) => i.status === "New").sort((a, b) => score(b) - score(a));
  // "The last few handled" — a few. Every handled item used to stay for the
  // full three days, so by the end of a day there were more finished ones on
  // screen than open ones and it read as though replies you had already dealt
  // with kept coming back (Jose, 2026-09-23). They are kept only as recent
  // context; the record of every one of them lives in Airtable.
  const handled = items
    .filter((i) => i.status !== "New")
    .sort((a, b) => b.foundAt.localeCompare(a.foundAt))
    .slice(0, HANDLED_SHOWN);
  return [...open, ...handled];
}

export async function setReplyStatus(id: string, status: QueueItem["status"], by: string, replyUrl?: string) {
  if (!/^rec[A-Za-z0-9]{14}$/.test(id)) throw new Error("Bad id");
  await updateRecord(
    QUEUE,
    id,
    status === "New"
      ? { Status: "New", "Handled By": null, "Our Reply URL": null }
      : { Status: status, "Handled By": by, ...(replyUrl ? { "Our Reply URL": replyUrl } : {}) },
    { baseId: BASE_ID },
  );
}
