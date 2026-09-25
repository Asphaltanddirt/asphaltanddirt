import crypto from "node:crypto";
import { createRecord, listRecords, updateRecord, isAirtableConfigured, type AirtableFields, SOCIAL_BASE_ID } from "@/lib/airtable";
import { slotStart } from "@/lib/autoPost";
import { getEventBySlug, getPublishedEvents, type EventDetail } from "@/lib/events";
import { getPost, type SocialPost } from "@/lib/garageSocial";
import { todayNY, weekOf } from "@/lib/garageTasks";
import { getMediaLibrary, type MediaRow } from "@/lib/mediaLibrary";
import { SITE_URL } from "@/lib/site";
import { isAutoPlatform, xLength } from "@/lib/socialCopy";

/**
 * The event promo countdown (approved by Jose 2026-09-24, from "Event promo
 * countdown - RECONCILED"). Every Published event gets its promo cards on the
 * posting board, as ordinary Social Posts rows, so they go through the same
 * approval, master switch, 6-hour limit and notifications as everything else.
 * Nothing here posts. It only drafts cards, and a person approves each one.
 *
 * THE SHAPE, by lead time. A beat whose day has already passed is skipped,
 * never backfilled: an event created late does not get a burst of catch-up
 * posts, because repetition for its own sake is what the research agreed on
 * avoiding (and X's rules forbid "substantially similar" posts anyway).
 *  - More than 3 weeks out: a quiet save-the-date now, then "who's in?" at
 *    D−21, details at D−14, a new clip at D−7 and a last call at D−3.
 *  - Under 3 weeks: open with "who's in?" now, then D−7 and D−3.
 *
 * WHY "WHO'S IN?" OPENS. Our own numbers outrank everything else we found: the
 * 8/15 trail ride's TikTok asked a question, lowered the bar ("introductory")
 * and went out 17 days ahead. It got 8,844 views and 200 comments. The posts
 * that announced, raised the bar or went out late did not.
 *
 * DEDUPE. Each card's `Slot Key` is `promo|<slug>|<event date>|<beat>|<platform>`.
 * The event date is in the key on purpose: a postponed event has its old cards
 * held (holdEventPromos), and the new date then plans a fresh countdown from
 * the new lead time. Skip a card you don't want; don't delete it. A deleted
 * row has no key, so the daily pass would make it again.
 */

const BASE_ID = SOCIAL_BASE_ID;
const EVENTS_BASE_ID = process.env.AIRTABLE_EVENTS_BASE_ID;
const POSTS = "Social Posts";

export const PROMO_BEATS = ["save-the-date", "whos-in", "details", "last-clip", "last-call"] as const;
export type PromoBeat = (typeof PROMO_BEATS)[number];

export const CREATIVES = ["real_action_video", "real_still", "host_talking", "designed_card", "recap_clip"] as const;
export type Creative = (typeof CREATIVES)[number];

/** Evening, when people plan their weekend. One window for every beat keeps
 *  the nudges predictable; move a single card by editing its Window. */
export const PROMO_WINDOW = "6–8 PM";

const BEAT_LABEL: Record<PromoBeat, string> = {
  "save-the-date": "Save the date",
  "whos-in": "Who's in?",
  details: "Details",
  "last-clip": "One week out",
  "last-call": "Last call",
};

/** Where each beat goes, straight from the approved doc. TikTok, the Facebook
 *  Group and Instagram Stories have no posting API we can use, so those cards
 *  are by hand like every other card on those platforms. */
const BEAT_PLATFORMS: Record<PromoBeat, string[]> = {
  "save-the-date": ["Facebook Page", "Facebook Group"],
  "whos-in": ["TikTok", "Instagram", "Facebook Group", "Facebook Page", "X", "Threads"],
  details: ["Facebook Page", "Facebook Group", "Instagram"],
  "last-clip": ["TikTok", "Instagram", "Facebook Group", "Facebook Page", "X", "Threads"],
  "last-call": ["Instagram Story"],
};

