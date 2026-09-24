import type { EventDetail } from "@/lib/events";
import type { EventUpdateKind } from "@/lib/eventEmails";
import { createRecord, listRecords, updateRecord } from "@/lib/airtable";
import { autoPostNow } from "@/lib/autoPost";
import { addAsset, getPost } from "@/lib/garageSocial";
import { todayNY, weekOf } from "@/lib/garageTasks";
import { xLength } from "@/lib/socialCopy";

/**
 * The social notice for a cancelled or postponed event.
 *
 * Jose's rule, and it reordered the whole spec: "socials is how they found out
 * about event. RSVPed or not, socials is how we update a cancel or
 * postponement." The email is the courtesy for people who gave us an address.
 * This is the announcement, and it is the only thing that reaches a walk-up —
 * somebody who saw the event on Instagram and planned to turn up and sign on
 * the day.
 *
 * WHAT POSTS ITSELF: X, Threads and the Facebook Page. All three take a
 * text-only post, and a cancellation should not wait on a graphic.
 *
 * WHAT DOES NOT, and why:
 *  - **Instagram** requires media on every post. That is a platform limit, not
 *    a gap here. Use the "Event Cancelled / Postponed — Social Graphic" prompt
 *    in the Prompts base; Robin makes the image, a person posts it.
 *  - **The Facebook group event** has no posting API at all — the same wall
 *    that keeps Trail Talk by hand.
 *
 * So the flow posts what it can immediately and hands back the text for the
 * two places a person has to act, rather than pretending they are covered.
 */

const BASE_ID = process.env.AIRTABLE_ANALYTICS_BASE_ID || "appzbX0Mz3rXtc1GN";
const POSTS = "Social Posts";

/**
 * Everywhere the notice goes, and they all carry the SAME image and caption
 * (Jose, 2026-09-23: "all socials get the image, not just text. caption and
 * image, so everyone waits for the image").
 *
 * The earlier version fired X, Threads and Facebook as text the instant the
 * switch flipped and left Instagram waiting. That was faster by a couple of
 * minutes and wrong: the event was announced with a graphic, so a bare line of
 * text reads like a half-finished thought on the channels people are scrolling.
 * One notice, one look, everywhere.
 *
 * The cost is deliberate — nothing social goes out until the image exists. The
 * email does not wait, so the people who gave us an address hear immediately.
 */
export const NOTICE_PLATFORMS = ["X", "Threads", "Facebook Page", "Instagram"] as const;

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

/**
 * The notice itself. Short, because X's 280 is the tightest constraint and one
 * text going everywhere beats three that drift apart.
 */
export function buildEventNotice(input: {
  event: EventDetail;
  kind: EventUpdateKind;
  why: string;
  newDate?: string;
}): string {
  const { event, kind, why, newDate } = input;
  const title = event.title.trim();
  const was = event.date ? formatDate(event.date) : "";

  const headline =
    kind === "cancelled"
      ? `${title} is cancelled${was ? ` — ${was} is off` : ""}.`
      : newDate
        ? `${title} has moved to ${formatDate(newDate)}${was ? ` (was ${was})` : ""}.`
        : `${title} is postponed${was ? ` — ${was} is off` : ""}. New date to come.`;

  const reason = why.trim();
  const tail =
    kind === "cancelled"
      ? "Already signed the waiver? It stays on file — nothing to redo if we reschedule."
      : "Already signed the waiver? It stays on file — nothing to redo.";

  const full = [headline, reason, tail].filter(Boolean).join("\n\n");
  // Drop the waiver line rather than let X truncate the reason.
  return xLength(full) <= 280 ? full : [headline, reason].filter(Boolean).join("\n\n");
}

/**
 * The Robin brief, already filled in. Jose gets this the moment he flips the
 * switch — he makes the graphic, uploads it, and Instagram goes out on its
 * own. The Facebook group event is the only thing left that a person has to
 * carry all the way, because Meta has no Groups posting API.
 */
