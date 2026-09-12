import { listRecords, createRecord, updateRecord, isAirtableConfigured, type AirtableFields } from "@/lib/airtable";
import { PRIVACY_POLICY_VERSION, type WaiverVersion } from "@/lib/waivers";
import crypto from "crypto";

/**
 * Event-day comms — a private, no-login chat per event. Lives in its own
 * "A&D Event Comms" base, keyed by the event's Slug as plain text rather
 * than a linked record (Airtable links only work within one base, and the
 * Events base is separate).
 *
 * Access model: someone completes the waiver/registration page (which
 * creates their Attendees row + a personal Access Token) and gets emailed
 * a link unique to them — never a link or QR anyone could stumble onto or
 * share publicly. At the safety meeting, staff does roll call and checks
 * each person in; until then their messages route to a staff-only line,
 * not the group. SOS bypasses all of that — visible to everyone, staff
 * included, at all times within its window.
 *
 * Nothing here ever gets auto-deleted — the chat's *public availability*
 * expires (see isCommsOpen/isSosOpen), but every row and Photo attachment
 * stays in Airtable permanently for the team's records.
 */

const BASE_ID = process.env.AIRTABLE_EVENT_COMMS_BASE_ID;
const SETTINGS_TABLE = "Event Settings";
const MESSAGES_TABLE = "Messages";
const ATTENDEES_TABLE = "Attendees";
const SIGNATURES_TABLE = "Waiver Signatures";

// SOS is tighter (covers the ride + ~2hrs home) than general chat (extra
// day for photos/"great time today" wrap-up talk) — both anchored to the
// same Activated At timestamp, just different durations.
const SOS_WINDOW_HOURS = 24;
const CHAT_WINDOW_HOURS = 48;
const DEFAULT_END_TIME = "17:00"; // 9-5 unless Event End Time says otherwise

function assertConfigured() {
  if (!isAirtableConfigured(BASE_ID)) {
    throw new Error("Event Comms base is not configured (missing AIRTABLE_EVENT_COMMS_BASE_ID).");
  }
}

function escapeFormulaString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/** America/New_York's current UTC offset in minutes (negative), DST-aware. */
function nyOffsetMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "shortOffset" }).formatToParts(date);
  const match = parts.find((p) => p.type === "timeZoneName")?.value.match(/GMT([+-]\d+)/);
  return match ? parseInt(match[1], 10) * 60 : -300;
}

/** `dateStr` "YYYY-MM-DD" + `timeStr` "HH:MM", both wall-clock America/New_York -> a real UTC Date. */
function nyDateTime(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const offsetMin = nyOffsetMinutes(utcGuess);
  return new Date(utcGuess.getTime() - offsetMin * 60000);
}

export interface CommsSettings {
  id: string;
  eventSlug: string;
  staffCode: string;
  eventDate: string; // YYYY-MM-DD
  eventEndTime: string; // HH:MM, 24-hour, America/New_York
  active: boolean;
  activatedAt: string | null; // ISO datetime, null until the reminder cron stamps it
  waiverVersion: WaiverVersion;
}

function toSettings(r: { id: string; fields: AirtableFields }): CommsSettings {
  return {
    id: r.id,
    eventSlug: (r.fields["Event Slug"] as string) || "",
    staffCode: (r.fields["Staff Code"] as string) || "",
    eventDate: ((r.fields["Event Date"] as string) || "").slice(0, 10),
    eventEndTime: (r.fields["Event End Time"] as string) || DEFAULT_END_TIME,
    active: Boolean(r.fields.Active),
    activatedAt: (r.fields["Activated At"] as string) || null,
    waiverVersion: ((r.fields["Waiver Version"] as WaiverVersion) || "ONE-DAY-1.0"),
  };
}

export async function getCommsSettings(slug: string): Promise<CommsSettings | null> {
  assertConfigured();
  const records = await listRecords(SETTINGS_TABLE, `{Event Slug} = '${escapeFormulaString(slug)}'`, { baseId: BASE_ID });
  const record = records[0];
  return record ? toSettings(record) : null;
}

/** The reminder email's target send time: event end time minus 22 hours —
 *  for a 9-5 event that's 7pm the night before, giving the 24h SOS window
 *  a 2-hour buffer past the event's actual end (the ride home). */
export function reminderSendTime(settings: Pick<CommsSettings, "eventDate" | "eventEndTime">): Date {
  const end = nyDateTime(settings.eventDate, settings.eventEndTime);
  return new Date(end.getTime() - 22 * 60 * 60 * 1000);
}

/** Every Active, not-yet-activated settings row whose computed reminder
 *  send time has passed — what the hourly reminder cron sends to. */