/** The `?src=` each platform's RSVP link carries. */
const SOURCE_CODE: Record<string, string> = {
  TikTok: "tiktok",
  Instagram: "instagram",
  "Instagram Story": "igstory",
  "Facebook Page": "facebook",
  "Facebook Group": "fbgroup",
  X: "x",
  Threads: "threads",
};

/** The two beats the footage-vs-card comparison (#7) runs on. */
const TEST_BEATS: PromoBeat[] = ["whos-in", "last-clip"];

const str = (v: unknown) => (typeof v === "string" ? v : "");
const escapeFormula = (v: string) => v.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

// ---------------------------------------------------------------- dates

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

/** "At creation or the next slot": today if today's promo window hasn't
 *  opened yet, otherwise tomorrow. */
export function openingDay(now = new Date()): string {
  const today = todayNY();
  return now < slotStart(today, PROMO_WINDOW) ? today : addDays(today, 1);
}

/**
 * Which beats are still to be made, and on which day. Pure, so the shape can
 * be reasoned about without Airtable.
 *
 * `existing` is the beats that already have cards, with their due dates. On
 * the first sighting (no cards yet) the lead time picks the shape. After that
 * the shape is read back from the cards: a save-the-date, or a "who's in?" on
 * D−21, means the long shape; anything else is the short one.
 */
export function planBeats(eventDate: string, opening: string, existing: Map<PromoBeat, string>): { beat: PromoBeat; due: string }[] {
  const lead = daysBetween(opening, eventDate);
  const d = (n: number) => addDays(eventDate, -n);
  let plan: { beat: PromoBeat; due: string }[];

  if (existing.size === 0) {
    plan =
      lead > 21
        ? [
            { beat: "save-the-date", due: opening },
            { beat: "whos-in", due: d(21) },
            { beat: "details", due: d(14) },
            { beat: "last-clip", due: d(7) },
            { beat: "last-call", due: d(3) },
          ]
        : lead === 21
          ? // Exactly three weeks: the push IS today, so a save-the-date the
            // same evening would just be a second post saying less.
            [
              { beat: "whos-in", due: opening },
              { beat: "details", due: d(14) },
              { beat: "last-clip", due: d(7) },
              { beat: "last-call", due: d(3) },
            ]
          : [
              { beat: "whos-in", due: opening },
              { beat: "last-clip", due: d(7) },
              { beat: "last-call", due: d(3) },
            ];
    // A dated beat on or before the opener's day would be two promo posts in
    // one evening (an event exactly a week out, say). The opener wins.
    plan = plan.filter((p, i) => i === 0 || p.due > opening);
  } else {
    const long = existing.has("save-the-date") || existing.get("whos-in") === d(21);
    plan = long
      ? [
          { beat: "whos-in", due: d(21) },
          { beat: "details", due: d(14) },
          { beat: "last-clip", due: d(7) },
          { beat: "last-call", due: d(3) },
        ]
      : [
          { beat: "last-clip", due: d(7) },
          { beat: "last-call", due: d(3) },
        ];
  }
  // Never backfill, and never promote the day of or after.
  return plan.filter((p) => p.due >= opening && p.due < eventDate);
}

// ---------------------------------------------------------------- the A/B split

/**
 * Footage vs designed card (#7), alternated by event. A stable hash of the
 * slug rather than "every other event in date order", because the order
 * changes whenever an event is added in between, and a variant that flips
 * after its cards are made would scramble the comparison. Over a handful of
 * events a hash splits roughly evenly; the Garage view shows the actual split.
 *
 * Not a randomized test. Organic delivery isn't random: each platform decides
 * who sees what, and events differ in type, weather and lead time. Read it as
 * a comparison across events, never as proof.
 */
export function variantFor(slug: string): "A" | "B" {
  let h = 0x811c9dc5;
  for (const ch of slug) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % 2 === 0 ? "A" : "B";
}

// ---------------------------------------------------------------- fresh facts

