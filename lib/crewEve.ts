import { getCrewEvents, type EventSummary } from "@/lib/events";
import { listGarageUsers, type GarageUser } from "@/lib/garageAuth";
import { getEventResponses } from "@/lib/garageEvents";
import { footageStock } from "@/lib/garagePlan";
import { todayNY } from "@/lib/garageTasks";
import { getMediaLibrary, type MediaRow } from "@/lib/mediaLibrary";
import { alreadySent, ledgerKey, record } from "@/lib/notify";
import { sendEmail } from "@/lib/resendEmail";
import { SITE_URL } from "@/lib/site";

/**
 * The night-before email (Jose 9/25). Two versions of one email:
 *
 *  - Crew (Christina, Dan, Jack, anyone marked Going in the Garage): a thank
 *    you, three light tips and a heads-up that Tailgate opens that night
 *    (joining in is optional). They're volunteers who own their own gear, so
 *    it's a wish, never an instruction: no settings lecture, no quotas, no
 *    rules. Phone footage is exactly right.
 *  - Owners (Jose + Anthony): the same, plus the real shot list, what the
 *    Library is short on, and the posting reminders. Only owners ever see it;
 *    it's also on Garage → Shot list.
 *
 * Sent from 6 PM Eastern the day before; deduped per person per event through
 * the Notifications ledger, so a re-run never sends twice.
 */

const SEND_FROM_HOUR = 18;

export interface Shot {
  title: string;
  how: string;
}

/** The owners' list. Plain reminders for the two people running the day. */
export const OWNER_SHOTS: Shot[] = [
  { title: "The lineup", how: "Every rig at the meetup before roll-out, one slow pass." },
  { title: "Rolling out", how: "From the side as the group leaves." },
  { title: "Each obstacle, start to finish", how: "One take per mud hole or crossing, first rig in to last rig out." },
  { title: "A recovery", how: "If one happens: strap on, the pull, the reaction. Ask the driver before it's posted." },
  { title: "From the seat", how: "A minute or two of dash or passenger view." },
  { title: "Details", how: "Muddy tires, fenders, lights. A few seconds each; they fill gaps in every edit." },
  { title: "One line on camera", how: "Someone saying why they came out. Promo gold." },
  { title: "The group at the end", how: "Everyone with the dirty rigs. The recap thumbnail." },
];

export const NIGHT_SHOTS: Shot[] = [
  { title: "The headlight line", how: "The convoy coming at you. The one shot only a night run has." },
  { title: "Parked, braced", how: "Low light blurs every wobble; film from a stop." },
];

/** Plates and stickers get fixed after (AI edit, like the Ram sticker on 9/25);
 *  this list is only what can't be fixed later. */
export const POSTING_REMINDERS = [
  "Nothing off the mapped roads makes it into a post, whoever filmed it.",
  "Plates and other clubs' stickers: fine to film, fixed before posting.",
  "Kids only with a parent's OK. Anyone who says no is out.",
];

const isNight = (e: EventSummary) => /night/i.test(e.title);

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function hourNY(now: Date): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" }).format(now));
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function shotList(shots: Shot[]): string {
  return `<ol style="margin:8px 0 16px;padding-left:20px;">${shots
    .map((s) => `<li style="margin:0 0 8px;"><strong>${esc(s.title)}</strong><br><span style="color:#555;">${esc(s.how)}</span></li>`)
    .join("")}</ol>`;
}

