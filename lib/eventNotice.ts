import type { EventDetail } from "@/lib/events";
import type { EventUpdateKind } from "@/lib/eventEmails";
import { createRecord, listRecords, updateRecord } from "@/lib/airtable";
import { autoPostNow } from "@/lib/autoPost";
import { getPost } from "@/lib/garageSocial";
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

/** Posts itself. Instagram is absent on purpose — see above. */
export const NOTICE_PLATFORMS = ["X", "Threads", "Facebook Page"] as const;

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
}): Promise<{ text: string; results: NoticeResult[] }> {
  const text = buildEventNotice(input);
  const today = todayNY();
  const results: NoticeResult[] = [];

  for (const platform of NOTICE_PLATFORMS) {
    try {
      const created = await createRecord(
        POSTS,
        {
          Name: `${input.kind === "cancelled" ? "Cancelled" : "Postponed"} · ${input.event.title.trim()} · ${platform}`,
          "Week Of": weekOf(today),
          Due: today,
          Window: "Now",
          Platform: platform,
          Asset: "Text post",
          Status: "Planned",
          Caption: text,
          Event: input.event.slug,
          Approved: true,
          "Approved By": input.by,
          Notes: "Event notice — created and sent from Garage → Events.",
        },
        { baseId: BASE_ID, typecast: true },
      );

      const outcome = await autoPostNow(created.id);
      const post = await getPost(created.id);
      const posted = post?.autoStatus === "Posted";
      results.push({
        platform,
        posted,
        url: post?.postUrl || undefined,
        error: posted ? undefined : outcome?.message || post?.autoLog || "Didn't send.",
      });
      if (!posted) {
        // Leave a failed notice unapproved so nothing retries it on a slot
        // time hours from now, when the news is stale.
        await updateRecord(POSTS, created.id, { Approved: false }, { baseId: BASE_ID }).catch(() => {});
      }
    } catch (err) {
      results.push({ platform, posted: false, error: err instanceof Error ? err.message : "Couldn't create the post." });
    }
  }

  return { text, results };
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