export interface EventFacts {
  date: string;
  time: string;
  /** A short hash, not the text: the meetup point is private, and the Social
   *  Posts table has no business holding a copy of it. */
  place: string;
}

/** The facts a promo card depends on. Time comes from the public At A Glance
 *  lines that name a time (meet, roll-out, start). */
export function eventFacts(event: EventDetail): EventFacts {
  const time = event.atAGlance
    .filter((f) => /time|meet|roll|start|kick/i.test(f.label))
    .map((f) => f.value.trim())
    .join(" / ");
  const placeText = [event.generalArea, event.meetupPoint, ...event.venues.map((v) => v.name)].map((s) => s.trim()).join("|");
  return {
    date: event.date,
    time,
    place: crypto.createHash("sha1").update(placeText).digest("hex").slice(0, 12),
  };
}

function parseFacts(raw: string): EventFacts | null {
  try {
    const f = JSON.parse(raw) as Partial<EventFacts>;
    return typeof f.date === "string" ? { date: f.date, time: str(f.time), place: str(f.place) } : null;
  } catch {
    return null;
  }
}

function changedFacts(was: EventFacts, now: EventFacts): string[] {
  const changed: string[] = [];
  if (was.date !== now.date) changed.push(`date ${was.date} → ${now.date}`);
  if (was.time !== now.time) changed.push("time");
  if (was.place !== now.place) changed.push("place");
  return changed;
}

/** An event cancel/postpone notice carries the slug too, and must never be
 *  held by the rule that exists to protect it. */
function isEventNotice(post: Pick<SocialPost, "name" | "promoBeat">): boolean {
  return !post.promoBeat && /^(Cancelled|Postponed) · /.test(post.name);
}

export type Freshness =
  | { ok: true }
  | { ok: false; action: "skip"; reason: string }
  | { ok: false; action: "hold"; reason: string }
  | { ok: false; action: "error"; reason: string };

/**
 * The fresh-facts rule: re-read the event right before a card goes out.
 *  - Not live any more (cancelled, back to draft, unlisted, crew-only, gone)
 *    or already past: skip. Promoting it is simply wrong.
 *  - Date, time or place changed since the card was drafted or last approved:
 *    hold. The card might still be right, but a person has to look.
 *  - Couldn't read the event: don't post, and say so. Posting on a guess is
 *    exactly what this rule exists to stop.
 */
export async function checkPromoFreshness(post: SocialPost): Promise<Freshness> {
  if (!post.event || isEventNotice(post)) return { ok: true };
  let event: EventDetail | null;
  try {
    event = await getEventBySlug(post.event);
  } catch (err) {
    return { ok: false, action: "error", reason: `couldn't re-read the event (${err instanceof Error ? err.message.slice(0, 80) : "error"})` };
  }
  if (!event || event.unlisted || event.crewOnly) return { ok: false, action: "skip", reason: "the event isn't live any more" };
  if (event.date < todayNY()) return { ok: false, action: "skip", reason: "the event has already happened" };
  const was = parseFacts(post.eventFacts);
  if (!was) return { ok: true };
  const changed = changedFacts(was, eventFacts(event));
  return changed.length ? { ok: false, action: "hold", reason: `the event changed since this was written (${changed.join(", ")})` } : { ok: true };
}

const stampDay = () => new Date().toISOString().slice(0, 10);

/** Skip a card whose event is off. Same shape as holdEventPromos. */
export async function skipPromoCard(post: SocialPost, reason: string): Promise<void> {
  const note = [post.notes, `Skipped ${stampDay()}: ${reason}.`].filter(Boolean).join("\n");
  await updateRecord(POSTS, post.id, { Status: "Skipped", Approved: false, Notes: note.slice(0, 2000) }, { baseId: BASE_ID });
}

/** Hold an auto card: un-approve it and mark it Needs update. Re-approving
 *  it (after checking the caption) re-stamps the facts and lets it go. */