export function crewEveHtml(input: {
  firstName: string;
  event: EventSummary;
  owner: boolean;
  needs?: string[];
}): { subject: string; html: string } {
  const { firstName, event, owner } = input;
  const upload = `${SITE_URL}/garage/upload`;
  const tips = [
    "Turn the phone sideways: landscape, 4K 60 if yours does it.",
    "Film the obstacle, not each rig. At a mud hole or crossing, start recording before the first one goes in and let it run until the last one's through. We'll cut the short clips from that one take.",
    "Nothing fancy needed. Phone footage is perfect.",
  ];
  const ownerPart = owner
    ? `
      <hr style="border:none;border-top:1px solid #ddd;margin:24px 0;">
      <p style="font-size:12px;font-weight:bold;letter-spacing:.1em;text-transform:uppercase;color:#f86000;margin:0 0 4px;">Owners only · shot list</p>
      ${input.needs?.length ? `<p style="margin:0 0 8px;">The Library is short on: <strong>${esc(input.needs.join(", "))}</strong>.</p>` : ""}
      ${shotList(OWNER_SHOTS)}
      ${isNight(event) ? `<p style="margin:0 0 4px;"><strong>At night</strong></p>${shotList(NIGHT_SHOTS)}` : ""}
      <p style="margin:0 0 4px;"><strong>Before anything posts</strong></p>
      <ul style="margin:4px 0 0;padding-left:20px;">${POSTING_REMINDERS.map((r) => `<li style="margin:0 0 4px;">${esc(r)}</li>`).join("")}</ul>`
    : "";
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#1a1712;max-width:560px;">
    <p>Hey ${esc(firstName)},</p>
    <p>Thanks for coming out tomorrow for <strong>${esc(event.title)}</strong>. We couldn't do these without you. Let's have a great ride.</p>
    <p>If you end up filming, a few things that help us most when we edit:</p>
    <ul style="padding-left:20px;">${tips.map((t) => `<li style="margin:0 0 8px;">${esc(t)}</li>`).join("")}</ul>
    ${
      // Crew-only rides take no RSVPs, so there's no Tailgate to mention.
      event.crewOnly
        ? ""
        : `<p><strong>Heads up:</strong> Tailgate, our event chat, opens tonight. Everyone who RSVP'd can post in it, so you'll see questions and hellos. You don't have to jump in, but you're welcome to say hi or answer anything you know. It goes quiet once we roll out; on the trail it's the radio.</p>`
    }
    <p>When you're home, drop it in <a href="${upload}" style="color:#f86000;">Garage → Upload</a> and pick the event. No rush.</p>
    <p>See you out there,<br>Jose &amp; Anthony</p>
    ${ownerPart}
  </div>`;
  return { subject: `Tomorrow: ${event.title}`, html };
}

/** What the Library is short on, in plain words, for the owners' version. */
function libraryNeeds(rows: MediaRow[]): string[] {
  const needs = footageStock(rows)
    .filter((s) => s.weeks < 3)
    .map((s) => `${s.side.toLowerCase()} footage (${s.unused} unused)`);
  const unusedVideo = rows.filter((r) => /\.(mov|mp4|m4v)$/i.test(r.fileName) && !r.usedAt);
  for (const w of ["mud", "water", "night", "recovery"]) {
    const n = unusedVideo.filter((r) => r.keywords.toLowerCase().split(",").map((k) => k.trim()).includes(w)).length;
    if (n < 3) needs.push(w);
  }
  return needs.slice(0, 5);
}

export interface CrewEveRun {
  tomorrow: string;
  events: string[];
  sent: string[];
  skipped: string[];
  reason?: string;
}

export async function runCrewEve(options: { now?: Date; dry?: boolean; force?: boolean } = {}): Promise<CrewEveRun> {
  const now = options.now || new Date();
  const tomorrow = addDays(todayNY(), 1);
  const out: CrewEveRun = { tomorrow, events: [], sent: [], skipped: [] };
  if (!options.force && hourNY(now) < SEND_FROM_HOUR) {
    out.reason = `Not yet: sends from ${SEND_FROM_HOUR}:00 Eastern the day before.`;
    return out;
  }
  const { upcoming } = await getCrewEvents();
  const events = upcoming.filter((e) => e.date === tomorrow);
  out.events = events.map((e) => e.title);
  if (!events.length) return out;

  const [users, responses, library] = await Promise.all([
    listGarageUsers(),
    getEventResponses(events.map((e) => e.slug)),
    getMediaLibrary().catch(() => [] as MediaRow[]),
  ]);
  const needs = libraryNeeds(library);
  const byEmail = new Map(users.map((u) => [u.email.trim().toLowerCase(), u]));

  for (const event of events) {
    const going = new Set(
      responses.filter((r) => r.eventSlug === event.slug && r.response === "Going").map((r) => r.email.trim().toLowerCase()),
    );
    // Owners always get their version; crew only when they said Going.
    const recipients: GarageUser[] = users.filter(
      (u) => u.role === "Owner" || going.has(u.email.trim().toLowerCase()),
    );
    for (const u of recipients) {
      const email = u.email.trim().toLowerCase();
      if (email === "team@asphaltanddirt.com" || !byEmail.has(email)) continue;
      const key = ledgerKey("Crew eve", `${event.id}-${email}`, event.date);
      if (await alreadySent(key)) {
        out.skipped.push(`${email} (already sent)`);
        continue;
      }
      const owner = u.role === "Owner";
      const { subject, html } = crewEveHtml({ firstName: u.name.split(" ")[0] || "there", event, owner, needs: owner ? needs : undefined });
      if (options.dry) {
        out.sent.push(`${email} (${owner ? "owner" : "crew"}, dry run)`);
        continue;
      }
      try {
        await sendEmail({ to: u.email, subject, html, replyTo: "team@asphaltanddirt.com" });
        await record(key, "Crew eve", subject, "email", "sent", owner ? "owner version" : "crew version");
        out.sent.push(`${email} (${owner ? "owner" : "crew"})`);
      } catch (err) {
        out.skipped.push(`${email} (failed: ${String(err).slice(0, 120)})`);
      }
    }
  }
  return out;
}