export function noticeImagePrompt(input: {
  event: EventDetail;
  kind: EventUpdateKind;
  why: string;
  newDate?: string;
}): string {
  const { event, kind, why, newDate } = input;
  return [
    "Make a social graphic announcing this. 1080x1350 for Instagram, and a 1080x1080 square.",
    "",
    `Status: ${kind === "cancelled" ? "CANCELLED" : "POSTPONED"}`,
    `Event name: ${event.title.trim()}`,
    `Original date: ${event.date ? formatDate(event.date) : "TBC"}`,
    `New date: ${kind === "postponed" ? (newDate ? formatDate(newDate) : "to be announced") : "n/a"}`,
    `Reason, one short line: ${why.trim()}`,
    "",
    "Dark near-black background (#1a1712). ONE word dominates the top half —",
    `${kind === "cancelled" ? "CANCELLED" : "POSTPONED"} — heavy condensed uppercase, white, legible as a thumbnail.`,
    "Under it: event name, original date struck through, new date if there is one.",
    "Reason on one line at the bottom. A single orange accent, #f86000, used once.",
    "Leave the bottom-right corner clear for the logo.",
    "",
    "No stock storm photos, no lightning, no emoji, no exclamation marks. This is",
    "information, not a poster. Invent nothing that is not above.",
  ].join("\n");
}

export interface NoticeResult {
  platform: string;
  posted: boolean;
  url?: string;
  error?: string;
}

/**
 * Create a card per auto-capable platform and send it straight away.
 *
 * Cards rather than a direct API call so the notice lands on the posting board
 * like everything else — same Auto Log, same record, and it carries the event
 * slug so it is part of that event's history.
 *
 * Respects the Auto-posting master switch, because `autoPostNow` does. If the
 * switch is off these are logged as dry runs and nothing is sent, which is
 * worth saying out loud to whoever pressed the button.
 */
export async function postEventNotice(input: {
  event: EventDetail;
  kind: EventUpdateKind;
  why: string;
  newDate?: string;
  by: string;
}): Promise<{ text: string; cardIds: string[]; prompt: string; errors: string[] }> {
  const text = buildEventNotice(input);
  const today = todayNY();
  const cardIds: string[] = [];
  const errors: string[] = [];

  for (const platform of NOTICE_PLATFORMS) {
    try {
      const card = await createRecord(
        POSTS,
        {
          Name: `${input.kind === "cancelled" ? "Cancelled" : "Postponed"} · ${input.event.title.trim()} · ${platform}`,
          "Week Of": weekOf(today),
          Due: today,
          Window: "Now",
          Platform: platform,
          Asset: "Square",
          Status: "Planned",
          Caption: text,
          Event: input.event.slug,
          Notes: "Event notice — waiting on the graphic. Attach the image and all of these go out together.",
        },
        { baseId: BASE_ID, typecast: true },
      );
      cardIds.push(card.id);
    } catch (err) {
      errors.push(`${platform}: ${err instanceof Error ? err.message : "couldn't make the card"}`);
    }
  }

  return { text, cardIds, prompt: noticeImagePrompt(input), errors };
}

/**
 * The image landed. Put it on every notice card and send them all.
 *
 * One upload, one fan-out — the alternative is attaching the same picture four
 * times from a phone, which is how one of them ends up missed.
 */
export async function sendEventNotice(input: {
  cardIds: string[];
  image: { filename: string; contentType: string; base64: string };
}): Promise<NoticeResult[]> {
  const results: NoticeResult[] = [];

  for (const id of input.cardIds) {
    const card = await getPost(id);
    if (!card) {
      results.push({ platform: "unknown", posted: false, error: "That card is gone." });
      continue;
    }
    try {
      await addAsset(id, input.image);
      await updateRecord(POSTS, id, { Approved: true }, { baseId: BASE_ID });
      const outcome = await autoPostNow(id);
      const after = await getPost(id);
      const posted = after?.autoStatus === "Posted";
      results.push({
        platform: card.platform,
        posted,
        url: after?.postUrl || undefined,
        error: posted ? undefined : outcome?.message || after?.autoLog || "Didn't send.",
      });
      // Don't let a failed notice retry at some slot time when it's stale news.
      if (!posted) await updateRecord(POSTS, id, { Approved: false }, { baseId: BASE_ID }).catch(() => {});
    } catch (err) {
      results.push({ platform: card.platform, posted: false, error: err instanceof Error ? err.message : "Failed." });
    }
  }

  return results;
}

/** Has a notice already gone out for this event today? Stops a double-tap. */
export async function noticeAlreadySent(slug: string): Promise<boolean> {
  try {
    const rows = await listRecords(POSTS, `AND({Event} = '${slug.replace(/'/g, "\\'")}', {Due} = '${todayNY()}')`, { baseId: BASE_ID });
    return rows.some((r) => typeof r.fields.Name === "string" && /^(Cancelled|Postponed) · /.test(r.fields.Name));
  } catch {
    return false;
  }
}
