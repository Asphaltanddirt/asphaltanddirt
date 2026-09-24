import { NextRequest, NextResponse } from "next/server";
import { getSession, canSeeOwnerOnly } from "@/lib/garageAuth";
import { getEventBySlug } from "@/lib/events";
import { listRecords } from "@/lib/airtable";
import { getEditableEvent, listAllEvents, updateEvent } from "@/lib/garageEventEditor";
import { buildRsvpUpdate, type EventUpdateKind } from "@/lib/eventEmails";
import { postEventNotice, sendEventNotice, type NoticeResult } from "@/lib/eventNotice";
import { notifyFailure } from "@/lib/notify";
import { sendEmail } from "@/lib/resendEmail";
import { reconfirmLink } from "@/lib/rsvpReconfirm";

export const maxDuration = 60;

// Vercel caps a request body around 4.5 MB.
const MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_CID = "event-notice";

/**
 * Something changed about an event. ONE screen, ONE send (Jose, 2026-09-24:
 * "all one screen, email gets image too now").
 *
 * Replaces the separate "Call it off" and "Tell everyone who RSVP'd" panels,
 * which did overlapping halves of the same job.
 *
 *  - kind "update": email the confirmed RSVPs. Nothing else changes.
 *  - kind "cancelled" / "postponed", in one request:
 *      1. Status → Cancelled (or the new date). updateEvent also holds any
 *         queued promo cards and moves the comms row.
 *      2. Emails every confirmed RSVP, text + the graphic inline.
 *      3. Posts the notice to X, Threads, the Facebook Page and Instagram —
 *         the same text and image everywhere. The photo is REQUIRED for these
 *         two kinds (Instagram can't post without one).
 *      4. Hands back the Facebook group text — no API for Groups.
 *
 * `mode: "test"` sends one copy of the email to the sender and does nothing
 * else — no status change, no cards.
 *
 * Owner only. The live send has no undo.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const slug = String(form.get("slug") || "").trim();
  const why = String(form.get("why") || "").trim();
  const rawKind = String(form.get("kind") || "");
  const kind: EventUpdateKind = rawKind === "postponed" || rawKind === "update" ? rawKind : "cancelled";
  const rawDate = String(form.get("newDate") || "");
  const newDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : undefined;
  const test = form.get("mode") !== "live";
  if (!slug || !why) return NextResponse.json({ error: "Say why." }, { status: 400 });
  if (kind === "postponed" && !newDate) return NextResponse.json({ error: "Pick the new date." }, { status: 400 });

  const file = form.get("file");
  let image: { filename: string; contentType: string; base64: string } | null = null;
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Images only." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "That image is over 4 MB." }, { status: 400 });
    image = {
      filename: file.name || "notice.jpg",
      contentType: file.type,
      base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
    };
  }
  const attachments = image
    ? [{ filename: image.filename, content: image.base64, contentType: image.contentType, contentId: IMAGE_CID }]
    : undefined;
  const imageCid = image ? IMAGE_CID : undefined;

  // Cancel and postpone need the photo — Instagram can't post without one, and
  // Jose made it required rather than let one channel fall behind (2026-09-24).
  // The test email can go without it.
  if (!test && kind !== "update" && !image) {
    return NextResponse.json({ error: "Add the photo first — Instagram can't post without it." }, { status: 400 });
  }

  const event = await getEventBySlug(slug, { includeCrewOnly: true, includeCancelled: true }).catch(() => null);
  if (!event) return NextResponse.json({ error: "Couldn't find that event." }, { status: 404 });

  // The editor's copy of the event: its status says whether a postpone is
  // really a cancelled event coming back ("Back on").
  const row = (await listAllEvents().catch(() => [])).find((e) => e.slug === slug);
  const editable = row ? await getEditableEvent(row.id).catch(() => null) : null;
  const rescheduled = kind === "postponed" && editable?.status === "Cancelled";

  // The test: one email, to whoever pressed it. Nothing else moves.
  if (test) {
    try {
      const built = buildRsvpUpdate({ recipientName: session.name || "You", event, message: why, kind, newDate, imageCid, rescheduled });
      await sendEmail({ to: session.email, subject: `[Test] ${built.subject}`, html: built.html, attachments });
      return NextResponse.json({ status: "ok", mode: "test", sentTo: session.email });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "The test didn't send." }, { status: 500 });
    }
  }

  const steps: Record<string, string> = {};

  // 1. The switch — cancel and postpone only. updateEvent already holds the
  //    promos and moves the comms row, so this one call covers all three.
  if (kind !== "update") {

  try {
    if (!editable) throw new Error("Couldn't load the event to change it.");
    await updateEvent(
      editable.id,
      {
        ...editable,
        // Postponing a CANCELLED event is how it comes back: a cancel is often
        // called before there's a new date (Jose, 2026-09-24: "keep a path open
        // ... later on, we could decide to open it up and reschedule").
        status: kind === "cancelled" ? "Cancelled" : editable.status === "Cancelled" ? "Published" : editable.status,
        date: newDate || editable.date,
      },
      slug,
    );
    steps.event = kind === "cancelled" ? "Cancelled." : rescheduled ? `Back on, ${newDate}.` : `Moved to ${newDate}.`;
  } catch (err) {
    steps.event = `Couldn't change the event: ${err instanceof Error ? err.message : "unknown"}`;
  }
  }

  // 2. The email. Sent one at a time so one bad address can't stop the rest.
  let emailed = 0;
  let emailFailed = 0;
  try {
    // Record ids, not just addresses — a postponement needs each person's own
    // signed re-confirm link, and that link is keyed on their RSVP row.
    const rows = await listRecords("RSVPs", `{Status} = 'Confirmed'`, {
      baseId: process.env.AIRTABLE_EVENTS_BASE_ID || "app5LS6dvcTKdxGqr",
    });
    const recipients = rows
      .filter((r) => ((r.fields.Event as string[]) || []).includes(event.id))
      .map((r) => ({ id: r.id, name: String(r.fields.Name || ""), email: String(r.fields.Email || "") }))
      .filter((r) => r.email);

    for (const r of recipients) {
      try {
        const built = buildRsvpUpdate({
          recipientName: r.name,
          event,
          message: why,
          kind,
          newDate,
          confirmUrl: kind === "postponed" && newDate ? reconfirmLink(slug, r.id, newDate) : undefined,
          imageCid,
          rescheduled,
        });
        await sendEmail({ to: r.email, subject: built.subject, html: built.html, attachments });
        emailed++;
      } catch {
        emailFailed++;
      }
    }
    steps.email = `${emailed} emailed${emailFailed ? `, ${emailFailed} failed` : ""}.`;
  } catch (err) {
    steps.email = `Couldn't email: ${err instanceof Error ? err.message : "unknown"}`;
  }

  if (kind === "update") return NextResponse.json({ status: "ok", mode: "live", steps, emailed, text: "", cardIds: [], results: [] });

  // 3. The notice, posted now: the same text + image on every channel and in
  //    the email ("the text and the photo are repetitive, in case the image is
  //    skipped"). The photo is required up front, so nothing waits on it.
  const notice = await postEventNotice({ event, kind, why, newDate, rescheduled, by: session.name || session.email }).catch((err) => {
    console.error("notice cards failed", err);
    return null;
  });

  let results: NoticeResult[] = [];
  if (!notice) {
    steps.social = "Couldn't prepare the notice.";
  } else if (notice.cardIds.length && image) {
    results = await sendEventNotice({ cardIds: notice.cardIds, image }).catch((err) => {
      console.error("notice send failed", err);
      return notice.cardIds.map(() => ({ platform: "notice", posted: false, error: "Couldn't send." }));
    });
    const ok = results.filter((r) => r.posted).map((r) => r.platform);
    const missed = results.filter((r) => !r.posted);
    // The master switch being off isn't a failure — say so once, plainly.
    const dry = missed.filter((m) => /^Dry run/.test(m.error || ""));
    const failed = missed.filter((m) => !/^Dry run/.test(m.error || ""));
    steps.social = [
      ok.length ? `Posted: ${ok.join(", ")}.` : "",
      dry.length ? `Dry run — auto-posting is off, so ${dry.map((m) => m.platform).join(", ")} didn't send.` : "",
      failed.length ? `Finish by hand: ${failed.map((m) => `${m.platform} (${m.error})`).join("; ")}.` : "",
    ]
      .filter(Boolean)
      .join(" ");
    // By now the phone is probably in a pocket; a half-posted cancellation is
    // worse than knowing you have to finish it by hand.
    if (failed.length) {
      await notifyFailure(
        { id: notice.cardIds[0], name: "Cancellation notice", platform: failed.map((m) => m.platform).join(" · ") },
        "the notice didn't post everywhere — finish it by hand",
      ).catch(() => {});
    }
  } else {
    steps.social = `Couldn't prepare the notice. ${notice.errors.join("; ")}`;
  }

  return NextResponse.json({
    status: "ok",
    mode: "live",
    steps,
    emailed,
    text: notice?.text || "",
    results,
  });
}
