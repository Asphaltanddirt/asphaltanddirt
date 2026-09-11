import type { EventDetail } from "@/lib/events";
import { socialLinks } from "@/lib/social";
import { SITE_URL } from "@/lib/site";

const LOGO = "https://www.asphaltanddirt.com/images/branding/asphalt-and-dirt-horizontal.png";
const CREW_EMAIL = "crew@asphaltanddirt.com";
const ORANGE = "#f86000";

function esc(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
export function buildRsvpConfirmation(input: { rsvpName: string; alreadyInFbGroup: string; event: EventDetail }): EventEmail {
  const { rsvpName, alreadyInFbGroup, event } = input;
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
          <tr><td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#4a453f;white-space:pre-wrap;">${esc(
            [event.meetupPoint, event.fullDetails].filter(Boolean).join("\n\n") ||
              `${event.generalArea ? `Area: ${event.generalArea}\n\n` : ""}We'll follow up with exact meetup details as it gets closer.`,
          )}</td></tr>
        </table>
        ${fbNudge}
        <p style="margin:20px 0 0;font-size:13px;"><a href="${eventUrl}" style="color:${ORANGE};font-weight:bold;text-decoration:none;">View This Event On The Site &rarr;</a></p>
      </td>
    </tr>
  `;

  return { subject: `You're confirmed: ${event.title}`, html: shell(`You're confirmed for ${event.title}`, bodyRows) };
}

/** Admin-triggered update to everyone who RSVP'd to one event — a moved
 *  meetup spot, a cancellation, "bring tire chains," etc. */
export function buildRsvpUpdate(input: { recipientName: string; event: EventDetail; message: string }): EventEmail {
  const { recipientName, event, message } = input;
  const first = esc(firstNameOf(recipientName));

  const bodyRows = `
    <tr>
      <td align="center" style="padding:40px 32px 8px;">
        <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${ORANGE};">Event Update</p>
        <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;letter-spacing:0.5px;color:#1a1712;">${esc(event.title)}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#4a453f;">
        <p style="margin:0 0 16px;">Hey ${first},</p>
        <p style="margin:0;white-space:pre-wrap;">${esc(message)}</p>
      </td>
    </tr>
  `;

  return { subject: `Update: ${event.title}`, html: shell(`An update about ${event.title}`, bodyRows) };
}
