import { listRecords, createRecord, isAirtableConfigured, type AirtableFields } from "@/lib/airtable";

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
  /** PRIVATE — never render this on a public page. Only for the RSVP
   *  confirmation email, built server-side. */
  fullDetails: string;
  /** The exact meetup spot/time. Also private by default — only render it
   *  on the public page when meetupPublic is true. Always goes in the
   *  confirmation email either way. */
  meetupPoint: string;
  meetupPublic: boolean;
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

/** The single soonest upcoming Published event, or null — for the
 *  newsletter digest's auto-filled "Upcoming Event" section. */
export async function getNextUpcomingEvent(): Promise<EventSummary | null> {
  const { upcoming } = await getPublishedEvents();
  return upcoming[0] || null;
}

/** One Published event by slug, including its private Full Details — the
 *  caller is responsible for never rendering fullDetails on a public page. */
export async function getEventBySlug(slug: string): Promise<EventDetail | null> {
  assertConfigured();
  const records = await listRecords(
    EVENTS_TABLE,
    `AND({Status} = 'Published', {Slug} = '${escapeFormulaString(slug)}')`,
    { baseId: BASE_ID },
  );
  const record = records[0];
  if (!record) return null;
  return {
    ...toSummary(record),
    fullDetails: (record.fields["Full Details"] as string) || "",
    meetupPoint: (record.fields["Meetup Point"] as string) || "",
    meetupPublic: Boolean(record.fields["Show Meetup Publicly"]),
  };
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
