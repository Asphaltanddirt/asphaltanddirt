import type { EventDetail } from "@/lib/events";
import type { EventUpdateKind } from "@/lib/eventEmails";
import { createRecord, listRecords, updateRecord } from "@/lib/airtable";
import { autoPostNow } from "@/lib/autoPost";
import { addAsset, getPost } from "@/lib/garageSocial";
import { todayNY, weekOf } from "@/lib/garageTasks";
import { buildEventNotice, noticeImagePrompt } from "@/lib/eventNoticeText";

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
export { buildEventNotice, noticeImagePrompt };

export const NOTICE_PLATFORMS = ["X", "Threads", "Facebook Page", "Instagram"] as const;

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
  rescheduled?: boolean;
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
          Name: `${input.rescheduled ? "Back on" : input.kind === "cancelled" ? "Cancelled" : "Postponed"} · ${input.event.title.trim()} · ${platform}`,
          "Week Of": weekOf(today),
          Due: today,
          Window: "Now",
          Platform: platform,
          Asset: "Square",
          Status: "Planned",
          Caption: text,
          Event: input.event.slug,
          Notes: "Event notice — sent with the graphic from Garage → Events.",
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

/**
 * TikTok gets the notice too, by hand (Jose, 2026-09-24, after the Mud Run
 * move: "everything worked except tiktok"). There is no TikTok posting API
 * wired, so this is a card in the board's By hand section, carrying the same
 * image and caption as the other four, never approved. The done screen also
 * hands over Save image + Copy caption so it can be posted on the spot.
 */
export async function createTikTokNoticeCard(input: {
  event: EventDetail;
  kind: EventUpdateKind;
  text: string;
  rescheduled?: boolean;
  image: { filename: string; contentType: string; base64: string };
}): Promise<string | null> {
  const today = todayNY();
  const label = input.rescheduled ? "Back on" : input.kind === "cancelled" ? "Cancelled" : "Postponed";
  const card = await createRecord(
    POSTS,
    {
      Name: `${label} · ${input.event.title.trim()} · TikTok`,
      "Week Of": weekOf(today),
      Due: today,
      Window: "Now",
      Platform: "TikTok",
      Asset: "Square",
      Status: "Planned",
      Caption: input.text,
      Event: input.event.slug,
      Notes: "Event notice — TikTok is by hand. Post the attached image as a photo post with this caption, then mark it posted.",
    },
    { baseId: BASE_ID, typecast: true },
  );
  await addAsset(card.id, input.image);
  return card.id;
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