export async function holdPromoCard(post: SocialPost, message: string): Promise<void> {
  await updateRecord(
    POSTS,
    post.id,
    { Approved: false, "Auto Status": "Needs update", "Auto Log": message },
    { baseId: BASE_ID, typecast: true },
  );
}

/**
 * Approval means "I've looked at this against the event as it is now", so
 * approving a promo card re-stamps its facts. That is also how a held card is
 * released: fix the caption, approve, and it goes. Best-effort.
 */
export async function restampPromoFacts(post: SocialPost): Promise<void> {
  if (!post.event || !post.promoBeat) return;
  try {
    const event = await getEventBySlug(post.event);
    if (!event) return;
    await updateRecord(
      POSTS,
      post.id,
      {
        "Event Facts": JSON.stringify(eventFacts(event)),
        ...(post.autoStatus === "Needs update" ? { "Auto Status": null, "Auto Log": null } : {}),
      },
      { baseId: BASE_ID },
    );
  } catch (err) {
    console.error("promo facts restamp failed", post.id, err);
  }
}

// ---------------------------------------------------------------- captions

const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

export function rsvpLink(slug: string, platform: string, variant = ""): string {
  const src = SOURCE_CODE[platform] || "other";
  return `${SITE_URL}/events/${slug}?src=${src}${variant ? `&v=${variant}` : ""}`;
}

/** Facebook "Going" and a site RSVP are two different lists (Mud Run: 15
 *  going on Facebook, 4 site RSVPs). Only the site one carries the waiver and
 *  the emails, so every Facebook draft says so. */
function facebookLine(link: string): string {
  return `Tapping "Going" on Facebook doesn't hold a spot. The RSVP and waiver are on our site: ${link}`;
}

/** Who it's for, from the event's own public requirements. Two lines at most:
 *  a caption that reads like a rulebook raises the bar we're trying to lower. */
function whoFor(event: EventDetail): string {
  const req = event.requirements.slice(0, 2);
  return req.length ? `What you need: ${req.join("; ")}.` : "";
}

function timeOf(event: EventDetail): string {
  return event.atAGlance.find((f) => /time|meet|roll|start/i.test(f.label))?.value.trim() || "";
}

/**
 * The draft caption for one card, from the event as it is right now. A draft
 * is a starting point: a person reads and approves every one. Only public
 * facts go in (never the meetup point, which stays behind the RSVP email).
 */
export function draftCaption(event: EventDetail, beat: PromoBeat, platform: string, variant: "A" | "B" | ""): string {
  const title = event.title.trim();
  const area = event.generalArea.trim();
  const link = rsvpLink(event.slug, platform, variant);
  const linkNotClickable = platform === "TikTok" || platform === "Instagram";
  const cta = linkNotClickable ? "RSVP: link in bio." : platform === "Instagram Story" ? "RSVP with the link sticker." : `RSVP: ${link}`;
  const fb = platform.startsWith("Facebook");
  const who = whoFor(event);
  const time = timeOf(event);

  let body: string[];
  if (beat === "save-the-date") {
    body = [`Save the date: ${title}, ${longDate(event.date)}${area ? `, ${area}` : ""}.`, "More soon."];
  } else if (beat === "whos-in") {
    // A question with the bar lowered. The winning post asked, and said stock
    // was welcome. Details come in the next beat.
    body = [
      `Who's in? ${title}, ${longDate(event.date)}${area ? ` in ${area}` : ""}.`,
      [`Stock welcome.`, who].filter(Boolean).join(" "),
      "Tell us what you're bringing.",
    ];
  } else if (beat === "details") {
    const glance = event.atAGlance.filter((f) => f.label).map((f) => `${f.label}: ${f.value}`);
    body = [
      `${title}: the details.`,
      [`${longDate(event.date)}${time ? `, ${time}` : ""}`, area].filter(Boolean).join(" · "),
      [...glance, ...event.requirements.map((r) => `- ${r}`)].slice(0, 8).join("\n"),
    ];
  } else if (beat === "last-clip") {
    body = [`One week out: ${title}, ${shortDate(event.date)}.`, `Still time to join. Stock welcome.`, "Who's in?"];
  } else {
    body = [`Last call: ${title}, ${shortDate(event.date)}.`];
  }

  const parts = [...body.filter(Boolean), fb ? facebookLine(link) : cta];
  let caption = parts.join("\n\n");
  // X counts every link as 23 and allows 280. Drop the "who it's for" and
  // details lines before anything else, since the link and question matter most.
  if ((platform === "X" || platform === "Threads") && xLength(caption) > 280) {
    caption = [body[0], cta].join("\n\n");
  }
  return caption;
}

