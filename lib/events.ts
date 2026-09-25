import { listRecords, createRecord, updateRecord, isAirtableConfigured, type AirtableFields } from "@/lib/airtable";
import { getApprovedPhotoDescriptions, getHiddenPhotoKeys } from "@/lib/garageMedia";

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
const VENUES_TABLE = "Venues";

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
  /** Crew Only status: a crew ride. Garage only, no public page or RSVPs. */
  crewOnly: boolean;
  /** Events → Drive Folder (set by the hourly event-drive cron). */
  driveFolderUrl: string;
}

export interface EventVenue {
  name: string;
  type: string;
  waiverUrl: string;
  passUrl: string;
  rulesUrl: string;
  riderNotes: string[];
}

/** Only real web links reach a public page or email. */
function publicUrl(value: unknown): string {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim()) ? value.trim() : "";
}

function lines(value: unknown): string[] {
  return ((value as string) || "")
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

/** The event's linked Venues, public fields only. */
async function getEventVenues(ids: string[]): Promise<EventVenue[]> {
  if (ids.length === 0) return [];
  const records = await listRecords(
    VENUES_TABLE,
    `OR(${ids.map((id) => `RECORD_ID() = '${escapeFormulaString(id)}'`).join(", ")})`,
    { baseId: BASE_ID, revalidate: 300 },
  );
  const byId = new Map(records.map((r) => [r.id, r]));
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map((r) => ({
      name: (r.fields.Name as string) || "",
      type: (r.fields.Type as string) || "",
      waiverUrl: publicUrl(r.fields["Waiver Link"]),
      passUrl: publicUrl(r.fields["Pass / Entry Link"]),
      rulesUrl: publicUrl(r.fields["Park Rules Link"]),
      riderNotes: lines(r.fields["Rider Note"]),
    }));
}

export interface EventDetail extends EventSummary {
  /** The day it was last moved to a new date ("" = never). People who RSVP'd
   *  on or before it owe an answer about the new date. */
  postponedOn: string;
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
  /** `alt` is the approved description, or "" when there isn't one yet (the
   *  page numbers those, since it knows the full gallery). */
  galleryPhotos: { url: string; alt: string }[];
  /** PUBLIC. The event's own requirements, one per line in Airtable. */
  requirements: string[];
  /** Asphalt / Dirt / Both — which side of the brand this event is. Seeds the
   *  primary tag on every file uploaded to the event's Drive folder, so
   *  footage arrives already sorted into the bucket the posting board draws
   *  from. Nothing to do with venueTypes, which drives waivers and rules. */
  eventType: string;
  /** A&D Trail Rating color (lib/trailRating.ts), or "" when unrated. */
  trailRating: string;
  /** Venue Type choices plus the Type of each linked venue, keys into
   *  lib/vehicleRules.ts ("State Forest (NJ)"). */
  venueTypes: string[];
  /** PUBLIC parts of the linked Venues rows (waiver/pass/rules links, rider
   *  notes). Contact details and notes never leave the server. */
  venues: EventVenue[];
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
    crewOnly: r.fields.Status === "Crew Only",
    driveFolderUrl: (r.fields["Drive Folder"] as string) || "",
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

/** What the crew sees in A&D Garage: Published events plus Crew Only rides,
 *  split and sorted the same way as getPublishedEvents. */
export async function getCrewEvents(): Promise<{ upcoming: EventSummary[]; past: EventSummary[] }> {
  assertConfigured();
  const records = await listRecords(EVENTS_TABLE, `OR({Status} = 'Published', {Status} = 'Crew Only')`, {
    baseId: BASE_ID,
    revalidate: 60,
  });
  const events = records.map(toSummary).filter((e) => e.slug && e.date);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = events.filter((e) => e.date < today).sort((a, b) => b.date.localeCompare(a.date));
  return { upcoming, past };
}

/** Events that should have a Drive folder but don't have the link yet: any
 *  status except Draft and Cancelled, with a Title and Date. */
export async function listEventsNeedingDriveFolder(): Promise<EventSummary[]> {
  assertConfigured();
  const records = await listRecords(
    EVENTS_TABLE,
    `AND(OR({Status} = 'Published', {Status} = 'Unlisted', {Status} = 'Crew Only'), {Title} != '', {Date} != BLANK(), {Drive Folder} = '')`,
    { baseId: BASE_ID },
  );
  return records.map(toSummary).filter((e) => e.title && e.date);
}

export async function setEventDriveFolder(eventRecordId: string, url: string): Promise<void> {
  assertConfigured();
  await updateRecord(EVENTS_TABLE, eventRecordId, { "Drive Folder": url }, { baseId: BASE_ID });
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
export async function getEventBySlug(
  slug: string,
  options: { includeCrewOnly?: boolean; includeCancelled?: boolean } = {},
): Promise<EventDetail | null> {
  assertConfigured();
  // Crew Only events never resolve for public callers (event page, RSVP,
  // uploads, Tailgate). Only the Garage asks for them. Cancelled ones only
  // resolve for Call it off, which is how a cancelled event comes back.
  const statuses = [
    "Published",
    "Unlisted",
    ...(options.includeCrewOnly ? ["Crew Only"] : []),
    ...(options.includeCancelled ? ["Cancelled"] : []),
  ];
  const records = await listRecords(
    EVENTS_TABLE,
    `AND(OR(${statuses.map((st) => `{Status} = '${st}'`).join(", ")}), {Slug} = '${escapeFormulaString(slug)}')`,
    { baseId: BASE_ID },
  );
  const record = records[0];
  if (!record) return null;
  const [hidden, descriptions, venues] = await Promise.all([
    getHiddenPhotoKeys(),
    getApprovedPhotoDescriptions(),
    getEventVenues((record.fields.Venue as string[]) || []).catch((err) => {
      console.error("event venues lookup failed", err);
      return [] as EventVenue[];
    }),
  ]);
  const galleryPhotos = ((record.fields["Gallery Photos"] as { id?: string; url: string }[] | undefined) || [])
    .map((photo, i) => ({
      url: photo.url,
      alt: (photo.id && descriptions.get(photo.id)) || "",
      key: `gallery|${record.id}|${i}`,
    }))
    .filter((photo) => !hidden.has(photo.key))
    .map(({ url, alt }) => ({ url, alt }));
  return {
    ...toSummary(record),
    unlisted: record.fields.Status === "Unlisted",
    fullDetails: (record.fields["Full Details"] as string) || "",
    meetupPoint: (record.fields["Meetup Point"] as string) || "",
    postponedOn: ((record.fields["Postponed On"] as string) || "").slice(0, 10),
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
    requirements: lines(record.fields.Requirements),
    // Linking a park brings its type's rules along, so they can't be forgotten.
    eventType: (record.fields["Event Type"] as string) || "",
    trailRating: (record.fields["Trail Rating"] as string) || "",
    venueTypes: [...new Set([...((record.fields["Venue Type"] as string[]) || []), ...venues.map((v) => v.type).filter(Boolean)])],
    venues,
  };
}

/** Approved user-submitted photos for one event, newest first — merged
 *  onto the end of the curated Gallery Photos on the Recap & Gallery page.
 *  `alt` is the approved description or "" (the page numbers the rest).
 *  Filters client-side (like listRsvpsForEvent) since a linked-record
 *  field's raw value is an array of record IDs, not visible to a formula
 *  filter on the display text. */
export async function getApprovedEventPhotoSubmissions(
  eventRecordId: string,
): Promise<{ url: string; alt: string }[]> {
  assertConfigured();
  const [records, descriptions] = await Promise.all([
    listRecords(PHOTO_SUBMISSIONS_TABLE, `{Approved} = TRUE()`, {
      baseId: BASE_ID,
      revalidate: 300,
    }),
    getApprovedPhotoDescriptions(),
  ]);
  return records
    .filter((r) => ((r.fields.Event as string[]) || []).includes(eventRecordId))
    .flatMap((r) => {
      const photos = (r.fields.Photo as { id?: string; url: string }[] | undefined) || [];
      return photos.map((photo) => ({ url: photo.url, alt: (photo.id && descriptions.get(photo.id)) || "" }));
    });
}

/** The event's own Gallery Photos (the ones we put up ourselves), unfiltered,
 *  so the Garage can review and flag them too. */
export async function getEventGalleryPhotos(slug: string): Promise<{ key: string; url: string; attachmentId: string }[]> {
  assertConfigured();
  const records = await listRecords(EVENTS_TABLE, `{Slug} = '${escapeFormulaString(slug)}'`, {
    baseId: BASE_ID,
    revalidate: 60,
  });
  const record = records[0];
  if (!record) return [];
  return ((record.fields["Gallery Photos"] as { id?: string; url: string }[] | undefined) || []).map((photo, i) => ({
    key: `gallery|${record.id}|${i}`,
    url: photo.url,
    attachmentId: photo.id || "",
  }));
}

/** Every photo submitted for one event, one entry per file, whether or not the
 *  old Approved box is ticked — the Garage reviews them all and hides only what
 *  someone flags. */
export async function getEventSubmissionPhotos(
  eventRecordId: string,
): Promise<{ key: string; url: string; name: string; attachmentId: string }[]> {
  assertConfigured();
  const records = await listRecords(PHOTO_SUBMISSIONS_TABLE, undefined, { baseId: BASE_ID, revalidate: 60 });
  const photos: { key: string; url: string; name: string; attachmentId: string }[] = [];
  for (const record of records) {
    if (!((record.fields.Event as string[]) || []).includes(eventRecordId)) continue;
    const name = (record.fields.Name as string) || "A community member";
    ((record.fields.Photo as { id?: string; url: string }[] | undefined) || []).forEach((photo, i) => {
      photos.push({ key: `submission|${record.id}|${i}`, url: photo.url, name, attachmentId: photo.id || "" });
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

  const [hidden, descriptions] = await Promise.all([getHiddenPhotoKeys(), getApprovedPhotoDescriptions()]);
  // The approved description when there is one; otherwise say which ride it's from.
  const altFor = (photo: { id?: string }, title: string) =>
    (photo.id && descriptions.get(photo.id)) || (title ? `Photo from ${title}` : "Asphalt & Dirt event photo");
  const byRecordId = new Map(eventRecords.map((r) => [r.id, r]));
  const photos: CommunityPhoto[] = [];

  for (const record of eventRecords) {
    const title = (record.fields.Title as string) || "";
    const slug = (record.fields.Slug as string) || "";
    if (!slug) continue;
    const gallery = (record.fields["Gallery Photos"] as { id?: string; url: string }[] | undefined) || [];
    gallery.forEach((photo, i) => {
      if (hidden.has(`gallery|${record.id}|${i}`)) return;
      photos.push({ url: photo.url, alt: altFor(photo, title), eventTitle: title, eventSlug: slug });
    });
  }

  for (const record of submissionRecords) {
    const eventId = ((record.fields.Event as string[]) || [])[0];
    const event = eventId ? byRecordId.get(eventId) : undefined;
    if (!event) continue;
    const title = (event.fields.Title as string) || "";
    const slug = (event.fields.Slug as string) || "";
    if (!slug) continue;
    const submitted = (record.fields.Photo as { id?: string; url: string }[] | undefined) || [];
    submitted.forEach((photo, i) => {
      // Flagged in A&D Garage = off the site, wherever it would have shown.
      if (hidden.has(`submission|${record.id}|${i}`)) return;
      photos.push({ url: photo.url, alt: altFor(photo, title), eventTitle: title, eventSlug: slug });
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
  /** The event's requirements they agreed to (lib/vehicleRules.ts), if any. */
  requirementsAccepted?: string;
  /** Promo measurement (lib/eventPromo.ts): the `?src=` and `&v=` the RSVP
   *  link carried, and the optional "How did you hear about this?" answer. */
  source?: string;
  variant?: string;
  heardAbout?: string;
}

export async function createRsvp(input: RsvpInput): Promise<{ id: string }> {
  assertConfigured();
  const fields: AirtableFields = {
    Name: input.name,
    Email: input.email,
    ...(input.phone ? { Phone: input.phone } : {}),
    Event: [input.eventRecordId],
    "Already In FB Group": input.alreadyInFbGroup,
    "Join Event Updates List": input.joinEventUpdatesList,
    "Join Newsletter": input.joinNewsletter,
    ...(input.requirementsAccepted ? { "Requirements Accepted": input.requirementsAccepted } : {}),
    "RSVP Date": new Date().toISOString().slice(0, 10),
    Status: "Confirmed",
  };
  const measurement: AirtableFields = {
    ...(input.source ? { Source: input.source } : {}),
    ...(input.variant ? { Variant: input.variant } : {}),
    ...(input.heardAbout ? { "Heard About": input.heardAbout } : {}),
  };
  if (Object.keys(measurement).length === 0) {
    const created = await createRecord(RSVPS_TABLE, fields, { baseId: BASE_ID, typecast: true });
    return { id: created.id };
  }
  try {
    const created = await createRecord(RSVPS_TABLE, { ...fields, ...measurement }, { baseId: BASE_ID, typecast: true });
    return { id: created.id };
  } catch (err) {
    // The measurement fields are new and the site token can't create fields.
    // If they aren't in Airtable yet, the RSVP itself must still save: losing
    // a source tag costs a data point, losing the RSVP costs a rider.
    if (!/UNKNOWN_FIELD_NAME/.test(err instanceof Error ? err.message : "")) throw err;
    console.error("RSVP measurement fields missing; saved without them");
    const created = await createRecord(RSVPS_TABLE, fields, { baseId: BASE_ID, typecast: true });
    return { id: created.id };
  }
}

export interface RsvpRecipient {
  /** The RSVP row, so a per-person signed link (release your spot) can be made. */
  id: string;
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
    .map((r) => ({ id: r.id, name: (r.fields.Name as string) || "", email: (r.fields.Email as string) || "" }))
    .filter((r) => r.email);
}

/**
 * Published and Unlisted events on any of the given dates — the attendee
 * track's D−3 and D−1 sweeps. Unlisted is included on purpose: it takes real
 * RSVPs, so its riders need the plan email as much as anyone. Crew rides
 * don't, since they have no RSVPs.
 */
export async function getLiveEventsOn(dates: string[]): Promise<EventDetail[]> {
  assertConfigured();
  if (dates.length === 0) return [];
  const records = await listRecords(
    EVENTS_TABLE,
    `AND(OR({Status} = 'Published', {Status} = 'Unlisted'), OR(${dates.map((d) => `IS_SAME({Date}, '${d}', 'day')`).join(", ")}))`,
    { baseId: BASE_ID },
  );
  const slugs = records.map((r) => (r.fields.Slug as string) || "").filter(Boolean);
  const events = await Promise.all(slugs.map((slug) => getEventBySlug(slug).catch(() => null)));
  return events.filter((e): e is EventDetail => Boolean(e));
}

export interface AttendeeTrackRsvp extends RsvpRecipient {
  planSentAt: string;
  reminderSentAt: string;
  thankYouSentAt: string;
}

/** Confirmed RSVPs for one event with the attendee track's sent stamps. The
 *  stamps read as "" when the fields don't exist yet; the sweep claims a row
 *  by writing its stamp before sending, so a missing field means nothing is
 *  sent rather than something sent every hour. */
export async function listRsvpsForAttendeeTrack(eventRecordId: string): Promise<AttendeeTrackRsvp[]> {
  assertConfigured();
  const records = await listRecords(RSVPS_TABLE, `{Status} = 'Confirmed'`, { baseId: BASE_ID });
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return records
    .filter((r) => ((r.fields.Event as string[]) || []).includes(eventRecordId))
    .map((r) => ({
      id: r.id,
      name: str(r.fields.Name),
      email: str(r.fields.Email),
      planSentAt: str(r.fields["Plan Email Sent"]),
      reminderSentAt: str(r.fields["Reminder Sent"]),
      thankYouSentAt: str(r.fields["Thank You Sent"]),
    }))
    .filter((r) => r.email);
}

/** Stamp an attendee-track email as sent. Throws if the field is missing,
 *  which the sweep treats as "don't send". */
export async function stampRsvp(recordId: string, field: "Plan Email Sent" | "Reminder Sent" | "Thank You Sent"): Promise<void> {
  assertConfigured();
  await updateRecord(RSVPS_TABLE, recordId, { [field]: new Date().toISOString() }, { baseId: BASE_ID });
}

export interface RsvpSummary {
  count: number;
  /** First names only — a head count with faces on it, without putting
   *  anyone's email or full name on a screen that doesn't need it. */
  firstNames: string[];
  /** The most recent RSVP date (YYYY-MM-DD), so "any new ones?" is answerable. */
  latest: string | null;
}

/** How many people have RSVP'd, per event, in one read. Everything here comes
 *  from the public RSVP form — separate from the crew's own Going/Maybe/Can't. */
export async function getRsvpSummaries(eventRecordIds: string[]): Promise<Map<string, RsvpSummary>> {
  const summaries = new Map<string, RsvpSummary>();
  for (const id of eventRecordIds) summaries.set(id, { count: 0, firstNames: [], latest: null });
  if (eventRecordIds.length === 0 || !isAirtableConfigured(BASE_ID)) return summaries;

  const records = await listRecords(RSVPS_TABLE, `{Status} = 'Confirmed'`, { baseId: BASE_ID });
  for (const record of records) {
    const date = ((record.fields["RSVP Date"] as string) || "").slice(0, 10);
    const first = ((record.fields.Name as string) || "").trim().split(/\s+/)[0] || "";
    for (const eventId of (record.fields.Event as string[]) || []) {
      const summary = summaries.get(eventId);
      if (!summary) continue;
      summary.count += 1;
      if (first) summary.firstNames.push(first);
      if (date && (!summary.latest || date > summary.latest)) summary.latest = date;
    }
  }
  return summaries;
}

export interface RsvpPerson {
  id: string;
  name: string;
  /** Staff-only on screen, same rule as the Tailgate roster. */
  phone: string;
  inFbGroup: "Yes" | "No" | "Not Sure" | "";
  rsvpDate: string;
  /** Titles of EARLIER events this same email RSVP'd to, oldest first. Empty
   *  means this is their first RSVP with us. It's RSVPs, not check-ins, so it
   *  says "RSVP'd before", never "came before". */
  earlierEvents: string[];
  /** After a postponement: this person's answer about the CURRENT date.
   *  "" = the event wasn't postponed after they RSVP'd, so there's nothing to
   *  answer. "waiting" = they owe an answer (see lib/rsvpReconfirm.ts). */
  newDate: "" | "Yes" | "Not sure" | "waiting";
}

/** Where one RSVP stands on the current date after a postponement. Only
 *  people who RSVP'd on or before the day it moved owe an answer; anyone who
 *  RSVP'd after already said yes to the new date by RSVPing. */
function reconfirmState(fields: Record<string, unknown>, eventDate: string, postponedOn: string): RsvpPerson["newDate"] {
  if (!postponedOn) return "";
  const rsvpDate = ((fields["RSVP Date"] as string) || "").slice(0, 10);
  if (rsvpDate && rsvpDate > postponedOn) return "";
  const answeredFor = ((fields["Answered For"] as string) || "").slice(0, 10);
  const answer = (fields["New Date Answer"] as string) || "";
  if (answeredFor === eventDate && (answer === "Yes" || answer === "Not sure")) return answer;
  return "waiting";
}

/** The public RSVP list for one event, with names, for event-day use. Emails
 *  are read (to spot repeat faces across events) but never returned. Two reads:
 *  every Confirmed RSVP, and the Events table for dates and titles. */
export async function getRsvpRoster(eventRecordId: string): Promise<RsvpPerson[]> {
  assertConfigured();
  const [rsvps, events] = await Promise.all([
    listRecords(RSVPS_TABLE, `{Status} = 'Confirmed'`, { baseId: BASE_ID }),
    listRecords(EVENTS_TABLE, undefined, { baseId: BASE_ID }),
  ]);

  const eventInfo = new Map(
    events.map((e) => [e.id, { title: (e.fields.Title as string) || "", date: (e.fields.Date as string) || "" }]),
  );
  const thisDate = eventInfo.get(eventRecordId)?.date || "";
  const postponedOn = ((events.find((e) => e.id === eventRecordId)?.fields["Postponed On"] as string) || "").slice(0, 10);

  const eventsByEmail = new Map<string, Set<string>>();
  for (const r of rsvps) {
    const email = ((r.fields.Email as string) || "").trim().toLowerCase();
    if (!email) continue;
    const set = eventsByEmail.get(email) || new Set<string>();
    for (const id of (r.fields.Event as string[]) || []) set.add(id);
    eventsByEmail.set(email, set);
  }

  return rsvps
    .filter((r) => ((r.fields.Event as string[]) || []).includes(eventRecordId))
    .map((r): RsvpPerson => {
      const email = ((r.fields.Email as string) || "").trim().toLowerCase();
      const earlier = [...(eventsByEmail.get(email) || [])]
        .filter((id) => id !== eventRecordId)
        .map((id) => eventInfo.get(id))
        .filter((e): e is { title: string; date: string } => Boolean(e && e.date && thisDate && e.date < thisDate))
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((e) => e.title);
      return {
        id: r.id,
        name: ((r.fields.Name as string) || "").trim() || "(no name)",
        phone: (r.fields.Phone as string) || "",
        inFbGroup: (r.fields["Already In FB Group"] as RsvpPerson["inFbGroup"]) || "",
        rsvpDate: ((r.fields["RSVP Date"] as string) || "").slice(0, 10),
        earlierEvents: earlier,
        newDate: reconfirmState(r.fields, thisDate, postponedOn),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
