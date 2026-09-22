import { createRecord, listRecords, updateRecord, isAirtableConfigured } from "@/lib/airtable";

/**
 * The comment harvester (Jose, 2026-09-21: "can we pull comments through the
 * API and pick out the real questions?").
 *
 * Once a week it pulls every new comment on the channel, sorts it into four
 * buckets and files it in Garage → Comments. Two things feed off it:
 *  - the **listener Q&A episode**, which is waiting on a supply of real
 *    questions (31 comment threads in total as of 2026-09-21, of which about
 *    two were genuine viewer questions — so the point of this is to catch them
 *    as they arrive rather than dig for them later);
 *  - **Garage Takes**, which a good debate comment can become on its own.
 *
 * The sorting is keyword matching, not judgement. It is deliberately crude and
 * it will be wrong sometimes — every row can be re-bucketed by hand on the
 * board, and the buckets only decide what gets read first. Nothing here replies
 * to anybody; replies are written by hand on YouTube.
 *
 * Reads the public YouTube Data API with YOUTUBE_API_KEY (comments on our own
 * channel are public data, so no OAuth token is needed).
 */

const BASE_ID = process.env.AIRTABLE_ANALYTICS_BASE_ID || "appzbX0Mz3rXtc1GN";
const TABLE = "Comments";
const SETTINGS = "Garage Settings";
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || "UCxW12IVrVrAx-UKFoNfq45Q";
const API = "https://www.googleapis.com/youtube/v3";

export type Bucket = "Question" | "Debate" | "Praise" | "Noise";
export type CommentStatus = "New" | "Answered" | "Q&A episode" | "Garage Take" | "Ignore";

export const BUCKETS: Bucket[] = ["Question", "Debate", "Praise", "Noise"];
export const STATUSES: CommentStatus[] = ["New", "Answered", "Q&A episode", "Garage Take", "Ignore"];