// ---------------------------------------------------------------- media

const VIDEO = /\.(mp4|mov|m4v|webm)$/i;
const STILL = /\.(jpe?g|png|heic|webp)$/i;

/**
 * The card's media suggestion: Media Library rows of the same Event Type,
 * newest first, as links in the card's Notes. Links, not copies: Drive holds
 * the file (see lib/mediaLibrary.ts), and copying footage into Airtable
 * attachments would put a second, drifting copy of it somewhere else.
 */
export function mediaSuggestion(library: MediaRow[], event: EventDetail, wantVideo: boolean): string {
  const type = event.eventType;
  const matches = library
    .filter((r) => !type || type === "Both" || r.eventType === type || r.eventType === "Both")
    .filter((r) => (wantVideo ? VIDEO.test(r.fileName) : STILL.test(r.fileName)))
    .slice(0, 3);
  if (matches.length === 0) return `No ${type || ""} ${wantVideo ? "video" : "stills"} in the Media Library yet.`.replace(/\s+/g, " ");
  return [
    `From the Media Library (${type || "any"}, newest first):`,
    ...matches.map((r) => `- ${r.label ? `${r.label}: ` : ""}${r.fileName} ${r.driveLink}`),
  ].join("\n");
}

// ---------------------------------------------------------------- the generator

/** Footage beats (variant A) are clips; the designed card and the quieter
 *  beats are single images, which every auto platform here can post. */
function assetFor(platform: string, variant: "A" | "B" | ""): string {
  if (platform === "Instagram Story") return "Story";
  return variant === "A" ? "Vertical clip" : "Square";
}

/** The suggested creative. The test beats follow their variant; the other
 *  beats default to a real still, and a person changes it if they use
 *  something else, so the tag stays true to what actually went out. */
function creativeFor(variant: "A" | "B" | ""): Creative {
  if (variant === "A") return "real_action_video";
  if (variant === "B") return "designed_card";
  return "real_still";
}

function notesFor(event: EventDetail, beat: PromoBeat, platform: string, variant: "A" | "B" | "", library: MediaRow[]): string {
  const lines: string[] = [];
  const link = rsvpLink(event.slug, platform, variant);
  if (variant) {
    lines.push(
      variant === "A"
        ? "Footage test: variant A, REAL FOOTAGE. Use a clip of the real thing."
        : "Footage test: variant B, DESIGNED CARD. Use a designed card, not footage, so the comparison holds.",
    );
  }
  if (beat === "save-the-date" && platform === "Facebook Group") lines.push("Create the Facebook Event today too, and put the site RSVP link in it.");
  if (beat === "last-clip") lines.push("Only say how many rigs are confirmed if it's counted from the real roster (Garage → event).");
  if (platform === "TikTok" || platform === "Instagram") lines.push(`Point the link in bio at ${link} for this post.`);
  if (platform === "Instagram Story") lines.push(`Add the countdown sticker (to the start time) and a link sticker to ${link}.`);
  const wantVideo = variant === "A" || (!variant && platform === "TikTok");
  if (variant !== "B") lines.push(mediaSuggestion(library, event, wantVideo));
  return lines.join("\n");
}

