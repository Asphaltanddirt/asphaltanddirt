/**
 * Fills in the numbers on the Garage posting board so they don't have to be
 * typed off each app.
 *
 * The board's columns are 7-day numbers, but every platform's per-post
 * numbers are lifetime-to-date — so a post's numbers are written once, from 7
 * days after it went up. A post already carrying numbers is left alone, so
 * anything typed in by hand stays put. Each fill stamps Stats At and Stats Age
 * Days, so a post read at day 20 isn't mistaken for one read at day 8.
 *
 * Instagram and Facebook via Meta's insights; X via our own-post metrics
 * (added 2026-09-22 for the X link test). TikTok joins when its API review
 * clears. Runs Mondays from the garage-tasks cron (or on request with
 * ?stats=1).
 */

import { listRecords, updateRecord, type AirtableFields, SOCIAL_BASE_ID } from "@/lib/airtable";
import { facebookPosts, facebookReelStats, instagramPosts, isMetaConfigured, type MetaPost } from "@/lib/metaInsights";
import { fetchOwnPostMetrics, isXConfigured } from "@/lib/xPost";
import { isThreadsConnected, threadsPostMetrics } from "@/lib/threadsPost";

const BASE_ID = SOCIAL_BASE_ID;
const POSTS = "Social Posts";

/** A post is filled on the first Monday run once it's 7+ days old (Jose 9/28:
 *  Mondays only, daily pulls made week over week hard to read). Until 10/3
 *  the window closed at 13 days, so one failed run lost a week of posts for
 *  good: 1 of ~66 posted cards had numbers. Now anything still blank is
 *  caught up to 45 days back, and Stats Age Days says how old it was when read. */
const FILL_FROM_DAY = 7;
const FILL_UNTIL_DAY = 45;

/** When the numbers were taken and how old the post was then (Jose 10/3). */
function stamp(postedAt: string, now: Date): AirtableFields {
  const age = (now.getTime() - new Date(postedAt).getTime()) / 86_400_000;
  return { "Stats At": now.toISOString(), "Stats Age Days": Math.round(age * 10) / 10 };
}

export interface SocialStatsSyncResult {
  ok: boolean;
  skipped?: string;
  error?: string;
  /** Posts in the fill window that already had numbers, so were left alone. */
  alreadyFilled: number;
  /** Posts in the window we had no matching Instagram/Facebook post for. */
  unmatched: number;
  filled: { name: string; platform: string; views?: number }[];
}

/**
 * A post's identity from any link to it. Matching whole permalinks missed most
 * cards (found 10/1): Instagram says /reel/ where a card says /p/, the
 * auto-poster saves Facebook Reels as "/reel/<id>/", and the Page feed's ids
 * are "<page>_<post>". IG = shortcode, FB post = post id, FB Reel = video id.
 */
