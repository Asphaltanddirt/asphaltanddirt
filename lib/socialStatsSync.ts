/**
 * Fills in the numbers on the Garage posting board so they don't have to be
 * typed off each app.
 *
 * The board's columns are 7-day numbers, but Meta's per-post insights are
 * lifetime-to-date — so a post's numbers are only written once, in the window
 * where "lifetime" and "7 days" are the same thing: 7 to 10 days after it went
 * up. A post already carrying numbers is left alone, so anything typed in by
 * hand stays put.
 *
 * Dormant until META_GRAPH_TOKEN and an account id are set. Instagram and
 * Facebook only; TikTok joins when its API review clears, and X when there's a
 * card on the metered API.
 */

import { listRecords, updateRecord, type AirtableFields } from "@/lib/airtable";
import { facebookPosts, instagramPosts, isMetaConfigured, type MetaPost } from "@/lib/metaInsights";

const BASE_ID = process.env.AIRTABLE_ANALYTICS_BASE_ID || "appzbX0Mz3rXtc1GN";
const POSTS = "Social Posts";

/** Days after posting when lifetime numbers still read as 7-day numbers. */
const FILL_FROM_DAY = 7;
const FILL_UNTIL_DAY = 10;

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

/** Permalinks differ by trailing slash, www, query string and protocol. */
function permalinkKey(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

export async function syncSocialStatsFromMeta(now = new Date()): Promise<SocialStatsSyncResult> {
  const empty = { alreadyFilled: 0, unmatched: 0, filled: [] };
  if (!isMetaConfigured()) return { ok: false, skipped: "META_GRAPH_TOKEN not configured", ...empty };

  const rows = await listRecords(POSTS, `{Status} = 'Posted'`, { baseId: BASE_ID });

  // Only rows inside the fill window, on a platform we can reach, with a link.
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

  let posts: MetaPost[] = [];
  const since = new Date(now.getTime() - (FILL_UNTIL_DAY + 2) * 86_400_000);
  try {
    const [ig, fb] = await Promise.all([
      process.env.META_IG_USER_ID ? instagramPosts(since) : Promise.resolve([]),
      process.env.META_PAGE_ID ? facebookPosts(since) : Promise.resolve([]),
    ]);
    posts = [...ig, ...fb];
  } catch (e) {
    return { ok: false, error: String(e), ...empty };
  }

  const byPermalink = new Map(posts.filter((p) => p.permalink).map((p) => [permalinkKey(p.permalink), p]));

  const result: SocialStatsSyncResult = { ok: true, alreadyFilled: 0, unmatched: 0, filled: [] };

  for (const row of due) {
    if (num(row.fields["Views 7d"]) !== undefined) {
      result.alreadyFilled++;
      continue;
    }
    const match = byPermalink.get(permalinkKey(String(row.fields["Post URL"])));
    if (!match) {
      result.unmatched++;
      continue;
    }

    const s = match.stats;
    // Instagram calls saves "saved"; Facebook reports impressions, not views.
    const views = num(s.views) ?? num(s.post_impressions) ?? num(s.reach) ?? num(s.post_impressions_unique);
    const fields: AirtableFields = {};
    if (views !== undefined) fields["Views 7d"] = views;
    if (num(s.shares) !== undefined) fields["Shares 7d"] = s.shares;
    if (num(s.saved) !== undefined) fields["Saves 7d"] = s.saved;
    if (num(s.follows) !== undefined) fields["Follows 7d"] = s.follows;
    if (!Object.keys(fields).length) {
      result.unmatched++;
      continue;
    }

    await updateRecord(POSTS, row.id, fields, { baseId: BASE_ID });
    result.filled.push({
      name: String(row.fields.Name || row.id),
      platform: String(row.fields.Platform || ""),
      views,
    });
  }

  return result;
}
