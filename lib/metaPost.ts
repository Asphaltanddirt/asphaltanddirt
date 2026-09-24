import type { PublishInput, PublishResult } from "@/lib/autoPost";
import { signedMediaUrl } from "@/lib/socialMedia";

/**
 * Posting to the Facebook Page and Instagram for the auto-poster.
 *
 * Uses the same System User token as lib/metaInsights.ts (META_GRAPH_TOKEN,
 * META_PAGE_ID, META_IG_USER_ID), which for posting also needs
 * instagram_content_publish, pages_manage_posts and pages_show_list. It
 * can't get pages_manage_engagement (Meta only offers it to this app via the
 * Tech Provider route), so the Page's blog link rides at the end of the
 * caption (lib/socialCopy.ts) and firstComment() only runs if one is set. Page calls use the Page's own token,
 * fetched with the System User token.
 *
 * Meta fetches media by URL, so each asset is handed over as a short-lived
 * signed link on our own site (lib/socialMedia.ts). Instagram takes JPEG only,
 * inside 4:5–1.91:1; that link converts and letterboxes our PNGs on the way.
 *
 * Reels and Instagram containers take Meta a while to process. Rather than
 * wait inside one run, each step saves its ids as the card's Auto State and
 * says "processing"; the next 15-minute run carries on from there.
 * Docs checked 2026-09-22: Graph v26.0, IG content publishing (100 posts/24 h,
 * containers expire after 24 h), Page Reels (30/24 h).
 */

const VERSION = process.env.META_GRAPH_VERSION || "v26.0";
const GRAPH = `https://graph.facebook.com/${VERSION}`;

const TOKEN = () => process.env.META_GRAPH_TOKEN || "";
const PAGE_ID = () => process.env.META_PAGE_ID || "";
const IG_USER_ID = () => process.env.META_IG_USER_ID || "";

export function isMetaPostingConfigured(which: "facebook" | "instagram") {
  return Boolean(TOKEN() && (which === "facebook" ? PAGE_ID() : IG_USER_ID()));
}

async function graph<T>(method: "GET" | "POST", path: string, params: Record<string, string>, token = TOKEN()): Promise<T> {
  const body = new URLSearchParams({ ...params, access_token: token });
  const url = method === "GET" ? `${GRAPH}/${path}?${body}` : `${GRAPH}/${path}`;
  const res = await fetch(url, {
    method,
    cache: "no-store",
    ...(method === "POST" ? { body, headers: { "Content-Type": "application/x-www-form-urlencoded" } } : {}),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string; code?: number; error_user_msg?: string } };
  if (!res.ok || data?.error) {
    const e = data?.error;
    throw new Error(`Meta said: ${e?.error_user_msg || e?.message || `HTTP ${res.status}`}${e?.code ? ` (code ${e.code})` : ""}`);
  }
  return data;
}

let pageTokenCache: { token: string; at: number } | null = null;

/** Page calls need the Page's own token. A System User assigned to the Page
 *  can read it; fall back to the documented /me/accounts listing. */
async function pageToken(): Promise<string> {
  if (pageTokenCache && Date.now() - pageTokenCache.at < 30 * 60 * 1000) return pageTokenCache.token;
  let token = "";
  try {
    token = (await graph<{ access_token?: string }>("GET", PAGE_ID(), { fields: "access_token" })).access_token || "";
  } catch {
    /* try the listing below */
  }
  if (!token) {
    const pages = await graph<{ data?: { id: string; access_token?: string }[] }>("GET", "me/accounts", { fields: "id,access_token" });
    token = pages.data?.find((p) => p.id === PAGE_ID())?.access_token || "";
  }
  if (!token) throw new Error("Couldn't get the Page's token. Is the System User assigned to the Page with full control?");
  pageTokenCache = { token, at: Date.now() };
  return token;
}

const parseState = <T extends object>(state: string): Partial<T> => {
  try {
    return state ? (JSON.parse(state) as Partial<T>) : {};
  } catch {
    return {};
  }
};

// ---------------------------------------------------------------- Facebook Page

interface FacebookState {
  post: string;
  reel: string;
}

async function facebookPermalink(id: string, token: string, fallback: string): Promise<string> {
  try {
    return (await graph<{ permalink_url?: string }>("GET", id, { fields: "permalink_url" }, token)).permalink_url || fallback;
  } catch {
    return fallback;
  }
}

async function firstComment(objectId: string, text: string, token: string): Promise<string | undefined> {
  if (!text) return undefined;
  try {
    await graph("POST", `${objectId}/comments`, { message: text }, token);
    return undefined;
  } catch (err) {
    return `The first comment didn't go through (${err instanceof Error ? err.message : err}). Add it by hand.`;
  }
}

