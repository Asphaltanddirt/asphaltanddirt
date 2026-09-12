import { listRecords, createRecord, updateRecord, isAirtableConfigured, type AirtableFields } from "@/lib/airtable";

/**
 * Event-day comms — a private, no-login chat per event. Lives in its own
 * "A&D Event Comms" base, keyed by the event's Slug as plain text rather
 * than a linked record (Airtable links only work within one base, and the
 * Events base is separate).
 *
 * Nothing here ever gets auto-deleted — the chat's *public availability*
 * expires (see isCommsOpen), but Messages rows and Photo attachments stay
 * in Airtable permanently for the team's records.
 */

const BASE_ID = process.env.AIRTABLE_EVENT_COMMS_BASE_ID;
const SETTINGS_TABLE = "Event Settings";
const MESSAGES_TABLE = "Messages";

const WINDOW_HOURS = 48;

function assertConfigured() {
  if (!isAirtableConfigured(BASE_ID)) {
    throw new Error("Event Comms base is not configured (missing AIRTABLE_EVENT_COMMS_BASE_ID).");
  }
}

function escapeFormulaString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export interface CommsSettings {
  id: string;
  eventSlug: string;
  staffCode: string;
  eventDate: string; // YYYY-MM-DD
  active: boolean;
  activatedAt: string | null; // ISO datetime, null until the reminder cron stamps it
}

function toSettings(r: { id: string; fields: AirtableFields }): CommsSettings {
  return {
    id: r.id,
    eventSlug: (r.fields["Event Slug"] as string) || "",
    staffCode: (r.fields["Staff Code"] as string) || "",
    eventDate: ((r.fields["Event Date"] as string) || "").slice(0, 10),
    active: Boolean(r.fields.Active),
    activatedAt: (r.fields["Activated At"] as string) || null,
  };
}

export async function getCommsSettings(slug: string): Promise<CommsSettings | null> {
  assertConfigured();
  const records = await listRecords(
    SETTINGS_TABLE,
    `{Event Slug} = '${escapeFormulaString(slug)}'`,
    { baseId: BASE_ID },
  );
  const record = records[0];
  return record ? toSettings(record) : null;
}

/** Every settings row whose Event Date is `dateStr` (YYYY-MM-DD), Active,
 *  and not yet activated — what the day-before reminder cron sends to. */
export async function getSettingsToActivate(dateStr: string): Promise<CommsSettings[]> {
  assertConfigured();
  const records = await listRecords(
    SETTINGS_TABLE,
    `AND({Active} = TRUE(), {Event Date} = '${dateStr}', {Activated At} = BLANK())`,
    { baseId: BASE_ID },
  );
  return records.map(toSettings);
}

export async function markActivated(settingsId: string): Promise<void> {
  assertConfigured();
  await updateRecord(SETTINGS_TABLE, settingsId, { "Activated At": new Date().toISOString() }, { baseId: BASE_ID });
}

/** Open = Active, has been activated, and it's been under 48 hours since. */
export function isCommsOpen(settings: CommsSettings | null): boolean {
  if (!settings || !settings.active || !settings.activatedAt) return false;
  const opened = new Date(settings.activatedAt).getTime();
  const hoursSince = (Date.now() - opened) / (1000 * 60 * 60);
  return hoursSince >= 0 && hoursSince < WINDOW_HOURS;
}

export function isStaffCode(settings: CommsSettings | null, provided: string | null | undefined): boolean {
  if (!settings || !settings.staffCode || !provided) return false;
  return provided === settings.staffCode;
}

export type Channel = "Chat" | "Announcements";
export type SosType = "Mechanical" | "Stuck" | "Lost" | "Emergency";

export interface CommsMessage {
  id: string;
  authorName: string;
  vehicleCallsign: string;
  channel: Channel;
  sosType: SosType | null;
  body: string;
  photoUrl: string | null;
  isStaff: boolean;
  createdTime: string;
}

function toMessage(r: { id: string; createdTime: string; fields: AirtableFields }): CommsMessage {
  const photo = (r.fields.Photo as { url: string }[] | undefined)?.[0];
  return {
    id: r.id,
    authorName: (r.fields["Author Name"] as string) || "",
    vehicleCallsign: (r.fields["Vehicle Callsign"] as string) || "",
    channel: (r.fields.Channel as Channel) || "Chat",
    sosType: (r.fields["SOS Type"] as SosType) || null,
    body: (r.fields.Body as string) || "",
    photoUrl: photo?.url || null,
    isStaff: Boolean(r.fields["Is Staff"]),
    createdTime: r.createdTime,
  };
}

/** Every message for one event, oldest first — the client polls this. */
export async function getMessages(slug: string): Promise<CommsMessage[]> {
  assertConfigured();
  const records = await listRecords(
    MESSAGES_TABLE,
    `{Event Slug} = '${escapeFormulaString(slug)}'`,
    { baseId: BASE_ID },
  );
  return records.map(toMessage).sort((a, b) => (a.createdTime < b.createdTime ? -1 : 1));
}

export interface PostMessageInput {
  eventSlug: string;
  authorName: string;
  vehicleCallsign: string;
  channel: Channel;
  sosType?: SosType;
  body: string;
  isStaff: boolean;
}

export async function postMessage(input: PostMessageInput): Promise<{ id: string }> {
  assertConfigured();
  const created = await createRecord(
    MESSAGES_TABLE,
    {
      "Event Slug": input.eventSlug,
      "Author Name": input.authorName,
      "Vehicle Callsign": input.vehicleCallsign,
      Channel: input.channel,
      ...(input.sosType ? { "SOS Type": input.sosType } : {}),
      Body: input.body,
      "Is Staff": input.isStaff,
    },
    { baseId: BASE_ID, typecast: true },
  );
  return { id: created.id };
}
