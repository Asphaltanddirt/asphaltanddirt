import { getPostsBetween, type SocialPost } from "@/lib/garageSocial";
import { todayNY } from "@/lib/garageTasks";
import { getMediaLibrary, markMediaUsed, type MediaRow } from "@/lib/mediaLibrary";

/**
 * Tag what we post in the Media Library, even when it didn't go out through a
 * Library pick (punchlist #7, Jose 9/24–25).
 *
 * A Library pick already stamps Used At / Used On. Everything else (a clip
 * dropped straight onto a card, a still from someone's phone) used to leave
 * the Library thinking the footage was still unused, which quietly inflates
 * the Planning Calendar's footage count. So, daily: every Posted card's files
 * are matched to Library rows by file name (a Library pick keeps the Drive
 * name on the attachment). A name only counts when exactly one Library row
 * has it, because phone names like IMG_3008.mov repeat across phones.
 *
 * A posted VIDEO that matches nothing is listed on the Library screen as
 * "posted, not in the Library" so it can be uploaded once. Designed images
 * (blog art, promo cards) were never footage and are ignored.
 *
 * Posts made straight from a phone app with no card file can't be seen here;
 * that's the limit of this check, not a bug.
 */

const LOOKBACK_DAYS = 28;
const isVideo = (name: string) => /\.(mov|mp4|m4v)$/i.test(name);

export interface UnlistedPost {
  cardId: string;
  fileName: string;
  platform: string;
  due: string;
  topic: string;
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function uniqueByName(rows: MediaRow[]): Map<string, MediaRow> {
  const count = new Map<string, number>();
  for (const r of rows) count.set(r.fileName.toLowerCase(), (count.get(r.fileName.toLowerCase()) || 0) + 1);
  return new Map(rows.filter((r) => count.get(r.fileName.toLowerCase()) === 1).map((r) => [r.fileName.toLowerCase(), r]));
}

/**
 * Match posted cards to the Library. With `write`, stamps Used At / Used On on
 * any matched row that isn't stamped yet (the daily cron). Without it, only
 * reports (the Library screen).
 */
export async function matchPostedMedia({ write = false } = {}): Promise<{ tagged: number; unlisted: UnlistedPost[] }> {
  const today = todayNY();
  const [posts, library] = await Promise.all([
    getPostsBetween(addDays(today, -LOOKBACK_DAYS), today).catch(() => [] as SocialPost[]),
    getMediaLibrary().catch(() => [] as MediaRow[]),
  ]);
  const byName = uniqueByName(library);
  const allNames = new Set(library.map((r) => r.fileName.toLowerCase()));
  const stamped = new Set(library.filter((r) => r.usedAt).map((r) => r.id));
  const unlisted = new Map<string, UnlistedPost>();
  let tagged = 0;

  for (const post of posts.filter((p) => p.status === "Posted")) {
    for (const asset of post.assets) {
      const name = asset.filename.toLowerCase();
      const row = byName.get(name);
      if (row) {
        if (write && !stamped.has(row.id)) {
          await markMediaUsed(row.id, `${post.due} · ${post.topic || "post"} (${post.platform})`);
          stamped.add(row.id);
          tagged++;
        }
      } else if (isVideo(name) && !allNames.has(name) && !unlisted.has(name)) {
        unlisted.set(name, { cardId: post.id, fileName: asset.filename, platform: post.platform, due: post.due, topic: post.topic });
      }
    }
  }
  return { tagged, unlisted: [...unlisted.values()].sort((a, b) => b.due.localeCompare(a.due)) };
}