export async function publishToFacebook(input: PublishInput): Promise<PublishResult> {
  const token = await pageToken();
  const page = PAGE_ID();
  const state = parseState<FacebookState>(input.state);

  // Reel: start → Meta fetches the file from our link → finish; then wait for it.
  if (input.video !== null) {
    let reel = state.reel || "";
    if (!reel) {
      const start = await graph<{ video_id?: string; upload_url?: string }>("POST", `${page}/video_reels`, { upload_phase: "start" }, token);
      reel = start.video_id || "";
      if (!reel) throw new Error("Meta didn't start the Reel upload.");
      const upload = await fetch(start.upload_url || `https://rupload.facebook.com/video-upload/${VERSION}/${reel}`, {
        method: "POST",
        headers: { Authorization: `OAuth ${token}`, file_url: signedMediaUrl(input.post.id, input.video, "raw") },
        cache: "no-store",
      });
      if (!upload.ok) throw new Error(`Meta couldn't take the video (HTTP ${upload.status}): ${(await upload.text()).slice(0, 200)}`);
      await graph("POST", `${page}/video_reels`, { upload_phase: "finish", video_id: reel, video_state: "PUBLISHED", description: input.caption }, token);
      return { status: "processing", state: JSON.stringify({ reel }), note: "Reel uploaded; Facebook is processing it." };
    }
    const check = await graph<{ status?: { video_status?: string; processing_phase?: { status?: string; error?: { message?: string } }; publishing_phase?: { status?: string } } }>(
      "GET",
      reel,
      { fields: "status" },
      token,
    );
    const s = check.status;
    if (s?.video_status === "error" || s?.processing_phase?.status === "error") {
      throw new Error(`Facebook couldn't process the Reel: ${s.processing_phase?.error?.message || "processing error"}.`);
    }
    const done = (v?: string) => v === "complete" || v === "completed";
    if (!done(s?.publishing_phase?.status) && s?.video_status !== "ready") {
      return { status: "processing", state: JSON.stringify({ reel }), note: "Facebook is still processing the Reel." };
    }
    const url = await facebookPermalink(reel, token, `https://www.facebook.com/reel/${reel}`);
    return { status: "posted", url, note: await firstComment(reel, input.followUp, token) };
  }

  // Text only — no photo, no video. Used by event cancellation notices, where
  // waiting to make a graphic is time people spend driving to a trailhead.
  // Instagram cannot do this; Facebook can, via /feed with just a message.
  if (input.images.length === 0) {
    const posted = state.post || (await graph<{ id?: string }>("POST", `${page}/feed`, { message: input.caption }, token)).id || "";
    if (!posted) throw new Error("Meta accepted the post but returned no id.");
    const textUrl = await facebookPermalink(posted, token, `https://www.facebook.com/${posted}`);
    return { status: "posted", url: textUrl, note: await firstComment(posted, input.followUp, token) };
  }

  // Photos: one → /photos; several → unpublished photos attached to one feed post.
  let postId = state.post || "";
  if (!postId) {
    if (input.images.length === 1) {
      const photo = await graph<{ id?: string; post_id?: string }>(
        "POST",
        `${page}/photos`,
        { url: signedMediaUrl(input.post.id, input.images[0], "jpeg"), caption: input.caption },
        token,
      );
      postId = photo.post_id || photo.id || "";
    } else {
      const attached: string[] = [];
      for (const i of input.images) {
        const photo = await graph<{ id?: string }>("POST", `${page}/photos`, { url: signedMediaUrl(input.post.id, i, "jpeg"), published: "false" }, token);
        if (!photo.id) throw new Error("Meta didn't take one of the photos.");
        attached.push(photo.id);
      }
      const params: Record<string, string> = { message: input.caption };
      attached.forEach((id, n) => (params[`attached_media[${n}]`] = JSON.stringify({ media_fbid: id })));
      postId = (await graph<{ id?: string }>("POST", `${page}/feed`, params, token)).id || "";
    }
    if (!postId) throw new Error("Meta accepted the post but returned no id.");
  }
  const url = await facebookPermalink(postId, token, `https://www.facebook.com/${postId}`);
  return { status: "posted", url, note: await firstComment(postId, input.followUp, token) };
}

// ---------------------------------------------------------------- Instagram

interface InstagramState {
  container: string;
}

type ContainerStatus = "IN_PROGRESS" | "FINISHED" | "ERROR" | "EXPIRED" | "PUBLISHED";

async function containerStatus(id: string): Promise<{ code: ContainerStatus; detail: string }> {
  const d = await graph<{ status_code?: ContainerStatus; status?: string }>("GET", id, { fields: "status_code,status" });
  return { code: d.status_code || "IN_PROGRESS", detail: d.status || "" };
}

/** Image containers are usually ready in seconds, so wait briefly in-run. */
async function waitFor(id: string, seconds: number): Promise<ContainerStatus> {
  const until = Date.now() + seconds * 1000;
  for (;;) {
    const { code, detail } = await containerStatus(id);
    if (code === "ERROR" || code === "EXPIRED") throw new Error(`Instagram couldn't prepare the post (${code}${detail ? `: ${detail}` : ""}).`);
    if (code === "FINISHED" || code === "PUBLISHED" || Date.now() > until) return code;
    await new Promise((r) => setTimeout(r, 4000));
  }
}

