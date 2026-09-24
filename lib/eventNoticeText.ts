import { xLength } from "@/lib/socialCopy";

/**
 * The words of a cancel/postpone notice and the Robin brief for its graphic.
 *
 * Pure text, no Airtable, so the Garage screen can build both live as Jose
 * types (2026-09-24: "should the prompt already generate as we work down the
 * section?") and the server sends exactly what the screen showed.
 */

export type NoticeKind = "cancelled" | "postponed" | "update";
export interface NoticeEvent {
  title: string;
  date?: string | null;
}

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

/**
 * The notice itself. Short, because X's 280 is the tightest constraint and one
 * text going everywhere beats three that drift apart.
 */
export function buildEventNotice(input: {
  event: NoticeEvent;
  kind: NoticeKind;
  why: string;
  newDate?: string;
  /** A cancelled event coming back ("Back on"). */
  rescheduled?: boolean;
}): string {
  const { event, kind, why, newDate, rescheduled } = input;
  const title = event.title.trim();
  const was = event.date ? formatDate(event.date) : "";

  const headline =
    rescheduled && newDate
      ? `${title} is back on — ${formatDate(newDate)}.`
      : kind === "cancelled"
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
  event: NoticeEvent;
  kind: NoticeKind;
  why: string;
  newDate?: string;
  rescheduled?: boolean;
}): string {
  const { event, kind, why, newDate, rescheduled } = input;
  const word = rescheduled ? "BACK ON" : kind === "cancelled" ? "CANCELLED" : "POSTPONED";
  return [
    "Make a social graphic announcing this. 1080x1350 for Instagram, and a 1080x1080 square.",
    "",
    `Status: ${word}`,
    `Event name: ${event.title.trim()}`,
    `Original date: ${event.date ? formatDate(event.date) : "TBC"}`,
    `New date: ${kind === "postponed" ? (newDate ? formatDate(newDate) : "to be announced") : "n/a"}`,
    `Reason, one short line: ${why.trim()}`,
    "",
    "Dark near-black background (#1a1712). ONE word dominates the top half —",
    `${word} — heavy condensed uppercase, white, legible as a thumbnail.`,
    "Under it: event name, original date struck through, new date if there is one.",
    "Reason on one line at the bottom. A single orange accent, #f86000, used once.",
    "Leave the bottom-right corner clear for the logo.",
    "",
    "No stock storm photos, no lightning, no emoji, no exclamation marks. This is",
    "information, not a poster. Invent nothing that is not above.",
  ].join("\n");
}