export interface HarvestedComment {
  id: string;
  commentId: string;
  videoId: string;
  videoTitle: string;
  url: string;
  author: string;
  text: string;
  likes: number;
  replies: number;
  publishedAt: string;
  harvestedAt: string;
  bucket: Bucket;
  status: CommentStatus;
  notes: string;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" ? v : 0);

// ────────────────────────────────────────────────────────────── the sorting

/** Link-droppers, sub-for-sub and one-word noise. Checked first: a spam comment
 *  with a question mark in it is still spam. */
const SPAM = /\b(sub4sub|sub for sub|check out my|dm me|whatsapp|telegram|promo|free (gift|money|bitcoin)|crypto|investment|\+1\s?\(?\d{3})/i;

/** Real disagreement, or the comparison arguments that make good Garage Takes.
 *  "Real impressed a jeep can do what an awd camry could do" is the kind of
 *  comment this is for — heckling is debate material, not noise.
 *  "wrong" needs its context: a viewer writing "nobody knew what was wrong with
 *  her" is not arguing with us. That exact comment is why this is narrowed. */
const DEBATE =
  /\b(disagree|you'?re wrong|that'?s wrong|wrong about|dead wrong|prove me wrong|nope|not true|actually,|thats not|that's not|you forgot|overrated|underrated|waste of (money|time)|better than|worse than|way better|no way|cope|hot take|unpopular opinion|hard pass|useless|pointless|real impressed|lol no|nah)\b/i;
const COMPARISON = /\b(vs\.?|versus)\b|\b(x|y)\s+is\s+better\b/i;
/** Short put-downs. Low value on their own, but they are an argument about the
 *  build or the claim in the title, so they belong with the debates. */
const DISMISSIVE = /\b(stupid|dumb(est)?|ruined|garbage|trash|clown|not extreme|hardly (a )?trail|that'?s not a trail)\b/i;

const PRAISE =
  /\b(thank|thanks|thx|love (this|it|the)|great (video|vid|stuff|content|point|job)|awesome|nice (one|video|rig|build|shot)|good (video|stuff|content|point|job)|well done|respect|subscribed|keep (it up|em coming)|fire|dope|recommend|appreciate|helpful|exactly what i needed|sick (rig|build|truck|jeep))\b|[🔥💯👍🙌👏❤️]/iu;

/** Politics and general ranting. Off-topic for a car channel — filed as noise
 *  so it never reaches an episode by accident. */
const OFF_TOPIC = /\b(trump|biden|democrat|republican|politics|political|immigrant|illegals|this country is)\b/i;

const QUESTION_OPENER =
  /^(how|what|what's|whats|which|why|when|where|who|can|could|would|should|do|does|did|is|are|any(one|body)?|has|have|will|im wondering|i'm wondering)\b/i;

/** Which pile a comment lands in. Crude by design — see the note at the top. */
export function bucketFor(text: string): Bucket {
  const t = text.trim();
  const words = t.split(/\s+/).filter(Boolean).length;

  if (!t || SPAM.test(t) || OFF_TOPIC.test(t)) return "Noise";
  // Emoji, "first!", and two-word reactions carry nothing to answer or argue with.
  if (words <= 2 && !t.includes("?")) return "Noise";

  const hasQuestion = t.includes("?") || QUESTION_OPENER.test(t);
  // A question worth answering has a subject in it, not just a "?".
  if (hasQuestion && words >= 4) return "Question";
  if (DEBATE.test(t) || (COMPARISON.test(t) && words >= 5)) return "Debate";
  if (PRAISE.test(t)) return "Praise";
  if (DISMISSIVE.test(t)) return "Debate";
  return words >= 8 ? "Debate" : "Noise";
}

// ──────────────────────────────────────────────────────────────── the pull

interface ThreadsResponse {
  items?: {
    snippet?: {
      videoId?: string;
      totalReplyCount?: number;
      topLevelComment?: {
        id?: string;
        snippet?: {
          textOriginal?: string;
          textDisplay?: string;
          authorDisplayName?: string;
          authorChannelId?: { value?: string };
          likeCount?: number;
          publishedAt?: string;
        };
      };
    };
  }[];
  nextPageToken?: string;
  error?: { message?: string };
}

async function yt<T>(path: string): Promise<T> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY isn't set.");
  const res = await fetch(`${API}/${path}&key=${key}`, { cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(`YouTube said: ${data.error?.message || `HTTP ${res.status}`}`);
  return data;
}

/** Video titles for the ids we saw, 50 at a time. Titles are a nicety — a
 *  failed lookup costs the row its title, not the row. */
async function titlesFor(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    try {
      const data = await yt<{ items?: { id?: string; snippet?: { title?: string } }[] }>(
        `videos?part=snippet&id=${batch.join(",")}`,
      );
      for (const v of data.items || []) if (v.id) out.set(v.id, v.snippet?.title || "");
    } catch (err) {
      console.error("comment harvest: video titles failed", err);
    }
  }
  return out;
}

export async function isHarvestOn(): Promise<boolean> {
  if (!isAirtableConfigured(BASE_ID)) return false;
  const rows = await listRecords(SETTINGS, `{Setting} = 'Comment harvest'`, { baseId: BASE_ID });
  // No row yet = on. This costs nothing to run and there is nothing to publish.
  return rows[0] ? rows[0].fields.On === true : true;
}

export async function setHarvest(on: boolean, by: string) {
  const rows = await listRecords(SETTINGS, `{Setting} = 'Comment harvest'`, { baseId: BASE_ID });
  if (!rows[0]) throw new Error("The Comment harvest row is missing from Garage Settings.");
  await updateRecord(SETTINGS, rows[0].id, { On: on, "Changed By": by, "Changed At": new Date().toISOString() }, { baseId: BASE_ID });
}

export interface HarvestResult {
  skipped?: string;
  scanned: number;
  added: number;
  ours: number;
  byBucket: Record<Bucket, number>;
}

/**
 * Pulls new comments and files them. Safe to run twice — every comment carries
 * YouTube's own id, and anything already in the table is left alone (including
 * whatever bucket or status it was moved to by hand).
 */
export async function harvestComments(opts: { force?: boolean; pages?: number } = {}): Promise<HarvestResult> {
  const empty: Record<Bucket, number> = { Question: 0, Debate: 0, Praise: 0, Noise: 0 };
  if (!isAirtableConfigured(BASE_ID)) return { skipped: "Airtable isn't configured", scanned: 0, added: 0, ours: 0, byBucket: empty };
  if (!opts.force && !(await isHarvestOn())) return { skipped: "Comment harvest switched off", scanned: 0, added: 0, ours: 0, byBucket: empty };

  const known = new Set((await listRecords(TABLE, undefined, { baseId: BASE_ID })).map((r) => str(r.fields["Comment ID"])));

  // Newest first, so we can stop as soon as a whole page is already filed.
  const maxPages = opts.pages ?? 4;
  const fresh: {
    commentId: string;
    videoId: string;
    author: string;
    text: string;
    likes: number;
    replies: number;
    publishedAt: string;
  }[] = [];
  let scanned = 0;
  let ours = 0;
  let page: string | undefined;

  for (let p = 0; p < maxPages; p++) {
    const data: ThreadsResponse = await yt<ThreadsResponse>(
      `commentThreads?part=snippet&allThreadsRelatedToChannelId=${CHANNEL_ID}&order=time&maxResults=100&textFormat=plainText${page ? `&pageToken=${page}` : ""}`,
    );
    const items = data.items || [];
    if (!items.length) break;
    let newOnPage = 0;
    for (const item of items) {
      const top = item.snippet?.topLevelComment;
      const s = top?.snippet;
      const id = top?.id;
      if (!id || !s) continue;
      scanned++;
      if (known.has(id)) continue;
      // Our own comments (the pinned prompts) are not audience questions.
      if (s.authorChannelId?.value === CHANNEL_ID) {
        ours++;
        continue;
      }
      newOnPage++;
      fresh.push({
        commentId: id,
        videoId: item.snippet?.videoId || "",
        author: s.authorDisplayName || "",
        text: s.textOriginal || s.textDisplay || "",
        likes: s.likeCount ?? 0,
        replies: item.snippet?.totalReplyCount ?? 0,
        publishedAt: s.publishedAt || "",
      });
    }
    page = data.nextPageToken;
    if (!page || newOnPage === 0) break;
  }

  const titles = await titlesFor([...new Set(fresh.map((c) => c.videoId).filter(Boolean))]);
  const harvestedAt = new Date().toISOString();
  const byBucket = { ...empty };
  let added = 0;

  for (const c of fresh) {
    const bucket = bucketFor(c.text);
    await createRecord(
      TABLE,
      {
        "Comment ID": c.commentId,
        "Video ID": c.videoId,
        "Video Title": titles.get(c.videoId) || "",
        URL: c.videoId ? `https://www.youtube.com/watch?v=${c.videoId}&lc=${c.commentId}` : "",
        Author: c.author,
        Text: c.text,
        Likes: c.likes,
        Replies: c.replies,
        ...(c.publishedAt ? { "Published At": c.publishedAt } : {}),
        "Harvested At": harvestedAt,
        Bucket: bucket,
        Status: "New",
      },
      { baseId: BASE_ID, typecast: true },
    );
    byBucket[bucket]++;
    added++;
  }

  return { scanned, added, ours, byBucket };
}

// ───────────────────────────────────────────────────────────── the board

/** Everything not dealt with, best first, plus what was handled recently. */
export async function getComments(): Promise<HarvestedComment[]> {
  if (!isAirtableConfigured(BASE_ID)) return [];
  const rows = await listRecords(TABLE, undefined, { baseId: BASE_ID });
  const items: HarvestedComment[] = rows.map((r) => {
    const f = r.fields;
    return {
      id: r.id,
      commentId: str(f["Comment ID"]),
      videoId: str(f["Video ID"]),
      videoTitle: str(f["Video Title"]),
      url: str(f.URL),
      author: str(f.Author),
      text: str(f.Text),
      likes: num(f.Likes),
      replies: num(f.Replies),
      publishedAt: str(f["Published At"]),
      harvestedAt: str(f["Harvested At"]),
      bucket: (str(f.Bucket) || "Noise") as Bucket,
      status: (str(f.Status) || "New") as CommentStatus,
      notes: str(f.Notes),
    };
  });
  const rank: Record<Bucket, number> = { Question: 0, Debate: 1, Praise: 2, Noise: 3 };
  return items.sort(
    (a, b) =>
      rank[a.bucket] - rank[b.bucket] ||
      b.likes - a.likes ||
      (b.publishedAt || "").localeCompare(a.publishedAt || ""),
  );
}

export async function setCommentStatus(id: string, status: CommentStatus, by: string) {
  if (!/^rec[A-Za-z0-9]{14}$/.test(id)) throw new Error("Bad id");
  if (!STATUSES.includes(status)) throw new Error("Bad status");
  await updateRecord(
    TABLE,
    id,
    status === "New" ? { Status: "New", "Handled By": null } : { Status: status, "Handled By": by },
    { baseId: BASE_ID },
  );
}

/** Re-file a comment the keyword sort got wrong. */
export async function setCommentBucket(id: string, bucket: Bucket) {
  if (!/^rec[A-Za-z0-9]{14}$/.test(id)) throw new Error("Bad id");
  if (!BUCKETS.includes(bucket)) throw new Error("Bad bucket");
  await updateRecord(TABLE, id, { Bucket: bucket }, { baseId: BASE_ID });
}

/** Read-only: can this run, and is the table there? */
export async function checkHarvestSetup(): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = { channel: CHANNEL_ID, key: Boolean(process.env.YOUTUBE_API_KEY) };
  try {
    const rows = await listRecords(TABLE, undefined, { baseId: BASE_ID });
    out.table = `ok — ${rows.length} rows`;
  } catch (err) {
    out.table = `MISSING — create a "${TABLE}" table in the Analytics base (${err instanceof Error ? err.message.slice(0, 80) : ""})`;
  }
  try {
    out.on = await isHarvestOn();
  } catch {
    out.on = "unknown";
  }
  return out;
}
