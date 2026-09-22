import { listRecords, updateRecord, isAirtableConfigured } from "@/lib/airtable";
import { getAutoPostQueue, getPost, markPosted, saveAutoResult, type SocialPost } from "@/lib/garageSocial";
import { todayNY } from "@/lib/garageTasks";
import { isMetaPostingConfigured, publishToFacebook, publishToInstagram } from "@/lib/metaPost";
import { isXConfigured, publishToX } from "@/lib/xPost";
import { fullCaption, isAutoPlatform, linkPlan, xLength, type AutoPlatform } from "@/lib/socialCopy";

/**
 * The posting board's auto-poster (decided with Jose 2026-09-22).
 *
 *  - Only posts Jose has **approved** on the board go out on their own, at the
 *    start of their slot's time window. "Post now" on a card skips the wait.
 *  - A **master switch** (Garage Settings → "Auto-posting", flipped in the
 *    Control Room) must be on. While it's off every approved post is only
 *    dry-run: checked and logged on the card, never sent.
 *  - X, Facebook Page and Instagram. TikTok stays hand-scheduled, Meta has no
 *    API for posting to Groups, and YouTube is the podcast's own pipeline.
 *
 * Runs every 15 minutes from /api/cron/auto-post. A Reel or carousel can take
 * Meta a few minutes to process, so a platform can hand back "processing" with
 * its ids; the next run picks up from there rather than posting twice.
 */

const BASE_ID = process.env.AIRTABLE_ANALYTICS_BASE_ID || "appzbX0Mz3rXtc1GN";
const SETTINGS = "Garage Settings";
const SWITCH = "Auto-posting";

export type PublishResult = { status: "posted"; url: string; note?: string } | { status: "processing"; state: string; note: string };

export interface PublishInput {
  post: SocialPost;
  caption: string;
  /** The blog link as a first comment (Facebook) or reply (X). Empty = none. */
  followUp: string;
  images: number[];
  video: number | null;
  /** Saved state from an earlier run that is still processing. */
  state: string;
}

// ---------------------------------------------------------------- the switch

export async function getAutoPostSwitch(): Promise<{ on: boolean; id: string | null; changedBy: string; changedAt: string }> {
  if (!isAirtableConfigured(BASE_ID)) return { on: false, id: null, changedBy: "", changedAt: "" };
  const rows = await listRecords(SETTINGS, `{Setting} = '${SWITCH}'`, { baseId: BASE_ID });
  const f = rows[0]?.fields || {};
  return {
    on: f.On === true,
    id: rows[0]?.id || null,
    changedBy: typeof f["Changed By"] === "string" ? f["Changed By"] : "",
    changedAt: typeof f["Changed At"] === "string" ? f["Changed At"] : "",
  };
}

export async function setAutoPostSwitch(on: boolean, by: string) {
  const current = await getAutoPostSwitch();
  if (!current.id) throw new Error("The Auto-posting row is missing from Garage Settings.");
  await updateRecord(SETTINGS, current.id, { On: on, "Changed By": by, "Changed At": new Date().toISOString() }, { baseId: BASE_ID });
}

/** Which platforms have their keys in place. */
export function platformReady(platform: AutoPlatform): boolean {
  if (platform === "X") return isXConfigured();
  if (platform === "Facebook Page") return isMetaPostingConfigured("facebook");
  return isMetaPostingConfigured("instagram");
}

// ---------------------------------------------------------------- timing

/** 9 AM ET is 13:00 or 14:00 UTC depending on daylight time. */
function nyOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUTC - at.getTime()) / 60000);
}

function nyTime(date: string, hour: number, minute: number): Date {
  const guess = new Date(`${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`);
  return new Date(guess.getTime() - nyOffsetMinutes(guess) * 60000);
}

/**
 * When a slot opens. Windows are written for people ("12–1 PM",
 * "12:30–1:30 PM", "6–8 PM", "1 PM (timing test)", "Morning"), so this reads
 * the first time and takes AM/PM from wherever it appears. Anything
 * unreadable falls back to noon rather than going out at midnight.
 */
export function slotStart(due: string, window: string): Date {
  const w = window.toLowerCase();
  if (/morning/.test(w)) return nyTime(due, 9, 0);
  if (/afternoon/.test(w)) return nyTime(due, 13, 0);
  if (/evening|night/.test(w)) return nyTime(due, 18, 0);
  const m = w.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!m) return nyTime(due, 12, 0);
  let hour = Number(m[1]);
  const minute = Number(m[2] || 0);
  const meridiem = m[3] || w.match(/\b(am|pm)\b/)?.[1] || (hour >= 7 && hour <= 11 ? "am" : "pm");
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return nyTime(due, 12, 0);
  return nyTime(due, hour, minute);
}

