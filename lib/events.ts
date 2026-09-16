import { listRecords, createRecord, isAirtableConfigured, type AirtableFields } from "@/lib/airtable";
import { getHiddenPhotoKeys } from "@/lib/garageMedia";

/**
 * Site-authored events — the A&D Events base (AIRTABLE_EVENTS_BASE_ID) is
 * the source of truth. Build the event here first, then copy/paste into the
 * Facebook group post; this replaces the old Google Calendar sync
 * (lib/calendar.ts, now removed) which required entering the same event
 * twice in a different order and had no way to keep the exact meetup spot
 * private from non-Facebook visitors.
 */

const BASE_ID = process.env.AIRTABLE_EVENTS_BASE_ID;
const EVENTS_TABLE = "Events";
const RSVPS_TABLE = "RSVPs";
const PHOTO_SUBMISSIONS_TABLE = "Event Photo Submissions";

function assertConfigured() {
  if (!isAirtableConfigured(BASE_ID)) {
    throw new Error("Events base is not configured (missing AIRTABLE_EVENTS_BASE_ID).");
  }
}

function escapeFormulaString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export interface EventSummary {
  id: string;
  title: string;
  slug: string;
  date: string; // YYYY-MM-DD
  generalArea: string;
  publicBlurb: string;
  photoUrl: string | null;
  facebookEventUrl: string;
}

export interface EventDetail extends EventSummary {
  /** Reachable by direct link only (test events, private invites) — keep it
   *  out of search engines too. */
  unlisted: boolean;
  /** PRIVATE — never render this on a public page. Only for the RSVP
   *  confirmation email, built server-side. */
  fullDetails: string;
  /** The exact meetup spot/time. Also private by default — only render it
   *  on the public page when meetupPublic is true. Always goes in the
   *  confirmation email either way. */
  meetupPoint: string;
  meetupPublic: boolean;
  /** PUBLIC quick facts from "At A Glance", one "Label: Value" per line
   *  (meet/roll-out time, vehicle requirement, what to bring). Shown on the
   *  event page and in its Event structured data. Never the exact meetup spot. */
  atAGlance: { label: string; value: string }[];
  /** Public recap write-up — only relevant once the event's date has
   *  passed. Empty until the team writes one. */
  recap: string;
  /** Curated gallery photos from the Events table's Gallery Photos field
   *  (team-selected — Comms system pulls, FB group finds, etc). */
  galleryPhotos: { url: string; alt: string }[];
}

function toSummary(r: { id: string; fields: AirtableFields }): EventSummary {
  const photo = (r.fields.Photo as { url: string }[] | undefined)?.[0];
  return {
    id: r.id,
    title: (r.fields.Title as string) || "",
    slug: (r.fields.Slug as string) || "",
    date: ((r.fields.Date as string) || "").slice(0, 10),
    generalArea: (r.fields["General Area"] as string) || "",
    publicBlurb: (r.fields["Public Blurb"] as string) || "",
    photoUrl: photo?.url || null,
    facebookEventUrl: (r.fields["Facebook Event URL"] as string) || "",
  };
}

/** Every Published event, split into upcoming (today or later) and past,
 *  each sorted soonest/most-recent first. */
export async function getPublishedEvents(): Promise<{ upcoming: EventSummary[]; past: EventSummary[] }> {
  assertConfigured();
  const records = await listRecords(EVENTS_TABLE, `{Status} = 'Published'`, {
    baseId: BASE_ID,
    revalidate: 300,
  });
  const events = records.map(toSummary).filter((e) => e.slug && e.date);
  const today = new Date().toISOString().slice(0, 10);

  const upcoming = events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = events.filter((e) => e.date < today).sort((a, b) => b.date.localeCompare(a.date));
  return { upcoming, past };
}

/** `date` is today or later — for picking the button label/link (Details &
 *  RSVP vs. Recap & Gallery) without needing the split upcoming/past lists. */
export function isPastEvent(date: string): boolean {
  return date < new Date().toISOString().slice(0, 10);
}

/** The event's day has arrived (America/New_York) — photo and video uploads
 *  open then, so the Tailgate thank-you email that goes out 3 hours after the
 *  trail ends (same evening) links to a working upload form. */
export function uploadsOpen(date: string): boolean {
  const todayNy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
  return date <= todayNy;
}

/** Upcoming and past merged into one list, newest date first — the 3-wide
 *  showcase panel on the Events page. New events (almost always dated
 *  further out than what's already on the books) naturally slot in at the
 *  front; whatever falls past `limit` is still reachable on /events/all. */
