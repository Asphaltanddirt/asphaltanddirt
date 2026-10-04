import type { EventDetail } from "@/lib/events";
import { linkParts, SHAPE_CHAR, sideLabel, sidesFor, trailRatingFor, type RatingSide } from "@/lib/trailRating";
import { socialLinks } from "@/lib/social";
import { SITE_URL } from "@/lib/site";
import { requirementsFor } from "@/lib/vehicleRules";

const LOGO = "https://www.asphaltanddirt.com/images/branding/asphalt-and-dirt-horizontal.png";
const CREW_EMAIL = "crew@asphaltanddirt.com";
const ORANGE = "#f86000";

function esc(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Text typed into a Garage field, as email HTML. Gmail drops
 *  white-space:pre-wrap, which ran Full Details together as one block (Jose
 *  9/28). Blank lines split paragraphs, other line breaks stay as <br>, lines
 *  starting "* ", "- " or "• " become a list, and a short ALL-CAPS line
 *  becomes a bold heading. */
function textToHtml(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim());
  const out: string[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flushPara = () => {
    if (para.length) out.push(`<p style="margin:0 0 12px;">${para.map(esc).join("<br>")}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list.length) out.push(`<ul style="margin:0 0 12px;padding-left:20px;">${list.map((l) => `<li style="margin:0 0 4px;">${esc(l)}</li>`).join("")}</ul>`);
    list = [];
  };
  for (const line of lines) {
    const bullet = line.match(/^[*•-]\s+(.*)$/);
    const heading = line.length <= 40 && /[A-Z]/.test(line) && line === line.toUpperCase() && !/^\d/.test(line);
    if (!line) {
      flushPara();
      flushList();
    } else if (bullet) {
      flushPara();
      list.push(bullet[1]);
    } else if (heading) {
      flushPara();
      flushList();
      out.push(`<p style="margin:16px 0 6px;font-weight:bold;letter-spacing:1px;color:#1a1712;">${esc(line)}</p>`);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return out.join("").replace(/^<p style="margin:16px/, '<p style="margin:0');
}

function firstNameOf(fullName: string) {
  return (fullName || "").trim().split(/\s+/)[0] || "there";
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** Shared shell — matches the Road & Trail Crew welcome emails (lib/ambassadorWelcome.ts). */
function shell(previewText: string, bodyRows: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background-color:#f4f4f2;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${esc(previewText)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f2;padding:24px 0;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;">
      <tr>
        <td align="center" style="background-color:#000000;padding:32px 24px;">
          <img src="${LOGO}" width="220" alt="Asphalt &amp; Dirt" style="display:block;width:220px;max-width:100%;height:auto;border:0;">
        </td>
      </tr>
      ${bodyRows}
      <tr>
        <td align="center" style="padding:40px 32px 32px;">
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#948c81;">&copy; 2026 Asphalt &amp; Dirt &nbsp;&middot;&nbsp; <a href="mailto:${CREW_EMAIL}" style="color:#948c81;">${CREW_EMAIL}</a></p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

export interface EventEmail {
  subject: string;
  html: string;
}

/**
 * Sent immediately on RSVP. Repeats the public teaser, adds the private
 * Full Details (the whole reason to RSVP instead of just reading /events),
 * and — only for people who said they're not already in the FB group —
 * a nudge to join it too.
 */
/** Whole days from today (New York) to an event date. */
function daysUntil(date: string): number {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
  return Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
}

export function buildRsvpConfirmation(input: {
  rsvpName: string;
  alreadyInFbGroup: string;
  event: EventDetail;
  /** The optional list boxes they left ticked on the RSVP form. */
  joinedEventUpdates?: boolean;
  joinedNewsletter?: boolean;
}): EventEmail {
  const lateRsvp = daysUntil(input.event.date) < 3;
  const { rsvpName, alreadyInFbGroup, event, joinedEventUpdates = false, joinedNewsletter = false } = input;
  const first = esc(firstNameOf(rsvpName));
  const eventUrl = `${SITE_URL}/events/${event.slug}`;

  const fbNudge =
    alreadyInFbGroup === "Yes"
      ? ""
      : `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f2;border:1px solid #ded9d3;margin-top:20px;">
          <tr><td style="padding:18px 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#4a453f;">
            Most of the day-to-day chatter about rides like this happens in our private Facebook group — worth a join if you're on there.
            <br><a href="${socialLinks.facebookGroup}" style="color:${ORANGE};font-weight:bold;text-decoration:none;">Join The Group &rarr;</a>
          </td></tr>
        </table>`;

  // Say plainly which lists the RSVP also joined, so it's never a surprise
  // when the first newsletter or event update arrives.
  const joined = [
    joinedEventUpdates ? "<strong>Event Updates</strong> (new meetups as they're posted)" : "",
    joinedNewsletter ? "<strong>The Dirt Line</strong> (our weekly newsletter)" : "",
  ].filter(Boolean);
  const listsNote = joined.length
    ? `
        <p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#4a453f;">
          You also asked to join ${joined.join(" and ")}. Don't want ${joined.length > 1 ? "them" : "it"}? Every one of those emails has an unsubscribe link at the bottom.
        </p>`
    : "";

  const bodyRows = `
    <tr>
      <td align="center" style="padding:40px 32px 8px;">
        <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${ORANGE};">You're Confirmed</p>
        <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:900;letter-spacing:0.5px;color:#1a1712;">${esc(event.title)}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#4a453f;">
        <p style="margin:0 0 16px;">Hey ${first},</p>
        <p style="margin:0 0 16px;">You're on the list for <strong>${esc(event.title)}</strong> on ${esc(formatDate(event.date))}. Here's everything you need:</p>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 32px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f2;border:1px solid #ded9d3;">
          <tr><td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#4a453f;">${textToHtml(
            // Full Details waits for the D−3 plan email (Jose 9/28: keep the
            // first email short for newcomers). Late RSVPs (inside D−3) never
            // get a plan email, so theirs carries everything now.
            [event.meetupPoint, lateRsvp ? event.fullDetails : ""].filter(Boolean).join("\n\n") ||
              (event.generalArea ? `Area: ${event.generalArea}` : "Location to come."),
          )}</td></tr>
        </table>
        ${
          // No meetup spot yet is normal: it goes out 3 days before, in case
          // anything changes (Jose 9/25). Planning can't always wait that long.
          event.meetupPoint || lateRsvp
            ? ""
            : `<p style="margin:16px 0 0;">The exact meetup spot and full plan go out 3 days before the ride, in case anything changes. Need details sooner to plan travel or time off? Just reply to this email and we'll help.</p>`
        }
        ${trailRatingBlock(event)}${requirementsNote(event, eventUrl)}
        ${fbNudge}
        ${listsNote}
        <p style="margin:20px 0 0;font-size:13px;"><a href="${eventUrl}/calendar.ics" style="color:${ORANGE};font-weight:bold;text-decoration:none;">Add It To Your Calendar &rarr;</a></p>
        <p style="margin:8px 0 0;font-size:13px;"><a href="${eventUrl}" style="color:${ORANGE};font-weight:bold;text-decoration:none;">View This Event On The Site &rarr;</a></p>
      </td>
    </tr>
  `;

  return { subject: `You're confirmed: ${event.title}`, html: shell(`You're confirmed for ${event.title}`, bodyRows) };
}

/** The confirmation's short version of the Requirements (Jose 9/28: the full
 *  rules block in a first email "can scare off a newbie"). They already ticked
 *  the box on the form, so: one line + a link, plus any venue to-dos (waiver,
 *  pass) since those need doing before the day. The full set still rides in
 *  the D−3 plan email, for reading offline at the trailhead. */
function requirementsNote(event: EventDetail, eventUrl: string): string {
  const req = requirementsFor(event);
  if (!req) return "";
  const which = req.ruleSets.map((set) => set.title).join(" and ");
  const link = (url: string, label: string) =>
    `<a href="${esc(url)}" style="color:${ORANGE};font-weight:bold;text-decoration:none;margin-right:16px;">${label} &rarr;</a>`;
  const todos = req.venues
    .filter((v) => v.waiverUrl || v.passUrl)
    .map(
      (v) =>
        `<p style="margin:8px 0 0;"><strong>${esc(v.name)}:</strong> ${[
          v.waiverUrl ? link(v.waiverUrl, "Sign Their Waiver") : "",
          v.passUrl ? link(v.passUrl, "Get Your Pass") : "",
        ].join("")}</p>`,
    )
    .join("");
  return `<p style="margin:16px 0 0;">You agreed to this ride's requirements${which ? ` (${esc(which)})` : ""} when you RSVP'd. ${link(`${eventUrl}#requirements`, "Read Them Anytime")}</p>${todos}`;
}

/** The event's Requirements (lib/vehicleRules.ts): its own items, then the
 *  standard set for each Venue Type. The full set goes in the D−3 plan email
 *  so riders have them offline at the trailhead. Empty when the event has none. */
/** The A&D Ride Rating (lib/trailRating.ts): the shape, name and plain word,
 *  then that level's standard lines for the event's side (Asphalt, Dirt, or
 *  both for a Both event). Emails can't rely on color alone either, so the
 *  shape character and the plain word always travel with it. */
function trailRatingBlock(event: EventDetail): string {
  const r = trailRatingFor(event.trailRating);
  if (!r) return "";
  const sides: RatingSide[] = r.sameBothSides ? ["dirt"] : sidesFor(event.eventType);
  const linked = (text: string) =>
    linkParts(text)
      .map((p) => (p.href ? `<a href="${esc(p.href)}" style="color:${ORANGE};">${esc(p.text)}</a>` : esc(p.text)))
      .join("");
  const lists = sides
    .map((side) => {
      const l = r[side];
      const head = sides.length > 1 ? `<p style="margin:8px 0 2px;font-weight:bold;color:#1a1712;">${sideLabel(side)}</p>` : "";
      const items = [...l.lines.map(([k, v]) => `${esc(k)}: ${linked(v)}`), esc(l.note)];
      return `${head}<ul style="margin:0;padding-left:20px;">${items.map((i) => `<li style="margin:0 0 4px;">${i}</li>`).join("")}</ul>`;
    })
    .join("");
  return `<p style="margin:16px 0 4px;"><img src="${SITE_URL}${r.image.replace(/\.webp$/, ".png")}" width="96" height="96" alt="A&amp;D Ride Rating: ${esc(r.name)} (${esc(r.plain)})" style="display:block;border:0;" /></p><p style="margin:4px 0 4px;font-weight:bold;color:#1a1712;">A&amp;D Ride Rating: <span style="color:${r.hex};">${SHAPE_CHAR[r.shape]}</span> ${esc(r.name)} <span style="font-weight:normal;color:#7a746c;">(${esc(r.plain)})</span></p>${lists}<p style="margin:4px 0 0;font-size:13px;"><a href="${SITE_URL}/events#trail-rating" style="color:${ORANGE};text-decoration:none;">What the ratings mean &rarr;</a></p>`;
}

function requirementsBlock(event: EventDetail): string {
  const req = requirementsFor(event);
  if (!req) return "";
  const heading = (text: string, cite = "") =>
    `<p style="margin:12px 0 4px;font-weight:bold;color:#1a1712;">${esc(text)}${cite ? ` <span style="font-weight:normal;color:#7a746c;font-size:12px;">(${esc(cite)})</span>` : ""}</p>`;
  const list = (items: string[]) =>
    `<ul style="margin:0;padding-left:20px;">${items.map((r) => `<li style="margin:0 0 4px;">${esc(r)}</li>`).join("")}</ul>`;
  const own = req.items.length ? `${heading("For This Ride")}${list(req.items)}` : "";
  const link = (url: string, label: string) =>
    `<a href="${esc(url)}" style="color:${ORANGE};font-weight:bold;text-decoration:none;margin-right:16px;">${label} &rarr;</a>`;
  const venues = req.venues
    .map(
      (v) =>
        `${heading(v.name)}${v.riderNotes.length ? list(v.riderNotes) : ""}${
          v.waiverUrl || v.passUrl || v.rulesUrl
            ? `<p style="margin:6px 0 0;">${[
                v.waiverUrl ? link(v.waiverUrl, "Sign Their Waiver") : "",
                v.passUrl ? link(v.passUrl, "Get Your Pass") : "",
                v.rulesUrl ? link(v.rulesUrl, "Park Rules") : "",
              ].join("")}</p>`
            : ""
        }`,
    )
    .join("");
  const rules = req.ruleSets
    .map(
      (set) =>
        `${heading(set.title)}<p style="margin:0 0 4px;">${esc(set.intro)}</p>${set.groups
          .map((g) => `${heading(g.heading, g.cite)}${list(g.rules)}`)
          .join("")}${
          set.link
            ? `<p style="margin:12px 0 0;"><a href="${set.link.url}" style="color:${ORANGE};font-weight:bold;text-decoration:none;">${esc(set.link.label)} &rarr;</a></p>`
            : ""
        }`,
    )
    .join("");
  return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #ded9d3;border-left:3px solid ${ORANGE};margin-top:20px;">
          <tr><td style="padding:18px 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#4a453f;">
            <p style="margin:0;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${ORANGE};">Requirements</p>${own}${venues}${rules}
          </td></tr>
        </table>`;
}

export type EventUpdateKind = "cancelled" | "postponed" | "update";

/**
 * An update to everyone who RSVP'd — cancelled, postponed, or anything else.
 *
 * THE SYSTEM WRITES THE SCAFFOLDING; THE SENDER WRITES ONLY THE WHY.
 * (Jose, 2026-09-23: "I want the system to write 90% of the email, we only add
 * the why.") What happened and what happens next are the same every time and
 * are exactly what gets forgotten at 6am in a storm — so they are not left to
 * whoever is typing.
 *
 * The waiver line goes in the CANCELLED email too, not just the postponed one.
 * Telling somebody their signature is still on file is also telling them you
 * intend to come back, which is the thing a cancellation otherwise fails to
 * say.
 */
export function buildRsvpUpdate(input: {
  recipientName: string;
  event: EventDetail;
  message: string;
  kind?: EventUpdateKind;
  /** Postponements only: the new date, ISO. */
  newDate?: string;
  /** Postponements only: this person's own re-confirm link. */
  confirmUrl?: string;
  /** The notice graphic, attached inline under this content id. The email
   *  carries the same image as the socials (Jose, 2026-09-24). */
  imageCid?: string;
  /** A cancelled event coming back ("Back on"). */
  rescheduled?: boolean;
}): EventEmail {
  const { recipientName, event, message, kind = "update", newDate, confirmUrl, imageCid, rescheduled } = input;
  const first = esc(firstNameOf(recipientName));
  const was = event.date ? formatDate(event.date) : "";

  const eyebrow = rescheduled
    ? "Back On"
    : kind === "cancelled" ? "Event Cancelled" : kind === "postponed" ? "Event Postponed" : "Event Update";

  // What happened, in one line, before the reason.
  const opening =
    rescheduled && newDate
      ? `It's back on — <strong>${esc(formatDate(newDate))}</strong>.`
      : kind === "cancelled"
      ? `${was ? `<strong>${esc(was)}</strong> is off.` : "This one is off."}`
      : kind === "postponed"
        ? newDate
          ? `${was ? `<strong>${esc(was)}</strong>` : "This one"} has moved to <strong>${esc(formatDate(newDate))}</strong>.`
          : `${was ? `<strong>${esc(was)}</strong>` : "This one"} has been postponed. We'll confirm the new date shortly.`
        : "";

  // What happens next. The waiver line is the point of it.
  const closing =
    kind === "cancelled"
      ? "Your signed waiver stays on file. If we put this back on the calendar you won't have to fill any of it in again — we'll just email and ask whether the new date works for you."
      : kind === "postponed"
        ? confirmUrl
          ? "Your signed waiver stays on file, so there's nothing to fill in again. We just need to know whether the new day works:"
          : "Your signed waiver stays on file, so there's nothing to re-sign. We do need to know whether the new date works for you — just reply to this email either way."
        : "";

  // One tap, straight from the email. Three answers, no form, no login — their
  // waiver is already signed and asking for more would be asking them to
  // register twice for one event.
  const confirmButton =
    kind === "postponed" && confirmUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 0;">
          <tr><td align="center" style="background-color:${ORANGE};">
            <a href="${confirmUrl}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#ffffff;text-decoration:none;">Does the new date work?</a>
          </td></tr>
        </table>
        <p style="margin:10px 0 0;font-size:13px;color:#7a736a;">Yes, no, or not sure — one tap, nothing to fill in.</p>`
      : "";

  const para = (html: string, gap = "0 0 16px") =>
    html ? `<p style="margin:${gap};">${html}</p>` : "";

  const bodyRows = `
    <tr>
      <td align="center" style="padding:40px 32px 8px;">
        <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${ORANGE};">${eyebrow}</p>
        <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;letter-spacing:0.5px;color:#1a1712;">${esc(event.title.trim())}</h1>
      </td>
    </tr>
    ${
      imageCid
        ? `<tr><td align="center" style="padding:20px 32px 0;"><img src="cid:${imageCid}" alt="${esc(`${eyebrow}: ${event.title.trim()}`)}" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;"></td></tr>`
        : ""
    }
    <tr>
      <td style="padding:16px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#4a453f;">
        ${para(`Hey ${first},`)}
        ${para(opening)}
        ${textToHtml(message)}
        ${para(closing, confirmButton ? "0 0 4px" : "0")}
        ${confirmButton}
      </td>
    </tr>
  `;

  const subject = rescheduled
    ? `Back on: ${event.title.trim()}`
    : kind === "cancelled"
      ? `Cancelled: ${event.title.trim()}`
      : kind === "postponed"
        ? `Postponed: ${event.title.trim()}`
        : `Update: ${event.title.trim()}`;

  return { subject, html: shell(`${eyebrow} — ${event.title.trim()}`, bodyRows) };
}

/** The Tailgate day-before email: the same "See you tomorrow" email as events
 *  without Tailgate, plus the group-chat sign-up (Jose 9/28: "can't 4 and 5 be
 *  combined"). Sent by the comms-reminder cron to every RSVP, plus one team
 *  copy (no release link) to paste into the FB group. Links to the waiver
 *  page, not the chat: the chat link is personal, emailed after signing. */
export function buildWaiverInvite(input: {
  recipientName: string;
  event: EventDetail;
  waiverUrl: string;
  /** This person's signed "release your spot" link. Blank on the team copy. */
  releaseUrl?: string;
}): EventEmail {
  const built = buildDayBeforeReminder(input);
  return { ...built, subject: `Tomorrow: ${input.event.title.trim()} — sign up for the group chat` };
}

/** Sent immediately after someone signs the waiver — their actual, personal
 *  comms link (the real access credential; the waiver page URL isn't). */
export function buildPersonalCommsLink(input: { recipientName: string; event: EventDetail; commsUrl: string }): EventEmail {
  const { recipientName, event, commsUrl } = input;
  const first = esc(firstNameOf(recipientName));

  const bodyRows = `
    <tr>
      <td align="center" style="padding:40px 32px 8px;">
        <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${ORANGE};">You're In</p>
        <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;letter-spacing:0.5px;color:#1a1712;">${esc(event.title)}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#4a453f;">
        <p style="margin:0 0 16px;">Hey ${first},</p>
        <p style="margin:0 0 16px;">Here&#39;s your personal link to the group chat for <strong>${esc(event.title)}</strong>. We&#39;ll check everyone in at Staging before we roll out, and that&#39;s when the group chat opens up &mdash; until then this connects you straight to staff. Once you&#39;re in, you can post photos and videos from the day right in the chat.</p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:8px 32px 24px;">
        <a href="${commsUrl}" style="display:inline-block;background-color:${ORANGE};color:#1a1712;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;padding:14px 28px;">Open Your Chat Link &rarr;</a>
        <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#948c81;">This link is yours alone &mdash; please don&#39;t forward it. Save this email so you can find it on event day.</p>
      </td>
    </tr>
  `;

  return { subject: `Your chat link: ${event.title}`, html: shell(`Your personal chat link for ${event.title}`, bodyRows) };
}

/** Sent when the 48-hour chat window closes — thanks + a nudge toward the
 *  event's Recap & Gallery page (lib/events.ts) to view or add photos. */
/** Tailgate's thank-you email: goes out 3 hours after staff taps Trail over
 *  (or at the end of the 48-hour window if nobody did). Its job is getting
 *  photos and video in, so the upload link leads and it's clear it never expires.
 *  It also carries the attendees' field note (#11, Jose 9/25): a "Tell us how
 *  it went" link to /events/<slug>/feedback, stored in Event Feedback.
 *  Tailgate events send it 3 h after Trail over to Tailgate sign-ups; events
 *  without Tailgate send it to RSVPs the morning after (lib/attendeeTrack.ts). The crew's field note is
 *  the optional "Anything worth saying about the day?" box on Garage Upload. */
export function buildCommsClosing(input: {
  recipientName: string;
  event: EventDetail;
  recapUrl: string;
  feedbackUrl: string;
  /** Rally Rewards (once RALLY_LIVE): the rider's "Rank / Points" line, or
   *  the "I was there" link for events without Tailgate. */
  rally?: { line?: string; wasThereUrl?: string };
}): EventEmail {
  const { recipientName, event, recapUrl, feedbackUrl, rally } = input;
  const first = esc(firstNameOf(recipientName));

  const bodyRows = `
    <tr>
      <td align="center" style="padding:40px 32px 8px;">
        <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${ORANGE};">Thanks For Riding With Us</p>
        <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;letter-spacing:0.5px;color:#1a1712;">${esc(event.title)}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#4a453f;">
        <p style="margin:0 0 16px;">Hey ${first},</p>
        <p style="margin:0 0 16px;">Thanks for coming out to <strong>${esc(event.title)}</strong>. Got photos or video from the day? Send them in full quality. Big video files are fine.</p>
        <p style="margin:0 0 16px;"><strong>How:</strong> tap the button, pick your photos and videos, add your name, and hit send. We look at everything, and the best shots end up in the event gallery.</p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:8px 32px 8px;">
        <a href="${recapUrl}" style="display:inline-block;background-color:${ORANGE};color:#1a1712;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;padding:14px 28px;">Upload Photos &amp; Video &rarr;</a>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:8px 32px 24px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#7a746c;">
        This link doesn&rsquo;t expire. Come back any time you find more.
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#4a453f;">
        <p style="margin:0 0 12px;"><strong>How was it?</strong> Two quick questions: the good, the muddy, and anything we should change.</p>
        <p style="margin:0;"><a href="${feedbackUrl}" style="color:${ORANGE};font-weight:bold;text-decoration:none;">Tell Us How It Went &rarr;</a></p>
      </td>
    </tr>
    ${rallyRow(rally)}
  `;

  return { subject: `Thanks for riding: send us your photos from ${event.title}`, html: shell(`Send your photos and video from ${event.title}`, bodyRows) };
}

/** Rally Rewards in the thank-you email: one short line, no new email
 *  (Jose 10/4). Empty until there's something to say. */
function rallyRow(rally?: { line?: string; wasThereUrl?: string }): string {
  if (!rally || (!rally.line && !rally.wasThereUrl)) return "";
  const body = rally.line
    ? `<strong>Rally Rewards:</strong> ${esc(rally.line)} &middot; <a href="${SITE_URL}/rally" style="color:${ORANGE};font-weight:bold;text-decoration:none;">See your points &rarr;</a>`
    : `<strong>Rally Rewards:</strong> were you there? <a href="${rally.wasThereUrl}" style="color:${ORANGE};font-weight:bold;text-decoration:none;">Tap I was there &rarr;</a> and the points go on your account.`;
  return `
    <tr>
      <td style="padding:0 32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#4a453f;border-top:1px solid #eee;">
        <p style="margin:16px 0 0;">${body}</p>
      </td>
    </tr>`;
}

/** "Can't make it?" with the person's own signed link (lib/rsvpRelease.ts).
 *  Empty when there's no link to give. */
function releaseRow(releaseUrl?: string): string {
  if (!releaseUrl) return "";
  return `
    <tr>
      <td align="center" style="padding:0 32px 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#4a453f;">
        Can&#39;t make it after all? <a href="${releaseUrl}" style="color:${ORANGE};font-weight:bold;text-decoration:none;">Release your spot &rarr;</a><br>
        <span style="font-size:13px;color:#948c81;">One tap. It frees the spot for someone else and tells us not to wait for you.</span>
      </td>
    </tr>`;
}

/** The times from the event's public At A Glance lines (meet, roll-out, start). */
function glanceTimes(event: EventDetail): string {
  return event.atAGlance
    .filter((f) => /time|meet|roll|start/i.test(f.label))
    .map((f) => `${f.label}: ${f.value}`)
    .join("\n");
}

/**
 * The D−3 plan email (attendee track, event promo countdown 2026-09-24).
 *
 * Once someone has RSVP'd we stop selling to them. This one is logistics only:
 * where and when, what to bring, a weather note, the waivers, and who they're
 * bringing. Site RSVPs only; Facebook "Going" never reaches us.
 *
 * The weather line is a plan, not a forecast: we have no forecast feed, and a
 * stale one in an email is worse than telling people how they'll hear.
 */
export function buildPlanEmail(input: { recipientName: string; event: EventDetail; hasTailgate: boolean }): EventEmail {
  const { recipientName, event, hasTailgate } = input;
  const first = esc(firstNameOf(recipientName));
  const eventUrl = `${SITE_URL}/events/${event.slug}`;
  const where = [event.meetupPoint, glanceTimes(event)].filter(Boolean).join("\n\n") ||
    `${event.generalArea ? `${event.generalArea}. ` : ""}The exact spot is coming by email shortly.`;
  const bring = event.atAGlance.filter((f) => /bring|gear|pack|need/i.test(f.label)).map((f) => f.value);

  const box = (html: string) => `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f2;border:1px solid #ded9d3;margin-top:16px;">
          <tr><td style="padding:18px 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#4a453f;">${html}</td></tr>
        </table>`;
  const label = (text: string) =>
    `<p style="margin:0 0 6px;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${ORANGE};">${text}</p>`;

  const bodyRows = `
    <tr>
      <td align="center" style="padding:40px 32px 8px;">
        <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${ORANGE};">The Plan</p>
        <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;letter-spacing:0.5px;color:#1a1712;">${esc(event.title.trim())}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#4a453f;">
        <p style="margin:0 0 8px;">Hey ${first},</p>
        <p style="margin:0;"><strong>${esc(event.title.trim())}</strong> is ${esc(formatDate(event.date))}. Here&#39;s the plan.</p>
        ${box(`${label("Where And When")}${textToHtml(where)}`)}
        ${event.fullDetails ? box(`${label("The Full Rundown")}${textToHtml(event.fullDetails)}`) : ""}
        ${bring.length ? box(`${label("Bring")}<ul style="margin:0;padding-left:20px;">${bring.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`) : ""}
        ${trailRatingBlock(event)}${requirementsBlock(event)}
        ${box(`${label("Weather")}Check the forecast${event.generalArea ? ` for ${esc(event.generalArea)}` : ""} the night before. If weather or trail conditions call it off, you&#39;ll get an email from us and we&#39;ll post it on our socials, so check before you leave.`)}
        ${box(`${label("Waiver")}${
          hasTailgate
            ? "Your waiver link comes by email the evening before. It also gets you into the group chat for the day, so keep an eye out for it."
            : requirementsFor(event)?.venues.some((v) => v.waiverUrl)
              ? "The venue has its own waiver, linked in the requirements above. Sign it before you leave home; there&#39;s rarely signal at the trailhead."
              : "Nothing to sign for this one. Just show up."
        }`)}
        ${box(`${label("Who&#39;s Riding With You?")}Bringing a passenger or a second rig? Every adult needs their own RSVP, so send them the event page: <a href="${eventUrl}" style="color:${ORANGE};font-weight:bold;text-decoration:none;">${esc(eventUrl.replace(/^https?:\/\//, ""))}</a>. Or just reply and tell us who&#39;s coming with you.`)}
      </td>
    </tr>
  `;

  return { subject: `The plan for ${event.title.trim()}`, html: shell(`Where, when and what to bring for ${event.title.trim()}`, bodyRows) };
}

/**
 * The day-before email, one design for every event. Events with Tailgate get
 * the group-chat sign-up in it (buildWaiverInvite, from the comms-reminder
 * cron); events without get it from the attendee track. Either way it carries
 * "release your spot", and nobody gets two emails about tomorrow. Rules are a
 * link here (Jose 9/28): the full set is in the D−3 plan email.
 */
export function buildDayBeforeReminder(input: { recipientName: string; event: EventDetail; releaseUrl?: string; waiverUrl?: string }): EventEmail {
  const { recipientName, event, releaseUrl, waiverUrl } = input;
  const first = esc(firstNameOf(recipientName));
  const eventUrl = `${SITE_URL}/events/${event.slug}`;
  const where = [event.meetupPoint, glanceTimes(event)].filter(Boolean).join("\n\n");

  const tailgate = waiverUrl
    ? `
    <tr>
      <td style="padding:0 32px 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#4a453f;">
        <p style="margin:0;">We&#39;re running a live group chat for the day &mdash; no app, no login. Quick waiver first, then you&#39;ll get your own link to the chat:</p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:8px 32px 24px;">
        <a href="${waiverUrl}" style="display:inline-block;background-color:${ORANGE};color:#1a1712;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;padding:14px 28px;">Sign Up For The Group Chat &rarr;</a>
        <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#948c81;">This link is just for you &mdash; please don&#39;t post it publicly or forward it to anyone not attending.</p>
      </td>
    </tr>`
    : "";

  const bodyRows = `
    <tr>
      <td align="center" style="padding:40px 32px 8px;">
        <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${ORANGE};">See You Tomorrow</p>
        <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;letter-spacing:0.5px;color:#1a1712;">${esc(event.title.trim())}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#4a453f;">
        <p style="margin:0 0 16px;">Hey ${first},</p>
        <p style="margin:0 0 16px;"><strong>${esc(event.title.trim())}</strong> is tomorrow, ${esc(formatDate(event.date))}.</p>
        ${where ? textToHtml(where) : ""}
        ${trailRatingBlock(event)}${requirementsNote(event, eventUrl)}
      </td>
    </tr>
    ${tailgate}
    ${releaseRow(releaseUrl)}
  `;

  return { subject: `Tomorrow: ${event.title.trim()}`, html: shell(`See you tomorrow at ${event.title.trim()}`, bodyRows) };
}