/** Whether this is an event we promote at all: Published, dated, in the future. */
function isPromotable(event: EventDetail | null): event is EventDetail {
  return Boolean(event && !event.unlisted && !event.crewOnly && event.date && event.date > todayNY());
}

/**
 * Make any promo cards this event is still owed. Safe to run as often as you
 * like: the Slot Key stops doubles, and past beats are skipped. Returns the
 * keys it made. Never throws: this runs after an event is saved and from a
 * cron, and neither should fail because the posting board had a hiccup.
 */
export async function generateEventPromos(slug: string, now = new Date()): Promise<{ made: string[]; error?: string }> {
  if (!slug || !isAirtableConfigured(BASE_ID)) return { made: [] };
  try {
    const event = await getEventBySlug(slug);
    if (!isPromotable(event)) return { made: [] };

    const prefix = `promo|${event.slug}|${event.date}|`;
    const rows = await listRecords(POSTS, `FIND('${escapeFormula(prefix)}', {Slot Key}) = 1`, { baseId: BASE_ID });
    const keys = new Set(rows.map((r) => str(r.fields["Slot Key"])));
    const existing = new Map<PromoBeat, string>();
    for (const r of rows) {
      const beat = str(r.fields["Slot Key"]).slice(prefix.length).split("|")[0] as PromoBeat;
      if ((PROMO_BEATS as readonly string[]).includes(beat)) existing.set(beat, str(r.fields.Due).slice(0, 10));
    }

    const plan = planBeats(event.date, openingDay(now), existing);
    if (plan.length === 0) return { made: [] };

    const library = await getMediaLibrary().catch(() => [] as MediaRow[]);
    const facts = JSON.stringify(eventFacts(event));
    const testVariant = variantFor(event.slug);
    const made: string[] = [];

    for (const { beat, due } of plan) {
      const variant = TEST_BEATS.includes(beat) ? testVariant : "";
      for (const platform of BEAT_PLATFORMS[beat]) {
        const key = `${prefix}${beat}|${platform}`;
        if (keys.has(key)) continue;
        const fields: AirtableFields = {
          Name: `${BEAT_LABEL[beat]} · ${event.title.trim()} · ${platform}`,
          "Slot Key": key,
          "Week Of": weekOf(due),
          Due: due,
          Window: PROMO_WINDOW,
          Topic: "Event promo",
          Platform: platform,
          Asset: assetFor(platform, variant),
          Status: "Planned",
          Caption: draftCaption(event, beat, platform, variant),
          Event: event.slug,
          Notes: notesFor(event, beat, platform, variant, library).slice(0, 2000),
          "Promo Beat": beat,
          Creative: creativeFor(variant),
          ...(variant ? { Variant: variant } : {}),
          "Event Facts": facts,
          // Never approved here. A person approves every card, like every other card.
        };
        await createRecord(POSTS, fields, { baseId: BASE_ID, typecast: true });
        made.push(key);
      }
    }
    return { made };
  } catch (err) {
    console.error("event promo generation failed for", slug, err);
    return { made: [], error: err instanceof Error ? err.message.slice(0, 200) : "failed" };
  }
}

/**
 * The by-hand half of the fresh-facts rule. The auto-poster checks its own
 * cards right before sending, but TikTok, the Facebook Group and Stories are
 * posted by a person from the card, so the daily pass checks those instead:
 * skip them if the event is off, and put a plain line in the card's Notes if
 * the date, time or place moved (then re-stamp, so it's said once per change).
 */
