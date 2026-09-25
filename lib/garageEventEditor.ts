import { revalidatePath } from "next/cache";
import { createRecord, listRecords, updateRecord, uploadAttachment, isAirtableConfigured, type AirtableRecord } from "@/lib/airtable";
import { syncCommsDate } from "@/lib/eventComms";
import { holdEventPromos } from "@/lib/garageSocial";
import { ensureEventFolders, folderUrl, isDriveConfigured, moveEventFolderDate, trashEventFolderIfEmpty } from "@/lib/googleDrive";

/**
 * Adding and editing events from the Garage (replaces the Airtable "Add an
 * Event" interface). Writes the same Events fields the interface did; the
 * public site, RSVP emails, Tailgate and the Drive cron all read them as
 * before. Owners only; the API route checks.
 */

const BASE_ID = process.env.AIRTABLE_EVENTS_BASE_ID;
const EVENTS = "Events";
const VENUES = "Venues";

export const EVENT_STATUSES = [
  { value: "Draft", label: "Draft", help: "Not shown anywhere yet." },
  { value: "Published", label: "Published", help: "Live on /events, open for RSVPs." },
  { value: "Unlisted", label: "Unlisted", help: "Works by direct link only. Not in lists, search or the newsletter." },
  { value: "Crew Only", label: "Crew ride", help: "Garage only. No public page, no RSVPs. Still gets a Drive folder." },
  { value: "Cancelled", label: "Cancelled", help: "Pulled. RSVPs can still be emailed the news." },
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number]["value"];

export const VENUE_TYPES = ["State Forest (NJ)", "Private Land", "Off-Road Park", "Race Track"] as const;

/** Which side of the brand an event is. Required on every event, because this
 *  is where the decision gets made ONCE and then nothing can arrive untagged:
 *  it seeds the primary tag on every file uploaded to the event's folder. Tag
 *  where it IS, not what it is — a Jeep at a car show is Asphalt. */
