import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { listRecords, updateRecord, isAirtableConfigured } from "@/lib/airtable";
import type { PublishInput, PublishResult } from "@/lib/autoPost";
import { signedMediaUrl } from "@/lib/socialMedia";

/**
 * Posting to Threads for the auto-poster (approved by Jose 2026-09-22, after
 * the Threads Batman & Robin: a near-free copy of the week's X posts, link in
 * the post, Trail Talk there too).
 *
 * Threads has its own login and token (graph.threads.net), separate from the
 * Meta System User token. Jose connects once (Control Room → Connect Threads);
 * the long-lived token lasts 60 days and is refreshed here well before that,
 * stored in Garage Settings → "Threads connection" (Value).
 *
 * Needs THREADS_APP_ID and THREADS_APP_SECRET (the Threads app id/secret on the
 * A&D Posting app, App settings → Basic). Docs checked 2026-09-22: containers →
 * threads_publish, 250 posts / 1,000 replies per 24 h, 500-character text.
 */

const GRAPH = "https://graph.threads.net/v1.0";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.asphaltanddirt.com";
const BASE_ID = process.env.AIRTABLE_ANALYTICS_BASE_ID || "appzbX0Mz3rXtc1GN";
const SETTINGS = "Garage Settings";
const ROW = "Threads connection";
const SCOPES = ["threads_basic", "threads_content_publish", "threads_manage_replies", "threads_manage_insights", "threads_read_replies"];
export const THREADS_TEXT_LIMIT = 500;

const appId = () => process.env.THREADS_APP_ID || "";
const appSecret = () => process.env.THREADS_APP_SECRET || "";
export const redirectUri = () => `${SITE.replace(/\/$/, "")}/api/threads/callback`;

interface Stored {
  token: string;
  userId: string;
  username?: string;
  expiresAt: number; // ms
}

// ---------------------------------------------------------------- connection

async function settingsRow() {
  if (!isAirtableConfigured(BASE_ID)) return null;
  return (await listRecords(SETTINGS, `{Setting} = '${ROW}'`, { baseId: BASE_ID }))[0] || null;
}

async function readStored(): Promise<Stored | null> {
  const row = await settingsRow();
  const raw = typeof row?.fields.Value === "string" ? row.fields.Value : "";
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Stored;
  } catch {
    return null;
  }
}

async function saveStored(s: Stored | null, by: string) {
  const row = await settingsRow();
  if (!row) throw new Error(`The "${ROW}" row is missing from Garage Settings.`);
  await updateRecord(
    SETTINGS,
    row.id,
    { On: Boolean(s), Value: s ? JSON.stringify(s) : null, "Changed By": by, "Changed At": new Date().toISOString() },
    { baseId: BASE_ID },
  );
}

export function isThreadsAppConfigured() {
  return Boolean(appId() && appSecret());
}

/** Signed `state` so the callback only accepts a login we started. */
function state(): string {
  const nonce = randomBytes(12).toString("base64url");
  const sig = createHmac("sha256", process.env.AUTH_SECRET || appSecret()).update(nonce).digest("base64url");
  return `${nonce}.${sig}`;
}
export function checkState(s: string): boolean {
  const [nonce, sig] = s.split(".");
  if (!nonce || !sig) return false;
  const expected = createHmac("sha256", process.env.AUTH_SECRET || appSecret()).update(nonce).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function connectUrl(): string {
  const qs = new URLSearchParams({ client_id: appId(), redirect_uri: redirectUri(), scope: SCOPES.join(","), response_type: "code", state: state() });
  return `https://www.threads.com/oauth/authorize?${qs}`;
}

async function json<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } | string; error_message?: string };
  if (!res.ok || (data as { error?: unknown }).error) {
    const e = (data as { error?: { message?: string } | string }).error;
    const msg = typeof e === "string" ? e : e?.message || (data as { error_message?: string }).error_message || `HTTP ${res.status}`;
    throw new Error(`Threads said: ${msg}`);
  }
  return data;
}

/** Code → short-lived token → 60-day token, then saved. */
export async function completeConnection(code: string, by: string): Promise<string> {
  const short = await json<{ access_token: string; user_id: string | number }>(
    await fetch("https://graph.threads.net/oauth/access_token", {
      method: "POST",
      body: new URLSearchParams({ client_id: appId(), client_secret: appSecret(), grant_type: "authorization_code", redirect_uri: redirectUri(), code }),
      cache: "no-store",
    }),
  );
  const long = await json<{ access_token: string; expires_in: number }>(
    await fetch(
      `https://graph.threads.net/access_token?${new URLSearchParams({ grant_type: "th_exchange_token", client_secret: appSecret(), access_token: short.access_token })}`,
      { cache: "no-store" },
    ),
  );
  const me = await json<{ id: string; username?: string }>(
    await fetch(`${GRAPH}/me?${new URLSearchParams({ fields: "id,username", access_token: long.access_token })}`, { cache: "no-store" }),
  );
  await saveStored({ token: long.access_token, userId: String(me.id || short.user_id), username: me.username, expiresAt: Date.now() + long.expires_in * 1000 }, by);
  return me.username || String(me.id);
}

/** The live token, refreshed once it's inside its last 20 days. */
async function token(): Promise<Stored> {
  const s = await readStored();
  if (!s) throw new Error("Threads isn't connected yet (Control Room → Connect Threads).");
  if (s.expiresAt - Date.now() < 20 * 86_400_000) {
    const r = await json<{ access_token: string; expires_in: number }>(
      await fetch(`https://graph.threads.net/refresh_access_token?${new URLSearchParams({ grant_type: "th_refresh_token", access_token: s.token })}`, {
        cache: "no-store",
      }),
    );
    const next = { ...s, token: r.access_token, expiresAt: Date.now() + r.expires_in * 1000 };
    await saveStored(next, "Auto-refresh");
    return next;
  }
  return s;
}