export async function getSettingsDueForReminder(now = new Date()): Promise<CommsSettings[]> {
  assertConfigured();
  const records = await listRecords(SETTINGS_TABLE, `AND({Active} = TRUE(), {Activated At} = BLANK())`, { baseId: BASE_ID });
  return records.map(toSettings).filter((s) => s.eventDate && reminderSendTime(s) <= now);
}

/** Every settings row that's past its 48-hour chat window but hasn't had
 *  its closing ("thanks for coming") email sent yet — what the hourly
 *  cron's closing sweep sends to. */
export async function getSettingsToClose(now = new Date()): Promise<CommsSettings[]> {
  assertConfigured();
  const records = await listRecords(
    SETTINGS_TABLE,
    `AND({Activated At} != BLANK(), {Closed Email Sent} = BLANK())`,
    { baseId: BASE_ID },
  );
  return records.map(toSettings).filter((s) => {
    if (!s.activatedAt) return false;
    const hoursSince = (now.getTime() - new Date(s.activatedAt).getTime()) / (1000 * 60 * 60);
    return hoursSince >= CHAT_WINDOW_HOURS;
  });
}

export async function markActivated(settingsId: string): Promise<void> {
  assertConfigured();
  await updateRecord(SETTINGS_TABLE, settingsId, { "Activated At": new Date().toISOString() }, { baseId: BASE_ID });
}

export async function markClosedEmailSent(settingsId: string): Promise<void> {
  assertConfigured();
  await updateRecord(SETTINGS_TABLE, settingsId, { "Closed Email Sent": new Date().toISOString() }, { baseId: BASE_ID });
}

function hoursSinceActivation(settings: CommsSettings | null): number | null {
  if (!settings || !settings.active || !settings.activatedAt) return null;
  const hours = (Date.now() - new Date(settings.activatedAt).getTime()) / (1000 * 60 * 60);
  return hours >= 0 ? hours : null;
}

/** General chat (Chat/Announcements/Staff channels) — open for 48 hours from activation. */
export function isCommsOpen(settings: CommsSettings | null): boolean {
  const hours = hoursSinceActivation(settings);
  return hours !== null && hours < CHAT_WINDOW_HOURS;
}

/** SOS specifically — tighter 24-hour window, but note callers should also
 *  allow SOS any time isCommsOpen is true and this is within its own
 *  window; SOS never opens *before* general comms does. */
export function isSosOpen(settings: CommsSettings | null): boolean {
  const hours = hoursSinceActivation(settings);
  return hours !== null && hours < SOS_WINDOW_HOURS;
}

export function isStaffCode(settings: CommsSettings | null, provided: string | null | undefined): boolean {
  if (!settings || !settings.staffCode || !provided) return false;
  return provided === settings.staffCode;
}

// ---------------------------------------------------------------------------
// Attendees — the waiver record + chat identity + roll-call status.
// ---------------------------------------------------------------------------

export interface Attendee {
  id: string;
  eventSlug: string;
  screenName: string;
  vehicleCallsign: string;
  legalName: string;
  email: string;
  accessToken: string;
  checkedIn: boolean;
}

function toAttendee(r: { id: string; fields: AirtableFields }): Attendee {
  return {
    id: r.id,
    eventSlug: (r.fields["Event Slug"] as string) || "",
    screenName: (r.fields["Screen Name"] as string) || "",
    vehicleCallsign: (r.fields["Vehicle Callsign"] as string) || "",
    legalName: (r.fields["Legal Name"] as string) || "",
    email: (r.fields.Email as string) || "",
    accessToken: (r.fields["Access Token"] as string) || "",
    checkedIn: Boolean(r.fields["Checked In"]),
  };
}

export interface WaiverChild {
  name: string;
  age: string;
  relationship: string;
  mediaConsent: boolean;
  attendanceDates?: string;
}

export interface WaiverSubmission {
  eventSlug: string;
  waiverVersion: WaiverVersion;
  screenName: string;
  vehicleCallsign: string;
  legalName: string;
  email: string;
  phone: string;
  adultParticipating: boolean;
  adultMediaConsent: boolean;
  adultAttendanceDates?: string;
  signature: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  acceptedAdultTerms: boolean;
  acceptedParentalAuthority: boolean;
  acceptedMediaScope: boolean;
  acceptedElectronicSignature: boolean;
  acknowledgedPrivacyNotice: boolean;
  children: WaiverChild[];
}

/** Waiver acceptance. Writes two rows: the Attendee (chat identity + access
 *  token, what staff uses for roll call) and the Waiver Signature (the legal
 *  record, including exactly which document version was accepted). Caller
 *  sends the personal link; nothing here does. */