export async function getEventsShowcase(limit = 3): Promise<EventSummary[]> {
  const { upcoming, past } = await getPublishedEvents();
  return [...upcoming, ...past].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

/** Every Published event (upcoming + past), newest date first — for the
 *  /events/all list/search page. */
export async function getAllPublishedEvents(): Promise<EventSummary[]> {
  const { upcoming, past } = await getPublishedEvents();
  return [...upcoming, ...past].sort((a, b) => b.date.localeCompare(a.date));
}

/** The single soonest upcoming Published event, or null — for the
 *  newsletter digest's auto-filled "Upcoming Event" section. */
export async function getNextUpcomingEvent(): Promise<EventSummary | null> {
  const { upcoming } = await getPublishedEvents();
  return upcoming[0] || null;
}

/** One Published or Unlisted event by slug, including its private Full
 *  Details — the caller is responsible for never rendering fullDetails on a
 *  public page. Unlisted = a real, working event (RSVP, Tailgate, emails) that
 *  only people with the link can reach: it's left out of every list, the
 *  sitemap and the newsletter, which all read getPublishedEvents instead. */
export async function getEventBySlug(slug: string): Promise<EventDetail | null> {
  assertConfigured();
  const records = await listRecords(
    EVENTS_TABLE,
    `AND(OR({Status} = 'Published', {Status} = 'Unlisted'), {Slug} = '${escapeFormulaString(slug)}')`,
    { baseId: BASE_ID },
  );
  const record = records[0];
  if (!record) return null;
  const hidden = await getHiddenPhotoKeys();
  const galleryPhotos = ((record.fields["Gallery Photos"] as { url: string }[] | undefined) || [])
    .map((photo, i) => ({
      url: photo.url,
      alt: (record.fields.Title as string) || "Event photo",
      key: `gallery|${record.id}|${i}`,
    }))
    .filter((photo) => !hidden.has(photo.key))
    .map(({ url, alt }) => ({ url, alt }));
  return {
    ...toSummary(record),
    unlisted: record.fields.Status === "Unlisted",
    fullDetails: (record.fields["Full Details"] as string) || "",
    meetupPoint: (record.fields["Meetup Point"] as string) || "",
    meetupPublic: Boolean(record.fields["Show Meetup Publicly"]),
    atAGlance: ((record.fields["At A Glance"] as string) || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const i = line.indexOf(":");
        return i > 0 ? { label: line.slice(0, i).trim(), value: line.slice(i + 1).trim() } : { label: "", value: line };
      }),
    recap: (record.fields.Recap as string) || "",
    galleryPhotos,
  };
}

/** Approved user-submitted photos for one event, newest first — merged
 *  onto the end of the curated Gallery Photos on the Recap & Gallery page.
 *  Filters client-side (like listRsvpsForEvent) since a linked-record
 *  field's raw value is an array of record IDs, not visible to a formula
 *  filter on the display text. */
export async function getApprovedEventPhotoSubmissions(
  eventRecordId: string,
): Promise<{ url: string; alt: string }[]> {
  assertConfigured();
  const records = await listRecords(PHOTO_SUBMISSIONS_TABLE, `{Approved} = TRUE()`, {
    baseId: BASE_ID,
    revalidate: 300,
  });
  return records
    .filter((r) => ((r.fields.Event as string[]) || []).includes(eventRecordId))
    .flatMap((r) => {
      const name = (r.fields.Name as string) || "A community member";
      const photos = (r.fields.Photo as { url: string }[] | undefined) || [];
      return photos.map((photo) => ({ url: photo.url, alt: `Submitted by ${name}` }));
    });
}

/** The event's own Gallery Photos (the ones we put up ourselves), unfiltered,
 *  so the Garage can review and flag them too. */
export async function getEventGalleryPhotos(slug: string): Promise<{ key: string; url: string }[]> {
  assertConfigured();
  const records = await listRecords(EVENTS_TABLE, `{Slug} = '${escapeFormulaString(slug)}'`, {
    baseId: BASE_ID,
    revalidate: 60,
  });
  const record = records[0];
  if (!record) return [];
  return ((record.fields["Gallery Photos"] as { url: string }[] | undefined) || []).map((photo, i) => ({
    key: `gallery|${record.id}|${i}`,
    url: photo.url,
  }));
}

/** Every photo submitted for one event, one entry per file, whether or not the
 *  old Approved box is ticked — the Garage reviews them all and hides only what
 *  someone flags. */
export async function getEventSubmissionPhotos(
  eventRecordId: string,
): Promise<{ key: string; url: string; name: string }[]> {
  assertConfigured();
  const records = await listRecords(PHOTO_SUBMISSIONS_TABLE, undefined, { baseId: BASE_ID, revalidate: 60 });
  const photos: { key: string; url: string; name: string }[] = [];
  for (const record of records) {
    if (!((record.fields.Event as string[]) || []).includes(eventRecordId)) continue;
    const name = (record.fields.Name as string) || "A community member";
    ((record.fields.Photo as { url: string }[] | undefined) || []).forEach((photo, i) => {
      photos.push({ key: `submission|${record.id}|${i}`, url: photo.url, name });
    });
  }
  return photos;
}