export async function sweepHandPromos(): Promise<{ skipped: string[]; flagged: string[] }> {
  const out = { skipped: [] as string[], flagged: [] as string[] };
  if (!isAirtableConfigured(BASE_ID)) return out;
  const rows = await listRecords(
    POSTS,
    `AND({Status} = 'Planned', {Promo Beat} != '', {Event} != '', NOT(IS_BEFORE({Due}, '${todayNY()}')))`,
    { baseId: BASE_ID },
  ).catch(() => []);
  for (const row of rows) {
    if (isAutoPlatform(str(row.fields.Platform))) continue;
    const post = await getPost(row.id);
    if (!post) continue;
    const fresh = await checkPromoFreshness(post);
    if (fresh.ok || fresh.action === "error") continue;
    if (fresh.action === "skip") {
      await skipPromoCard(post, fresh.reason);
      out.skipped.push(post.name);
    } else {
      const event = await getEventBySlug(post.event).catch(() => null);
      const note = [`NEEDS UPDATE ${stampDay()}: ${fresh.reason}. Check the caption before posting.`, post.notes].filter(Boolean).join("\n");
      await updateRecord(
        POSTS,
        post.id,
        { Notes: note.slice(0, 2000), ...(event ? { "Event Facts": JSON.stringify(eventFacts(event)) } : {}) },
        { baseId: BASE_ID },
      );
      out.flagged.push(post.name);
    }
  }
  return out;
}

/** The daily pass: owed cards for every upcoming Published event, then the
 *  by-hand freshness sweep. */
export async function runPromoPass(): Promise<{ events: { slug: string; made: number; error?: string }[]; skipped: string[]; flagged: string[] }> {
  const { upcoming } = await getPublishedEvents();
  const events: { slug: string; made: number; error?: string }[] = [];
  for (const e of upcoming) {
    const result = await generateEventPromos(e.slug);
    events.push({ slug: e.slug, made: result.made.length, ...(result.error ? { error: result.error } : {}) });
  }
  const sweep = await sweepHandPromos();
  return { events, ...sweep };
}

// ---------------------------------------------------------------- measurement

export interface PromoMeasurement {
  /** Confirmed site RSVPs by source, then variant ("" = none on the link). */
  bySource: { source: string; A: number; B: number; none: number }[];
  heardAbout: { answer: string; count: number }[];
  siteConfirmed: number;
  released: number;
  /** Facebook Event "Going", typed in by hand on the event. null = not known. */
  fbGoing: number | null;
  /** This event's side of the footage test. */
  variant: "A" | "B";
}

/** RSVPs for one event, counted for the Garage's read-only promo panel.
 *  Every new field is read defensively: before they exist, the panel just
 *  shows everything under "(no source)". */
export async function getPromoMeasurement(eventRecordId: string, slug: string): Promise<PromoMeasurement> {
  const [rsvps, eventRows] = await Promise.all([
    listRecords("RSVPs", undefined, { baseId: EVENTS_BASE_ID }),
    listRecords("Events", `RECORD_ID() = '${escapeFormula(eventRecordId)}'`, { baseId: EVENTS_BASE_ID }),
  ]);
  const mine = rsvps.filter((r) => ((r.fields.Event as string[]) || []).includes(eventRecordId));
  const confirmed = mine.filter((r) => r.fields.Status === "Confirmed");
  const bySource = new Map<string, { source: string; A: number; B: number; none: number }>();
  const heard = new Map<string, number>();
  for (const r of confirmed) {
    const source = str(r.fields.Source) || "(no source)";
    const row = bySource.get(source) || { source, A: 0, B: 0, none: 0 };
    const v = str(r.fields.Variant);
    if (v === "A") row.A++;
    else if (v === "B") row.B++;
    else row.none++;
    bySource.set(source, row);
    const h = str(r.fields["Heard About"]);
    if (h) heard.set(h, (heard.get(h) || 0) + 1);
  }
  const going = eventRows[0]?.fields["FB Going"];
  return {
    bySource: [...bySource.values()].sort((a, b) => b.A + b.B + b.none - (a.A + a.B + a.none)),
    heardAbout: [...heard.entries()].map(([answer, count]) => ({ answer, count })).sort((a, b) => b.count - a.count),
    siteConfirmed: confirmed.length,
    released: mine.filter((r) => r.fields.Status === "Cancelled" && str(r.fields["Released At"])).length,
    fbGoing: typeof going === "number" ? going : null,
    variant: variantFor(slug),
  };
}