function postKey(url: string): string {
  const ig = url.match(/instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  if (ig) return `ig:${ig[1]}`;
  const reel = url.match(/\/(?:reel|videos)\/(\d+)/);
  if (reel) return `fbreel:${reel[1]}`;
  const post = url.match(/\/posts\/(?:[^/]+\/)?(\d+)/) || url.match(/[?&]story_fbid=(\d+)/);
  if (post) return `fb:${post[1]}`;
  return "";
}

/** Facebook "share" links (copied from the app) hide the post; follow the
 *  redirect to the real address. Blank when Facebook won't say. */
async function resolveShareLink(url: string): Promise<string> {
  if (!/facebook\.com\/share\//.test(url)) return url;
  try {
    const res = await fetch(url, { redirect: "manual", headers: { "User-Agent": "Mozilla/5.0" } });
    return res.headers.get("location") || "";
  } catch {
    return "";
  }
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

export async function syncSocialStatsFromMeta(
  now = new Date(),
  opts: { dryRun?: boolean } = {},
): Promise<SocialStatsSyncResult & { unmatchedPosts?: string[] }> {
  const empty = { alreadyFilled: 0, unmatched: 0, filled: [] };
  if (!isMetaConfigured()) return { ok: false, skipped: "META_GRAPH_TOKEN not configured", ...empty };

  const rows = await listRecords(POSTS, `{Status} = 'Posted'`, { baseId: BASE_ID });

  // Only rows inside the fill window, on a platform we can reach, with a link.
  // (Facebook Groups have no API for this; those stay by hand.)
  const due = rows.filter((r) => {
    const platform = String(r.fields.Platform || "");
    if (platform !== "Instagram" && platform !== "Facebook" && platform !== "Facebook Page") return false;
    const postedAt = String(r.fields["Posted At"] || "");
    const url = String(r.fields["Post URL"] || "");
    if (!postedAt || !url) return false;
    const age = (now.getTime() - new Date(postedAt).getTime()) / 86_400_000;
    return age >= FILL_FROM_DAY && age <= FILL_UNTIL_DAY;
  });

  if (!due.length) return { ok: true, ...empty };

  // Instagram and Facebook fail separately, so one can't blank the other.
  const since = new Date(now.getTime() - (FILL_UNTIL_DAY + 2) * 86_400_000);
  const [ig, fb] = await Promise.allSettled([
    process.env.META_IG_USER_ID ? instagramPosts(since, 100) : Promise.resolve([]),
    process.env.META_PAGE_ID ? facebookPosts(since, 100) : Promise.resolve([]),
  ]);
  const posts: MetaPost[] = [...(ig.status === "fulfilled" ? ig.value : []), ...(fb.status === "fulfilled" ? fb.value : [])];
  const errors = [ig.status === "rejected" ? `Instagram: ${ig.reason}` : "", fb.status === "rejected" ? `Facebook: ${fb.reason}` : ""].filter(Boolean);
  if (errors.length === 2) return { ok: false, error: errors.join("; "), ...empty };

  const byKey = new Map<string, MetaPost>();
  for (const p of posts) {
    const key = postKey(p.permalink);
    if (key) byKey.set(key, p);
    // Page feed ids are "<page id>_<post id>".
    const fbId = p.id.includes("_") ? p.id.split("_")[1] : "";
    if (fbId) byKey.set(`fb:${fbId}`, p);
  }

  const result: SocialStatsSyncResult & { unmatchedPosts: string[] } = {
    ok: true,
    ...(errors.length ? { error: errors.join("; ") } : {}),
    alreadyFilled: 0,
    unmatched: 0,
    filled: [],
    unmatchedPosts: [],
  };
  const miss = (row: (typeof due)[number], why: string) => {
    result.unmatched++;
    result.unmatchedPosts.push(`${row.fields.Platform}: ${row.fields.Name || row.id} (${row.fields["Post URL"]}): ${why}`);
  };

  for (const row of due) {
    if (num(row.fields["Views 7d"]) !== undefined) {
      result.alreadyFilled++;
      continue;
    }
    const key = postKey(await resolveShareLink(String(row.fields["Post URL"])));
    let s: Record<string, number> | undefined;
    if (key.startsWith("fbreel:")) {
      s = await facebookReelStats(key.slice(7)).catch(() => undefined);
    } else if (key) {
      s = byKey.get(key)?.stats;
    }
    if (!s) {
      miss(row, key ? `no ${key.split(":")[0]} post found for it (${posts.length} fetched)` : "link not recognised");
      continue;
    }

    // Instagram calls saves "saved"; Facebook posts report media views or
    // impressions, Reels report plays.
    const views =
      num(s.views) ?? num(s.fb_reels_total_plays) ?? num(s.blue_reels_play_count) ?? num(s.post_media_view) ??
      num(s.post_impressions) ?? num(s.reach) ?? num(s.post_impressions_unique);
    const fields: AirtableFields = {};
    if (views !== undefined) fields["Views 7d"] = views;
    if (num(s.shares) !== undefined) fields["Shares 7d"] = s.shares;
    if (num(s.saved) !== undefined) fields["Saves 7d"] = s.saved;
    if (num(s.follows) !== undefined) fields["Follows 7d"] = s.follows;
    if (num(s.post_video_followers) !== undefined && fields["Follows 7d"] === undefined) fields["Follows 7d"] = s.post_video_followers;
    if (num(s.likes) !== undefined) fields["Likes 7d"] = s.likes;
    if (num(s.comments) !== undefined) fields["Replies 7d"] = s.comments;
    if (!Object.keys(fields).length) {
      miss(row, `matched, but Meta gave no usable numbers (got: ${Object.keys(s).join(", ") || "nothing"})`);
      continue;
    }

    Object.assign(fields, stamp(String(row.fields["Posted At"]), now));
    if (!opts.dryRun) await updateRecord(POSTS, row.id, fields, { baseId: BASE_ID });
    result.filled.push({
      name: String(row.fields.Name || row.id),
      platform: String(row.fields.Platform || ""),
      views,
    });
  }

  return result;
}

/** X posts on the board, filled once from 7 days old (same catch-up window). */
export async function syncSocialStatsFromX(now = new Date()): Promise<SocialStatsSyncResult> {
  const empty = { alreadyFilled: 0, unmatched: 0, filled: [] };
  if (!isXConfigured()) return { ok: false, skipped: "X keys not configured", ...empty };

  const rows = await listRecords(POSTS, `AND({Status} = 'Posted', {Platform} = 'X')`, { baseId: BASE_ID });
  const result: SocialStatsSyncResult = { ok: true, ...empty, filled: [] };
  const due = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const postedAt = String(r.fields["Posted At"] || "");
    const id = String(r.fields["Post URL"] || "").match(/status\/(\d+)/)?.[1];
    if (!postedAt || !id) continue;
    const age = (now.getTime() - new Date(postedAt).getTime()) / 86_400_000;
    if (age < FILL_FROM_DAY || age > FILL_UNTIL_DAY) continue;
    if (num(r.fields["Views 7d"]) !== undefined) {
      result.alreadyFilled++;
      continue;
    }
    due.set(id, r);
  }
  if (!due.size) return result;

  // X only gives click metrics on posts under 30 days old (catch-up can be older).
  const ageOf = (id: string) => (now.getTime() - new Date(String(due.get(id)!.fields["Posted At"])).getTime()) / 86_400_000;
  const recent = [...due.keys()].filter((id) => ageOf(id) < 29);
  const older = [...due.keys()].filter((id) => ageOf(id) >= 29);
  let metrics;
  try {
    metrics = [...(await fetchOwnPostMetrics(recent)), ...(await fetchOwnPostMetrics(older, false))];
  } catch (e) {
    return { ok: false, error: String(e), ...empty };
  }
  for (const m of metrics) {
    const row = due.get(m.id);
    if (!row) continue;
    due.delete(m.id);
    const fields: AirtableFields = {};
    if (m.impressions !== undefined) fields["Views 7d"] = m.impressions;
    if (m.likes !== undefined) fields["Likes 7d"] = m.likes;
    if (m.replies !== undefined) fields["Replies 7d"] = m.replies;
    if (m.reposts !== undefined || m.quotes !== undefined) fields["Shares 7d"] = (m.reposts || 0) + (m.quotes || 0);
    if (m.bookmarks !== undefined) fields["Saves 7d"] = m.bookmarks;
    if (m.linkClicks !== undefined) fields["Link Clicks 7d"] = m.linkClicks;
    if (m.profileClicks !== undefined) fields["Profile Clicks 7d"] = m.profileClicks;
    Object.assign(fields, stamp(String(row.fields["Posted At"]), now));
    await updateRecord(POSTS, row.id, fields, { baseId: BASE_ID });
    result.filled.push({ name: String(row.fields.Name || row.id), platform: "X", views: m.impressions });
  }
  result.unmatched += due.size;
  return result;
}

/** Threads posts on the board, filled once from 7 days old (same catch-up window). */
export async function syncSocialStatsFromThreads(now = new Date()): Promise<SocialStatsSyncResult> {
  const result: SocialStatsSyncResult = { ok: true, alreadyFilled: 0, unmatched: 0, filled: [] };
  if (!(await isThreadsConnected())) return { ...result, ok: false, skipped: "Threads not connected" };
  const rows = await listRecords(POSTS, `AND({Status} = 'Posted', {Platform} = 'Threads')`, { baseId: BASE_ID });
  for (const r of rows) {
    const postedAt = String(r.fields["Posted At"] || "");
    const url = String(r.fields["Post URL"] || "");
    if (!postedAt || !url) continue;
    const age = (now.getTime() - new Date(postedAt).getTime()) / 86_400_000;
    if (age < FILL_FROM_DAY || age > FILL_UNTIL_DAY) continue;
    if (num(r.fields["Views 7d"]) !== undefined) {
      result.alreadyFilled++;
      continue;
    }
    const m = await threadsPostMetrics(url).catch(() => null);
    if (!m) {
      result.unmatched++;
      continue;
    }
    const fields: AirtableFields = {};
    if (m.views !== undefined) fields["Views 7d"] = m.views;
    if (m.likes !== undefined) fields["Likes 7d"] = m.likes;
    if (m.replies !== undefined) fields["Replies 7d"] = m.replies;
    if (m.reposts !== undefined || m.quotes !== undefined) fields["Shares 7d"] = (m.reposts || 0) + (m.quotes || 0);
    Object.assign(fields, stamp(postedAt, now));
    await updateRecord(POSTS, r.id, fields, { baseId: BASE_ID });
    result.filled.push({ name: String(r.fields.Name || r.id), platform: "Threads", views: m.views });
  }
  return result;
}