export const EVENT_TYPES = ["Dirt", "Asphalt", "Both"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface EventEdit {
  title: string;
  date: string;
  status: EventStatus;
  eventType: EventType;
  generalArea: string;
  publicBlurb: string;
  atAGlance: string;
  requirements: string;
  venueTypes: string[];
  venueIds: string[];
  facebookEventUrl: string;
  meetupPoint: string;
  showMeetupPublicly: boolean;
  fullDetails: string;
  recap: string;
}

export interface EditableEvent extends EventEdit {
  id: string;
  slug: string;
  photoUrl: string;
  driveFolderUrl: string;
  rsvpCount: number;
}

export interface VenueOption {
  id: string;
  name: string;
  type: string;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

function toEditable(r: AirtableRecord): EditableEvent {
  const f = r.fields;
  const status = EVENT_STATUSES.some((s) => s.value === f.Status) ? (f.Status as EventStatus) : "Draft";
  return {
    id: r.id,
    slug: str(f.Slug),
    title: str(f.Title),
    date: str(f.Date).slice(0, 10),
    status,
    generalArea: str(f["General Area"]),
    publicBlurb: str(f["Public Blurb"]),
    atAGlance: str(f["At A Glance"]),
    requirements: str(f.Requirements),
    eventType: (EVENT_TYPES as readonly string[]).includes(f["Event Type"] as string) ? (f["Event Type"] as EventType) : "Dirt",
    venueTypes: (f["Venue Type"] as string[] | undefined) || [],
    venueIds: (f.Venue as string[] | undefined) || [],
    facebookEventUrl: str(f["Facebook Event URL"]),
    meetupPoint: str(f["Meetup Point"]),
    showMeetupPublicly: f["Show Meetup Publicly"] === true,
    fullDetails: str(f["Full Details"]),
    recap: str(f.Recap),
    photoUrl: ((f.Photo as { url: string; thumbnails?: { large?: { url: string } } }[] | undefined) || [])[0]?.thumbnails?.large?.url || ((f.Photo as { url: string }[] | undefined) || [])[0]?.url || "",
    driveFolderUrl: str(f["Drive Folder"]),
    rsvpCount: ((f.RSVPs as string[] | undefined) || []).length,
  };
}

function assertConfigured() {
  if (!isAirtableConfigured(BASE_ID)) throw new Error("Events base is not configured.");
}

/** Every event, any status, newest date first (undated drafts on top). */
export async function listAllEvents(): Promise<EditableEvent[]> {
  assertConfigured();
  const records = await listRecords(EVENTS, undefined, { baseId: BASE_ID });
  return records
    .map(toEditable)
    .sort((a, b) => (b.date || "9999").localeCompare(a.date || "9999"));
}

export async function getEditableEvent(id: string): Promise<EditableEvent | null> {
  assertConfigured();
  if (!/^rec[A-Za-z0-9]{14}$/.test(id)) return null;
  const [record] = await listRecords(EVENTS, `RECORD_ID() = '${id}'`, { baseId: BASE_ID });
  return record ? toEditable(record) : null;
}

export async function listVenues(): Promise<VenueOption[]> {
  assertConfigured();
  const records = await listRecords(VENUES, undefined, { baseId: BASE_ID });
  return records
    .map((r) => ({ id: r.id, name: str(r.fields.Name), type: str(r.fields.Type) }))
    .filter((v) => v.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Checks and tidies what the form sent. Returns an error message or the edit. */
export function cleanEventEdit(body: Record<string, unknown>, venueIds: Set<string>): EventEdit | string {
  const text = (key: string, max = 5000) => (typeof body[key] === "string" ? (body[key] as string).trim().slice(0, max) : "");
  const title = text("title", 120);
  if (!title) return "Give the event a title.";
  const date = text("date", 10);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Pick a real date.";
  const status = text("status", 20) as EventStatus;
  if (!EVENT_STATUSES.some((s) => s.value === status)) return "Pick a status.";
  // Required, with no default. Skipping it here is the one way footage can
  // reach the library untagged, and the whole point of seeding from the event
  // is that a person decides once, up front, instead of on a Wednesday night
  // with a slot to fill.
  const eventType = text("eventType", 20) as EventType;
  if (!(EVENT_TYPES as readonly string[]).includes(eventType)) return "Pick asphalt, dirt or both.";
  if (status !== "Draft" && status !== "Cancelled" && !date) return "Add a date before publishing.";
  const facebookEventUrl = text("facebookEventUrl", 500);
  if (facebookEventUrl && !/^https?:\/\//i.test(facebookEventUrl)) return "The Facebook link should start with https://";
  const list = (key: string) => (Array.isArray(body[key]) ? (body[key] as unknown[]).filter((v): v is string => typeof v === "string") : []);
  return {
    title,
    date,
    status,
    eventType,
    generalArea: text("generalArea", 120),
    publicBlurb: text("publicBlurb"),
    atAGlance: text("atAGlance"),
    requirements: text("requirements"),
    venueTypes: list("venueTypes").filter((v) => (VENUE_TYPES as readonly string[]).includes(v)),
    venueIds: list("venueIds").filter((v) => venueIds.has(v)),
    facebookEventUrl,
    meetupPoint: text("meetupPoint"),
    showMeetupPublicly: body.showMeetupPublicly === true,
    fullDetails: text("fullDetails"),
    recap: text("recap"),
  };
}

function toFields(edit: EventEdit) {
  const orNull = (v: string) => v || null;
  return {
    Title: edit.title,
    Date: orNull(edit.date),
    Status: edit.status,
    "Event Type": edit.eventType,
    "General Area": orNull(edit.generalArea),
    "Public Blurb": orNull(edit.publicBlurb),
    "At A Glance": orNull(edit.atAGlance),
    Requirements: orNull(edit.requirements),
    "Venue Type": edit.venueTypes,
    Venue: edit.venueIds,
    "Facebook Event URL": orNull(edit.facebookEventUrl),
    "Meetup Point": orNull(edit.meetupPoint),
    "Show Meetup Publicly": edit.showMeetupPublicly,
    "Full Details": orNull(edit.fullDetails),
    Recap: orNull(edit.recap),
  };
}

function refreshPublicPages(slugs: string[]) {
  try {
    revalidatePath("/events");
    revalidatePath("/events/all");
    for (const slug of slugs.filter(Boolean)) revalidatePath(`/events/${slug}`);
  } catch (err) {
    console.error("event page revalidate failed", err);
  }
}

/** Makes the Drive folders right away instead of waiting for the hourly cron.
 *  Best-effort: the cron still catches anything this misses. */
export async function ensureDriveFolderNow(event: EditableEvent): Promise<void> {
  if (event.driveFolderUrl || !event.title || !event.date) return;
  if (event.status === "Draft" || event.status === "Cancelled" || !isDriveConfigured()) return;
  try {
    const { eventFolderId } = await ensureEventFolders({ title: event.title, date: event.date });
    await updateRecord(EVENTS, event.id, { "Drive Folder": folderUrl(eventFolderId) }, { baseId: BASE_ID });
  } catch (err) {
    console.error("garage event drive folder failed", err);
  }
}

export async function createEvent(edit: EventEdit): Promise<EditableEvent> {
  assertConfigured();
  const record = await createRecord(EVENTS, toFields(edit), { baseId: BASE_ID });
  const event = toEditable(record);
  refreshPublicPages([event.slug]);
  return event;
}

export async function updateEvent(id: string, edit: EventEdit, previousSlug: string): Promise<EditableEvent> {
  assertConfigured();
  const previous = await getEditableEvent(id).catch(() => null);
  const record = await updateRecord(EVENTS, id, toFields(edit), { baseId: BASE_ID });
  const event = toEditable(record);

  // A postponement has to move the comms row too, or the waiver invite fires
  // on the old date.
  if (event.date) await syncCommsDate(event.slug, event.date);

  // Cancelled, or moved to a different day: hold anything still queued to
  // promote it. Both are cases where the posting board is now advertising
  // something that isn't happening as advertised.
  const nowCancelled = event.status === "Cancelled" && previous?.status !== "Cancelled";
  const moved = Boolean(previous?.date && event.date && previous.date !== event.date);
  if (nowCancelled || moved) {
    await holdEventPromos(event.slug, nowCancelled ? "event cancelled" : `event moved from ${previous?.date}`);
  }

  // Keep Drive tidy (Jose, 2026-09-24): a moved event's folder takes the new
  // date; a cancelled event's folder goes if nothing was uploaded to it. If it
  // comes Back on, the folder is simply made again. Best-effort: Drive trouble
  // must never block calling off a ride.
  if (event.driveFolderUrl && isDriveConfigured()) {
    try {
      if (nowCancelled) {
        const result = await trashEventFolderIfEmpty(event.driveFolderUrl);
        if (result === "trashed") {
          await updateRecord(EVENTS, id, { "Drive Folder": "" }, { baseId: BASE_ID });
          event.driveFolderUrl = "";
        }
      } else if (moved && event.date) {
        await moveEventFolderDate(event.driveFolderUrl, event.date);
      }
    } catch (err) {
      console.error("event drive folder tidy failed", err);
    }
  }

  refreshPublicPages([previousSlug, event.slug]);
  return event;
}

/** Replaces the event's flyer/photo. */
export async function replaceEventPhoto(
  id: string,
  file: { filename: string; contentType: string; base64: string },
): Promise<EditableEvent> {
  assertConfigured();
  await updateRecord(EVENTS, id, { Photo: [] }, { baseId: BASE_ID });
  await uploadAttachment(id, "Photo", file, { baseId: BASE_ID });
  const event = await getEditableEvent(id);
  if (!event) throw new Error("Event disappeared after the photo upload.");
  refreshPublicPages([event.slug]);
  return event;
}