/** After this long past its slot, an approved post is left for a person to decide. */
const LATE_LIMIT_MS = 6 * 60 * 60 * 1000;

// ---------------------------------------------------------------- checks

/**
 * Everything a post needs before it can go out on its own, checked the same
 * way for Approve, dry runs and the real thing. Returns the plan or the
 * reason it can't.
 */
export function planPublish(post: SocialPost): { ok: true; input: Omit<PublishInput, "state"> } | { ok: false; reason: string } {
  if (!isAutoPlatform(post.platform)) return { ok: false, reason: `${post.platform} isn't auto-posted. Post it by hand.` };
  const caption = fullCaption(post).trim();
  if (!caption) return { ok: false, reason: "No caption yet." };

  const images = post.assets.map((a, i) => (a.type.startsWith("image/") ? i : -1)).filter((i) => i >= 0);
  const videos = post.assets.map((a, i) => (a.type.startsWith("video/") ? i : -1)).filter((i) => i >= 0);
  const wantsVideo = post.asset === "Vertical clip";
  // A text post (e.g. the X Trail Talk question) can go out with no media.
  const textOnly = post.asset === "Text post" && post.platform === "X";

  if (wantsVideo && videos.length === 0) return { ok: false, reason: "This slot is a clip, but no video is attached." };
  if (!wantsVideo && !textOnly && images.length === 0) return { ok: false, reason: "No image attached." };
  if (videos.length > 1) return { ok: false, reason: "Attach one video only." };

  const link = linkPlan(post);
  const followUp = link.kind === "comment" || link.kind === "reply" ? link.text : "";

  if (post.platform === "X") {
    if (xLength(caption) > 280) return { ok: false, reason: `${xLength(caption)} characters; X allows 280.` };
    if (!wantsVideo && images.length > 4) return { ok: false, reason: "X takes up to 4 images." };
    if (wantsVideo) return { ok: false, reason: "Video on X isn't set up yet. Post it by hand." };
  }
  if (post.platform === "Instagram") {
    if (caption.length > 2200) return { ok: false, reason: `${caption.length} characters; Instagram allows 2,200.` };
    if ((caption.match(/#\w/g) || []).length > 30) return { ok: false, reason: "More than 30 hashtags; Instagram rejects that." };
    if (!wantsVideo && images.length > 10) return { ok: false, reason: "Instagram carousels take up to 10 images." };
  }
  return {
    ok: true,
    input: { post, caption, followUp, images: wantsVideo ? [] : images, video: wantsVideo ? videos[0] : null },
  };
}

function describe(input: Omit<PublishInput, "state">): string {
  const p = input.post;
  const what = input.video !== null
    ? p.platform === "Instagram" ? "a Reel" : "a Reel (video)"
    : input.images.length > 1
      ? `${input.images.length} images${p.platform === "Instagram" ? " as a carousel" : ""}`
      : "1 image";
  const extra = input.followUp ? (p.platform === "X" ? ", then the blog link as a reply" : ", then the blog link as the first comment") : "";
  return `${p.platform}: ${what} with the caption (${input.caption.length} characters)${extra}.`;
}

// ---------------------------------------------------------------- running

export interface AutoPostOutcome {
  id: string;
  name: string;
  platform: string;
  result: "posted" | "processing" | "dry-run" | "waiting" | "failed" | "skipped";
  message: string;
}

const stamp = () =>
  new Date().toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

async function publish(input: PublishInput): Promise<PublishResult> {
  if (input.post.platform === "X") return publishToX(input);
  if (input.post.platform === "Facebook Page") return publishToFacebook(input);
  return publishToInstagram(input);
}

/**
 * One post, start to finish. `now` = ignore the slot time ("Post now").
 * Never throws: every outcome is written back to the card.
 */
export async function autoPostOne(post: SocialPost, opts: { live: boolean; now?: boolean; at?: Date }): Promise<AutoPostOutcome> {
  const base = { id: post.id, name: post.name, platform: post.platform };
  const at = opts.at || new Date();

  const plan = planPublish(post);
  if (!plan.ok) {
    const message = `Not posted: ${plan.reason}`;
    if (post.autoLog !== message || post.autoStatus !== "Failed") await saveAutoResult(post.id, { status: "Failed", log: message });
    return { ...base, result: "failed", message };
  }

  const processing = post.autoStatus === "Processing" && post.autoState;
  if (!processing && !opts.now) {
    const start = slotStart(post.due, post.window);
    if (at < start) return { ...base, result: "waiting", message: `Goes out at ${start.toISOString()}.` };
    if (at.getTime() - start.getTime() > LATE_LIMIT_MS) {
      const message = "Not posted: more than 6 hours past its slot, so it's left for you. Tap Post now to send it anyway, or Skip.";
      if (post.autoLog !== message) await saveAutoResult(post.id, { status: "Failed", log: message });
      return { ...base, result: "skipped", message };
    }
  }

  if (!opts.live) {
    const message = `Dry run ${stamp()}: would post to ${describe(plan.input)} The master switch is off, so nothing was sent.`;
    await saveAutoResult(post.id, { status: "Dry run", log: message });
    return { ...base, result: "dry-run", message };
  }
  if (!platformReady(post.platform as AutoPlatform)) {
    const message = `Not posted: the ${post.platform} keys aren't set up yet.`;
    if (post.autoLog !== message) await saveAutoResult(post.id, { status: "Failed", log: message });
    return { ...base, result: "failed", message };
  }

  // Claim it before calling out, so an overlapping run can't post it twice.
  if (!processing) await saveAutoResult(post.id, { status: "Processing", log: `Posting… ${stamp()}`, state: "" });

  try {
    const result = await publish({ ...plan.input, state: processing ? post.autoState : "" });
    if (result.status === "processing") {
      await saveAutoResult(post.id, { status: "Processing", log: `${result.note} ${stamp()}`, state: result.state });
      return { ...base, result: "processing", message: result.note };
    }
    await markPosted(post, { url: result.url, by: "Auto-poster" });
    const message = `Posted ${stamp()}.${result.note ? ` ${result.note}` : ""}`;
    await saveAutoResult(post.id, { status: "Posted", log: message, state: "" });
    return { ...base, result: "posted", message };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    // Keep the saved ids: if the post itself went up and only a later step
    // failed, retrying must not post it again. Approval is cleared so nothing
    // retries on its own; a person looks first.
    const message = `Failed ${stamp()}: ${reason}`;
    await saveAutoResult(post.id, { status: "Failed", log: message });
    await updateRecord("Social Posts", post.id, { Approved: false }, { baseId: BASE_ID }).catch(() => {});
    console.error("auto-post failed", post.id, post.platform, reason);
    return { ...base, result: "failed", message };
  }
}

/** The 15-minute run: every approved post whose slot has opened. */
export async function runAutoPoster(opts: { at?: Date; dryRun?: boolean } = {}): Promise<{ live: boolean; outcomes: AutoPostOutcome[] }> {
  const at = opts.at || new Date();
  const [queue, sw] = await Promise.all([getAutoPostQueue(todayNY()), getAutoPostSwitch()]);
  const live = sw.on && !opts.dryRun;
  const outcomes: AutoPostOutcome[] = [];
  for (const post of queue) {
    // Failed posts wait for a person (un-approve/approve or Post now), except
    // ones that failed only because they weren't ready yet.
    if (post.autoStatus === "Failed" && !post.autoLog.startsWith("Not posted:")) continue;
    // "Processing" with nothing saved means a run was cut off mid-post. It may
    // or may not have gone up, so a person checks rather than risk a double.
    if (post.autoStatus === "Processing" && !post.autoState) {
      const message = "An earlier attempt stopped part-way. Check the platform: if it's up, paste the link and Mark posted; if not, tap Post now.";
      await saveAutoResult(post.id, { status: "Failed", log: message });
      await updateRecord("Social Posts", post.id, { Approved: false }, { baseId: BASE_ID });
      outcomes.push({ id: post.id, name: post.name, platform: post.platform, result: "failed", message });
      continue;
    }
    // A dry run is logged once per post; it doesn't need repeating every 15 minutes.
    if (!live && post.autoStatus === "Dry run") continue;
    outcomes.push(await autoPostOne(post, { live, at }));
  }
  return { live, outcomes };
}

/** "Post now" from a card. Still respects the master switch. */
export async function autoPostNow(id: string): Promise<AutoPostOutcome | null> {
  const post = await getPost(id);
  if (!post) return null;
  const sw = await getAutoPostSwitch();
  return autoPostOne(post, { live: sw.on, now: true });
}