export async function publishToInstagram(input: PublishInput): Promise<PublishResult> {
  const ig = IG_USER_ID();
  const state = parseState<InstagramState>(input.state);
  let container = state.container || "";

  if (!container) {
    if (input.video !== null) {
      container =
        (await graph<{ id?: string }>("POST", `${ig}/media`, {
          media_type: "REELS",
          video_url: signedMediaUrl(input.post.id, input.video, "raw"),
          caption: input.caption,
          share_to_feed: "true",
        })).id || "";
    } else if (input.images.length === 1) {
      container =
        (await graph<{ id?: string }>("POST", `${ig}/media`, { image_url: signedMediaUrl(input.post.id, input.images[0], "ig"), caption: input.caption })).id || "";
    } else {
      const children: string[] = [];
      for (const i of input.images) {
        const child = await graph<{ id?: string }>("POST", `${ig}/media`, { image_url: signedMediaUrl(input.post.id, i, "ig"), is_carousel_item: "true" });
        if (!child.id) throw new Error("Instagram didn't take one of the carousel images.");
        children.push(child.id);
      }
      for (const child of children) await waitFor(child, 40);
      container = (await graph<{ id?: string }>("POST", `${ig}/media`, { media_type: "CAROUSEL", children: children.join(","), caption: input.caption })).id || "";
    }
    if (!container) throw new Error("Instagram didn't create the post container.");
  }

  const code = await waitFor(container, input.video !== null ? 20 : 40);
  if (code !== "FINISHED" && code !== "PUBLISHED") {
    return { status: "processing", state: JSON.stringify({ container }), note: "Instagram is still preparing it." };
  }

  const published = await graph<{ id?: string }>("POST", `${ig}/media_publish`, { creation_id: container });
  const mediaId = published.id || "";
  if (!mediaId) throw new Error("Instagram published but returned no id.");
  let url = "https://www.instagram.com/";
  try {
    url = (await graph<{ permalink?: string }>("GET", mediaId, { fields: "permalink" })).permalink || url;
  } catch {
    /* the post is up; the link is a nicety */
  }
  return { status: "posted", url };
}

// ---------------------------------------------------------------- setup check

/** Read-only: is the token alive, what can it do, and can it see our Page and
 *  Instagram account? Used by /api/cron/auto-post?check=1. Posts nothing. */
export async function checkMetaSetup(): Promise<Record<string, unknown>> {
  if (!TOKEN()) return { ok: false, problem: "META_GRAPH_TOKEN isn't set." };
  const out: Record<string, unknown> = {};
  const need = ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "instagram_basic", "instagram_content_publish"];
  const nice = ["instagram_manage_insights", "read_insights", "business_management"];
  try {
    const me = await graph<{ id?: string; name?: string }>("GET", "me", { fields: "id,name" });
    out.tokenUser = me.name || me.id;
    const perms = await graph<{ data?: { permission: string; status: string }[] }>("GET", "me/permissions", {});
    const granted = (perms.data || []).filter((p) => p.status === "granted").map((p) => p.permission);
    out.granted = granted;
    out.missingRequired = need.filter((p) => !granted.includes(p));
    out.missingOptional = nice.filter((p) => !granted.includes(p));
  } catch (err) {
    return { ok: false, problem: err instanceof Error ? err.message : String(err) };
  }
  if (PAGE_ID()) {
    try {
      const token = await pageToken();
      const page = await graph<{ name?: string }>("GET", PAGE_ID(), { fields: "name" }, token);
      out.page = `${page.name} (page token OK)`;
    } catch (err) {
      out.page = `Problem: ${err instanceof Error ? err.message : err}`;
    }
  } else out.page = "META_PAGE_ID isn't set.";
  if (IG_USER_ID()) {
    try {
      const ig = await graph<{ username?: string }>("GET", IG_USER_ID(), { fields: "username" });
      out.instagram = `@${ig.username}`;
      const limit = await graph<{ data?: { quota_usage?: number; config?: { quota_total?: number } }[] }>("GET", `${IG_USER_ID()}/content_publishing_limit`, { fields: "quota_usage,config" });
      const l = limit.data?.[0];
      if (l) out.instagramQuota = `${l.quota_usage ?? "?"} of ${l.config?.quota_total ?? "?"} posts used in the last 24 h`;
    } catch (err) {
      out.instagram = `Problem: ${err instanceof Error ? err.message : err}`;
    }
  } else out.instagram = "META_IG_USER_ID isn't set.";
  out.ok = (out.missingRequired as string[]).length === 0 && !String(out.page).startsWith("Problem") && !String(out.instagram).startsWith("Problem");
  return out;
}