export async function isThreadsConnected(): Promise<boolean> {
  return Boolean(await readStored().catch(() => null));
}

/** Read-only: is it connected, as whom, and when does the token renew? */
export async function checkThreadsSetup(): Promise<Record<string, unknown>> {
  if (!isThreadsAppConfigured()) return { ok: false, problem: "THREADS_APP_ID / THREADS_APP_SECRET aren't set." };
  try {
    const s = await token();
    const me = await json<{ username?: string }>(await fetch(`${GRAPH}/me?${new URLSearchParams({ fields: "username", access_token: s.token })}`, { cache: "no-store" }));
    return { ok: true, account: `@${me.username}`, tokenRenewsBy: new Date(s.expiresAt - 20 * 86_400_000).toISOString().slice(0, 10) };
  } catch (err) {
    return { ok: false, problem: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------- publishing

async function api<T>(method: "GET" | "POST", path: string, params: Record<string, string>, t: string): Promise<T> {
  const qs = new URLSearchParams({ ...params, access_token: t });
  const res =
    method === "GET"
      ? await fetch(`${GRAPH}/${path}?${qs}`, { cache: "no-store" })
      : await fetch(`${GRAPH}/${path}`, { method: "POST", body: qs, cache: "no-store" });
  return json<T>(res);
}

type Status = "IN_PROGRESS" | "FINISHED" | "ERROR" | "EXPIRED" | "PUBLISHED";

async function waitFor(id: string, t: string, seconds: number): Promise<Status> {
  const until = Date.now() + seconds * 1000;
  for (;;) {
    const d = await api<{ status?: Status; error_message?: string }>("GET", id, { fields: "status,error_message" }, t);
    const status = d.status || "FINISHED";
    if (status === "ERROR" || status === "EXPIRED") throw new Error(`Threads couldn't prepare the post (${status}${d.error_message ? `: ${d.error_message}` : ""}).`);
    if (status === "FINISHED" || status === "PUBLISHED" || Date.now() > until) return status;
    await new Promise((r) => setTimeout(r, 4000));
  }
}

/** Container → publish. Saves the container id between runs while a video encodes. */
export async function publishToThreads(input: PublishInput): Promise<PublishResult> {
  const s = await token();
  const saved = (input.state ? JSON.parse(input.state) : {}) as { container?: string };
  let container = saved.container || "";

  if (!container) {
    const text = input.caption;
    if (input.video !== null) {
      container = (await api<{ id: string }>("POST", `${s.userId}/threads`, { media_type: "VIDEO", video_url: signedMediaUrl(input.post.id, input.video, "raw"), text }, s.token)).id;
    } else if (input.images.length === 0) {
      container = (await api<{ id: string }>("POST", `${s.userId}/threads`, { media_type: "TEXT", text }, s.token)).id;
    } else if (input.images.length === 1) {
      container = (await api<{ id: string }>("POST", `${s.userId}/threads`, { media_type: "IMAGE", image_url: signedMediaUrl(input.post.id, input.images[0], "jpeg"), text }, s.token)).id;
    } else {
      const children: string[] = [];
      for (const i of input.images) {
        const child = await api<{ id: string }>("POST", `${s.userId}/threads`, { media_type: "IMAGE", image_url: signedMediaUrl(input.post.id, i, "jpeg"), is_carousel_item: "true" }, s.token);
        children.push(child.id);
      }
      for (const c of children) await waitFor(c, s.token, 30);
      container = (await api<{ id: string }>("POST", `${s.userId}/threads`, { media_type: "CAROUSEL", children: children.join(","), text }, s.token)).id;
    }
    if (!container) throw new Error("Threads didn't create the post container.");
  }

  const status = await waitFor(container, s.token, input.video !== null ? 20 : 30);
  if (status !== "FINISHED" && status !== "PUBLISHED") {
    return { status: "processing", state: JSON.stringify({ container }), note: "Threads is still preparing it." };
  }
  const published = await api<{ id: string }>("POST", `${s.userId}/threads_publish`, { creation_id: container }, s.token);
  let url = `https://www.threads.com/@${s.username || ""}`;
  try {
    url = (await api<{ permalink?: string }>("GET", published.id, { fields: "permalink" }, s.token)).permalink || url;
  } catch {
    /* the post is up; the link is a nicety */
  }
  return { status: "posted", url };
}

// ---------------------------------------------------------------- numbers

export interface ThreadsMetrics {
  views?: number;
  likes?: number;
  replies?: number;
  reposts?: number;
  quotes?: number;
  shares?: number;
}

/** Lifetime numbers for one of our posts, looked up by its permalink's media id. */
export async function threadsPostMetrics(permalink: string): Promise<ThreadsMetrics | null> {
  const s = await token();
  // Permalinks don't carry the numeric media id, so match against our recent posts.
  const list = await api<{ data?: { id: string; permalink?: string }[] }>("GET", `${s.userId}/threads`, { fields: "id,permalink", limit: "50" }, s.token);
  const key = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "").toLowerCase();
  const match = (list.data || []).find((m) => m.permalink && key(m.permalink) === key(permalink));
  if (!match) return null;
  const ins = await api<{ data?: { name: string; values?: { value: number }[] }[] }>(
    "GET",
    `${match.id}/insights`,
    { metric: "views,likes,replies,reposts,quotes,shares" },
    s.token,
  );
  const get = (n: string) => ins.data?.find((d) => d.name === n)?.values?.[0]?.value;
  return { views: get("views"), likes: get("likes"), replies: get("replies"), reposts: get("reposts"), quotes: get("quotes"), shares: get("shares") };
}

