import { createHmac, randomBytes } from "node:crypto";
import type { PublishInput, PublishResult } from "@/lib/autoPost";

/**
 * Posting to X for the auto-poster: upload the images, post with them, then
 * reply with the blog link (our rule: the link goes in a reply, not the post).
 *
 * OAuth 1.0a user context, signed by hand — four keys from the X developer
 * console, generated AFTER the app is set to Read and Write:
 *   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
 *
 * Billing (docs.x.com pricing, checked 2026-09-22): a post is $0.015, but a
 * post that contains a URL is $0.20 — so the link reply is the expensive part.
 * v1.1 media upload was retired in 2025; this uses POST /2/media/upload.
 */

const API = "https://api.x.com";

const keys = () => ({
  consumerKey: process.env.X_API_KEY || "",
  consumerSecret: process.env.X_API_SECRET || "",
  token: process.env.X_ACCESS_TOKEN || "",
  tokenSecret: process.env.X_ACCESS_TOKEN_SECRET || "",
});

export function isXConfigured() {
  const k = keys();
  return Boolean(k.consumerKey && k.consumerSecret && k.token && k.tokenSecret);
}

const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/** OAuth 1.0a header. JSON and multipart bodies are not part of the signature
 *  (RFC 5849 §3.4.1.3 only signs form-urlencoded bodies). */
export function oauthHeader(method: string, url: string, k = keys(), nonce = randomBytes(16).toString("hex"), timestamp = Math.floor(Date.now() / 1000).toString()) {
  const u = new URL(url);
  const oauth: Record<string, string> = {
    oauth_consumer_key: k.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: k.token,
    oauth_version: "1.0",
  };
  const params = [...Object.entries(oauth), ...[...u.searchParams.entries()]]
    .map(([key, v]) => [enc(key), enc(v)])
    .sort(([a, av], [b, bv]) => (a === b ? av.localeCompare(bv) : a.localeCompare(b)))
    .map(([key, v]) => `${key}=${v}`)
    .join("&");
  const base = [method.toUpperCase(), enc(`${u.origin}${u.pathname}`), enc(params)].join("&");
  const signature = createHmac("sha1", `${enc(k.consumerSecret)}&${enc(k.tokenSecret)}`).update(base).digest("base64");
  return (
    "OAuth " +
    Object.entries({ ...oauth, oauth_signature: signature })
      .map(([key, v]) => `${enc(key)}="${enc(v)}"`)
      .join(", ")
  );
}

async function xFetch<T>(path: string, init: { method: string; body?: BodyInit; json?: unknown }): Promise<T> {
  const url = `${API}${path}`;
  const headers: Record<string, string> = { Authorization: oauthHeader(init.method, url) };
  let body = init.body;
  if (init.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }
  const res = await fetch(url, { method: init.method, headers, body, cache: "no-store" });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) {
    const d = data as { detail?: string; title?: string; errors?: { message?: string }[] } | null;
    const why = d?.detail || d?.errors?.[0]?.message || d?.title || text.slice(0, 200) || `HTTP ${res.status}`;
    throw new Error(`X said: ${why} (${res.status})`);
  }
  return data as T;
}

async function uploadImage(url: string, filename: string, type: string): Promise<string> {
  const file = await fetch(url, { cache: "no-store" });
  if (!file.ok) throw new Error(`Couldn't load ${filename} to upload it.`);
  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > 5 * 1024 * 1024) throw new Error(`${filename} is over X's 5 MB image limit.`);
  const form = new FormData();
  form.append("media", new Blob([bytes], { type: type || "image/png" }), filename);
  form.append("media_category", "tweet_image");
  const data = await xFetch<{ data?: { id?: string } }>("/2/media/upload", { method: "POST", body: form });
  if (!data.data?.id) throw new Error(`X didn't return a media id for ${filename}.`);
  return data.data.id;
}

/**
 * State between steps is saved on the card, so a failure after the post went
 * up never posts it again: `{"tweet":"<id>"}` means only the reply is left.
 */
export async function publishToX(input: PublishInput): Promise<PublishResult> {
  const saved = (input.state ? JSON.parse(input.state) : {}) as { tweet?: string };
  let tweetId = saved.tweet || "";

  if (!tweetId) {
    const mediaIds: string[] = [];
    for (const i of input.images) {
      const a = input.post.assets[i];
      mediaIds.push(await uploadImage(a.url, a.filename, a.type));
    }
    const created = await xFetch<{ data?: { id?: string } }>("/2/tweets", {
      method: "POST",
      json: { text: input.caption, ...(mediaIds.length ? { media: { media_ids: mediaIds } } : {}) },
    });
    tweetId = created.data?.id || "";
    if (!tweetId) throw new Error("X accepted the post but returned no id.");
  }
  const url = `https://x.com/i/status/${tweetId}`;

  if (input.followUp) {
    try {
      await xFetch("/2/tweets", { method: "POST", json: { text: input.followUp, reply: { in_reply_to_tweet_id: tweetId } } });
    } catch (err) {
      // The post is up; don't let the reply failing send it again.
      return { status: "posted", url, note: `The link reply didn't go through (${err instanceof Error ? err.message : err}). Add it by hand.` };
    }
  }
  return { status: "posted", url };
}

/** Read-only: do the four keys sign in, and as whom? Posts nothing. */
export async function checkXSetup(): Promise<Record<string, unknown>> {
  if (!isXConfigured()) return { ok: false, problem: "One or more of the four X keys isn't set." };
  try {
    const me = await xFetch<{ data?: { username?: string; created_at?: string; public_metrics?: Record<string, number> } }>(
      "/2/users/me?user.fields=created_at,public_metrics",
      { method: "GET" },
    );
    return { ok: true, account: `@${me.data?.username}`, created: me.data?.created_at, metrics: me.data?.public_metrics, note: "Signed in. Whether the keys can WRITE only shows on the first post; they must say Read and Write in the console." };
  } catch (err) {
    return { ok: false, problem: err instanceof Error ? err.message : String(err) };
  }
}