export async function submitWaiver(input: WaiverSubmission): Promise<Attendee> {
  assertConfigured();
  const accessToken = crypto.randomBytes(16).toString("hex");
  const signedAt = new Date().toISOString();

  const created = await createRecord(
    ATTENDEES_TABLE,
    {
      "Event Slug": input.eventSlug,
      "Screen Name": input.screenName,
      "Vehicle Callsign": input.vehicleCallsign,
      "Legal Name": input.legalName,
      Email: input.email,
      "Access Token": accessToken,
      "Waiver Agreed At": signedAt,
      "Checked In": false,
    },
    { baseId: BASE_ID },
  );

  const childFields: AirtableFields = {};
  input.children.slice(0, 4).forEach((child, i) => {
    const n = i + 1;
    childFields[`Child ${n} Name`] = child.name;
    childFields[`Child ${n} Age`] = child.age;
    childFields[`Child ${n} Relationship`] = child.relationship;
    childFields[`Child ${n} Media Consent`] = child.mediaConsent;
    if (child.attendanceDates) childFields[`Child ${n} Attendance Dates`] = child.attendanceDates;
  });

  // The signature is the legally meaningful artifact — if this write fails
  // the caller should know, so it isn't swallowed like the email send is.
  await createRecord(
    SIGNATURES_TABLE,
    {
      "Legal Name": input.legalName,
      "Event Slug": input.eventSlug,
      "Waiver Version": input.waiverVersion,
      Email: input.email,
      Phone: input.phone,
      "Adult Participating": input.adultParticipating,
      "Adult Media Consent": input.adultMediaConsent,
      ...(input.adultAttendanceDates ? { "Adult Attendance Dates": input.adultAttendanceDates } : {}),
      Signature: input.signature,
      "Signed At": signedAt,
      ...(input.emergencyContactName ? { "Emergency Contact Name": input.emergencyContactName } : {}),
      ...(input.emergencyContactPhone ? { "Emergency Contact Phone": input.emergencyContactPhone } : {}),
      ...(input.emergencyContactRelationship
        ? { "Emergency Contact Relationship": input.emergencyContactRelationship }
        : {}),
      "Accepted Adult Terms": input.acceptedAdultTerms,
      "Accepted Parental Authority": input.acceptedParentalAuthority,
      "Accepted Media Scope": input.acceptedMediaScope,
      "Accepted Electronic Signature": input.acceptedElectronicSignature,
      ...(input.acknowledgedPrivacyNotice ? { "Privacy Notice Acknowledged": PRIVACY_POLICY_VERSION } : {}),
      ...childFields,
    },
    { baseId: BASE_ID, typecast: true },
  );

  return toAttendee({ id: created.id, fields: { ...created, "Access Token": accessToken } });
}

export async function getAttendeeByToken(slug: string, token: string): Promise<Attendee | null> {
  assertConfigured();
  if (!token) return null;
  const records = await listRecords(
    ATTENDEES_TABLE,
    `AND({Event Slug} = '${escapeFormulaString(slug)}', {Access Token} = '${escapeFormulaString(token)}')`,
    { baseId: BASE_ID },
  );
  const record = records[0];
  return record ? toAttendee(record) : null;
}

/** Full roster for one event — staff-only (the check-in panel). */
export async function getAttendeeRoster(slug: string): Promise<Attendee[]> {
  assertConfigured();
  const records = await listRecords(ATTENDEES_TABLE, `{Event Slug} = '${escapeFormulaString(slug)}'`, { baseId: BASE_ID });
  return records.map(toAttendee).sort((a, b) => a.screenName.localeCompare(b.screenName));
}

export async function setCheckedIn(attendeeId: string, checkedIn: boolean): Promise<void> {
  assertConfigured();
  await updateRecord(
    ATTENDEES_TABLE,
    attendeeId,
    { "Checked In": checkedIn, "Checked In At": checkedIn ? new Date().toISOString() : null },
    { baseId: BASE_ID },
  );
}

/** Every RSVP'd but never-registered person for the waiver-reminder nudge
 *  isn't tracked here — that's a future add if it comes up. */

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export type Channel = "Chat" | "Announcements" | "Staff";
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

/** Every message for one event, oldest first — the client polls this and
 *  filters client-side by channel/visibility (see components/CommsChat.tsx). */
export async function getMessages(slug: string): Promise<CommsMessage[]> {
  assertConfigured();
  const records = await listRecords(MESSAGES_TABLE, `{Event Slug} = '${escapeFormulaString(slug)}'`, { baseId: BASE_ID });
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
