import { NextRequest, NextResponse } from "next/server";
import { getSession, canSeeOwnerOnly } from "@/lib/garageAuth";
import { getEventBySlug } from "@/lib/events";
import { listRecords } from "@/lib/airtable";
import { getEditableEvent, listAllEvents, updateEvent } from "@/lib/garageEventEditor";
import { buildRsvpUpdate, type EventUpdateKind } from "@/lib/eventEmails";
import { postEventNotice } from "@/lib/eventNotice";
import { sendEmail } from "@/lib/resendEmail";
import { reconfirmLink } from "@/lib/rsvpReconfirm";

export const maxDuration = 60;

/**
 * Call off an event. One flip.
 *
 * Jose, 2026-09-23: "flip switch, email goes out, prompt is sent to me, I
 * build image, upload it and you take it where you can and I take it the rest
 * of the way. Should take 5 minutes."
 *
 * So this does everything that does not need a person, in one request:
 *
 *   1. Status → Cancelled (or the new date, for a postponement). That alone
 *      holds any queued promo cards and moves the comms row, via updateEvent.
 *   2. Emails every confirmed RSVP, with the reason. This does NOT wait.
 *   3. Prepares one notice card per channel — X, Threads, Facebook Page and
 *      Instagram — all carrying the same caption and all waiting on the image.
 *   4. Hands back the Robin brief, already filled in.
 *
 * What is left for a person: make the image, upload it once (all four then go
 * out together), and post in the Facebook group. Nothing else.
 *
 * Owner only. Nothing here is undoable by tapping it again.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });

  let body: { slug?: string; kind?: string; why?: string; newDate?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const slug = (body.slug || "").trim();
  const why = (body.why || "").trim();
  const kind: EventUpdateKind = body.kind === "postponed" ? "postponed" : "cancelled";
  const newDate = /^\d{4}-\d{2}-\d{2}$/.test(body.newDate || "") ? body.newDate : undefined;
  if (!slug || !why) return NextResponse.json({ error: "Say why." }, { status: 400 });
  if (kind === "postponed" && !newDate) return NextResponse.json({ error: "Pick the new date." }, { status: 400 });

  const event = await getEventBySlug(slug, { includeCrewOnly: true }).catch(() => null);
  if (!event) return NextResponse.json({ error: "Couldn't find that event." }, { status: 404 });

  const steps: Record<string, string> = {};

  // 1. The switch. updateEvent already holds the promos and moves the comms
  //    row, so this one call covers all three.
  try {
    const all = await listAllEvents();
    const row = all.find((e) => e.slug === slug);
    const editable = row ? await getEditableEvent(row.id) : null;
    if (!editable) throw new Error("Couldn't load the event to change it.");
    await updateEvent(
      editable.id,
      { ...editable, status: kind === "cancelled" ? "Cancelled" : editable.status, date: newDate || editable.date },
      slug,
    );
    steps.event = kind === "cancelled" ? "Cancelled." : `Moved to ${newDate}.`;
  } catch (err) {
    steps.event = `Couldn't change the event: ${err instanceof Error ? err.message : "unknown"}`;
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
        });
        await sendEmail({ to: r.email, subject: built.subject, html: built.html });
        emailed++;
      } catch {
        emailFailed++;
      }
    }
    steps.email = `${emailed} emailed${emailFailed ? `, ${emailFailed} failed` : ""}.`;
  } catch (err) {
    steps.email = `Couldn't email: ${err instanceof Error ? err.message : "unknown"}`;
  }

  // 3 + 4. The notice cards and the graphic brief. NOTHING SOCIAL SENDS YET.
  // Every channel carries the same image and they all wait for it — Jose's
  // reason, which is better than the consistency argument: "plain text can be
  // missed in scrolling, an image will not be so easy to miss." A cancellation
  // that gets scrolled past has failed, however fast it went out.
  //
  // The email does not wait, so anyone who gave us an address hears now.
  const notice = await postEventNotice({ event, kind, why, newDate, by: session.name || session.email }).catch((err) => {
    console.error("notice cards failed", err);
    return null;
  });
  steps.social = notice
    ? `${notice.cardIds.length} notice${notice.cardIds.length === 1 ? "" : "s"} ready — waiting on the graphic.${
        notice.errors.length ? ` ${notice.errors.join("; ")}` : ""
      }`
    : "Couldn't prepare the notice.";

  return NextResponse.json({
    status: "ok",
    steps,
    text: notice?.text || "",
    prompt: notice?.prompt || "",
    cardIds: notice?.cardIds || [],
    emailed,
  });
}