export interface CommunityPhoto {
  url: string;
  alt: string;
  eventTitle: string;
  eventSlug: string;
}

/** Every curated gallery photo across every published event, plus approved
 *  visitor submissions — the Community page's photo wall.
 *
 *  Shuffled rather than newest-first on purpose: ordering by date would mean
 *  the most recent recap permanently owns the top and older rides never
 *  resurface, which defeats the point of a community gallery. The shuffle is
 *  seeded off the revalidation window rather than Math.random() so the server
 *  and client agree on the order within a given render — it changes between
 *  cache periods, not mid-scroll. */
export async function getCommunityPhotos(limit = 12): Promise<CommunityPhoto[]> {
  assertConfigured();

  const [eventRecords, submissionRecords] = await Promise.all([
    listRecords(EVENTS_TABLE, `{Status} = 'Published'`, { baseId: BASE_ID, revalidate: 900 }),
    listRecords(PHOTO_SUBMISSIONS_TABLE, `{Approved} = TRUE()`, { baseId: BASE_ID, revalidate: 900 }),
  ]);

  const hidden = await getHiddenPhotoKeys();
  const byRecordId = new Map(eventRecords.map((r) => [r.id, r]));
  const photos: CommunityPhoto[] = [];

  for (const record of eventRecords) {
    const title = (record.fields.Title as string) || "";
    const slug = (record.fields.Slug as string) || "";
    if (!slug) continue;
    const gallery = (record.fields["Gallery Photos"] as { url: string }[] | undefined) || [];
    gallery.forEach((photo, i) => {
      if (hidden.has(`gallery|${record.id}|${i}`)) return;
      photos.push({ url: photo.url, alt: title || "Asphalt & Dirt event photo", eventTitle: title, eventSlug: slug });
    });
  }

  for (const record of submissionRecords) {
    const eventId = ((record.fields.Event as string[]) || [])[0];
    const event = eventId ? byRecordId.get(eventId) : undefined;
    if (!event) continue;
    const title = (event.fields.Title as string) || "";
    const slug = (event.fields.Slug as string) || "";
    if (!slug) continue;
    const submitted = (record.fields.Photo as { url: string }[] | undefined) || [];
    submitted.forEach((photo, i) => {
      // Flagged in A&D Garage = off the site, wherever it would have shown.
      if (hidden.has(`submission|${record.id}|${i}`)) return;
      photos.push({ url: photo.url, alt: title || "Asphalt & Dirt event photo", eventTitle: title, eventSlug: slug });
    });
  }

  // Deterministic shuffle: a fixed seed per revalidation window keeps the
  // server render and the hydrated client render identical.
  const seed = Math.floor(Date.now() / (15 * 60 * 1000));
  const scored = photos.map((photo, i) => {
    const h = Math.sin(seed * 9301 + i * 49297) * 233280;
    return { photo, score: h - Math.floor(h) };
  });
  scored.sort((a, b) => a.score - b.score);

  return scored.slice(0, limit).map((s) => s.photo);
}

export interface RsvpInput {
  eventRecordId: string;
  name: string;
  email: string;
  phone?: string;
  alreadyInFbGroup: "Yes" | "No" | "Not Sure";
  joinEventUpdatesList: boolean;
  joinNewsletter: boolean;
}

export async function createRsvp(input: RsvpInput): Promise<{ id: string }> {
  assertConfigured();
  const created = await createRecord(
    RSVPS_TABLE,
    {
      Name: input.name,
      Email: input.email,
      ...(input.phone ? { Phone: input.phone } : {}),
      Event: [input.eventRecordId],
      "Already In FB Group": input.alreadyInFbGroup,
      "Join Event Updates List": input.joinEventUpdatesList,
      "Join Newsletter": input.joinNewsletter,
      "RSVP Date": new Date().toISOString().slice(0, 10),
      Status: "Confirmed",
    },
    { baseId: BASE_ID, typecast: true },
  );
  return { id: created.id };
}

export interface RsvpRecipient {
  name: string;
  email: string;
}

/** Every Confirmed RSVP linked to one event — for the admin "send an
 *  update" route. A linked-record field's raw value is an array of record
 *  IDs (unlike ARRAYJOIN inside a filterByFormula, which only sees the
 *  linked record's display text) — so this filters client-side rather than
 *  via formula, matching on the real event record ID. */
export async function listRsvpsForEvent(eventRecordId: string): Promise<RsvpRecipient[]> {
  assertConfigured();
  const records = await listRecords(RSVPS_TABLE, `{Status} = 'Confirmed'`, { baseId: BASE_ID });
  return records
    .filter((r) => ((r.fields.Event as string[]) || []).includes(eventRecordId))
    .map((r) => ({ name: (r.fields.Name as string) || "", email: (r.fields.Email as string) || "" }))
    .filter((r) => r.email);
}
