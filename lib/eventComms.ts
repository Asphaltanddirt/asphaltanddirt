import { listRecords, createRecord, updateRecord, deleteRecord, isAirtableConfigured, type AirtableFields } from "@/lib/airtable";
import { PRIVACY_POLICY_VERSION, type WaiverVersion } from "@/lib/waivers";
import { getSession, canRunEvents } from "@/lib/garageAuth";
import crypto from "crypto";
import { revalidateTag } from "next/cache";

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
 * not the group.
 *
 * Tailgate 2.0 (2026-09-14): no SOS alerts — staff can't help a flat tire 45
 * minutes away, so the trail screen tells people to reach staff on the radio
 * and/or call 911 instead. When staff taps Roll out, attendees stop seeing
 * chat and see only the trail radio channel; Trail over brings chat back.
 *
 * Nothing here ever gets auto-deleted — the chat's *public availability*
 * expires (see isCommsOpen), but every row and Photo attachment stays in
 * Airtable permanently for the team's records.
 */

const BASE_ID = process.env.AIRTABLE_EVENT_COMMS_BASE_ID;
const SETTINGS_TABLE = "Event Settings";
const MESSAGES_TABLE = "Messages";
const ATTENDEES_TABLE = "Attendees";
const SIGNATURES_TABLE = "Waiver Signatures";
export const EMERGENCY_CONTACTS_TABLE = "Emergency Contacts";
const LIKES_TABLE = "Likes";

// Chat is open for 48 hours from the reminder email (Activated At), e.g. 7 PM
// the day before a 9-5 event through 7 PM the day after.
const CHAT_WINDOW_HOURS = 48;
const DEFAULT_END_TIME = "17:00"; // 9-5 unless Event End Time says otherwise

// ---------------------------------------------------------------------------
// Read caching. Every phone in the chat polls every few seconds; reading
// Airtable per poll made it ~3 API calls per phone per poll, which crosses
// Airtable's 5 requests/second-per-base limit at about a dozen phones and
// burns a month of API allowance in one event. Instead each event's
// settings, attendees and messages are read from Airtable at most once per
// window below, shared by every viewer (Next's data cache, global on Vercel),
// and every write through this file expires the affected cache immediately —
// so a sent message, a check-in or a new registration still shows on the
// very next poll. Visibility filtering still happens per viewer AFTER the
// cached read, on the server, exactly as before.
// ---------------------------------------------------------------------------
// Every write through this file expires its cache on the spot (verified on
// prod), so these windows only bound how stale an edit made directly in the
// Airtable grid can be — and they cap cost when a single phone sits open on a
// dash mount for the whole 48 hours (cost scales with time, not people).
const SETTINGS_CACHE_SECONDS = 300;
const ATTENDEES_CACHE_SECONDS = 300;
const MESSAGES_CACHE_SECONDS = 60;
const LIKES_CACHE_SECONDS = 60;

type CacheKind = "settings" | "attendees" | "messages" | "likes";

function commsTag(kind: CacheKind, slug: string) {
  return `comms-${kind}:${slug}`;
}

function expire(kind: CacheKind, slug: string) {
  revalidateTag(commsTag(kind, slug), { expire: 0 });
}

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

/** Where the ride is. Blank in Airtable = not rolled out yet. */
export type TrailStatus = "Not started" | "On trail" | "Trail over";

export interface CommsSettings {
  id: string;
  eventSlug: string;
  staffCode: string;
  eventDate: string; // YYYY-MM-DD
  eventEndTime: string; // HH:MM, 24-hour, America/New_York
  active: boolean;
  activatedAt: string | null; // ISO datetime, null until the reminder cron stamps it
  waiverVersion: WaiverVersion;
  trailStatus: TrailStatus;
  /** Shown to everyone on the trail screen. */
  trailChannel: string;
  /** STAFF ONLY — never send this to an attendee. */
  staffChannel: string;
  channelUpdatedAt: string | null;
  trailOverAt: string | null;
  /** Agreement 1.1+: governing-law state and exact venue for the header. */
  eventState: string;
  venue: string;
}

function toSettings(r: { id: string; fields: AirtableFields }): CommsSettings {
  const status = r.fields["Trail Status"] as string | undefined;
  return {
    id: r.id,
    eventSlug: (r.fields["Event Slug"] as string) || "",
    staffCode: (r.fields["Staff Code"] as string) || "",
    eventDate: ((r.fields["Event Date"] as string) || "").slice(0, 10),
    eventEndTime: (r.fields["Event End Time"] as string) || DEFAULT_END_TIME,
    active: Boolean(r.fields.Active),
    activatedAt: (r.fields["Activated At"] as string) || null,
    waiverVersion: ((r.fields["Waiver Version"] as WaiverVersion) || "ONE-DAY-1.0"),
    trailStatus: status === "On trail" || status === "Trail over" ? status : "Not started",
    trailChannel: (r.fields["Trail Channel"] as string) || "",
    staffChannel: (r.fields["Staff Channel"] as string) || "",
    channelUpdatedAt: (r.fields["Channel Updated At"] as string) || null,
    trailOverAt: (r.fields["Trail Over At"] as string) || null,
    eventState: (r.fields["Event State"] as string) || "",
    venue: (r.fields.Venue as string) || "",
  };
}

/** What a viewer is allowed to know about the ride. The staff channel only
 *  ever goes to staff — attendees radio on the trail channel. */
export interface TrailState {
  status: TrailStatus;
  trailChannel: string;
  staffChannel?: string;
  channelUpdatedAt: string | null;
}

export function trailStateFor(settings: CommsSettings, isStaff: boolean): TrailState {
  return {
    status: settings.trailStatus,
    trailChannel: settings.trailChannel,
    ...(isStaff ? { staffChannel: settings.staffChannel } : {}),
    channelUpdatedAt: settings.channelUpdatedAt,
  };
}

/** Staff trail controls. Roll out and Change channel both set the channels;
 *  Roll out also flips the status (chat goes dark for attendees). Trail over
 *  brings chat back and starts the 3-hour clock on the thank-you email. */
export async function updateTrail(
  settings: Pick<CommsSettings, "id" | "eventSlug">,
  action: "rollout" | "channel" | "over",
  channels?: { trailChannel: string; staffChannel: string },
): Promise<void> {
  assertConfigured();
  const now = new Date().toISOString();
  const fields: AirtableFields =
    action === "over"
      ? { "Trail Status": "Trail over", "Trail Over At": now }
      : {
          ...(action === "rollout" ? { "Trail Status": "On trail", "Rolled Out At": now } : {}),
          "Trail Channel": channels?.trailChannel || "",
          "Staff Channel": channels?.staffChannel || "",
          "Channel Updated At": now,
        };
  await updateRecord(SETTINGS_TABLE, settings.id, fields, { baseId: BASE_ID });
  // Every phone switches on its next poll, not after the settings cache window.
  expire("settings", settings.eventSlug);
}

export async function getCommsSettings(slug: string): Promise<CommsSettings | null> {
  assertConfigured();
  const records = await listRecords(SETTINGS_TABLE, `{Event Slug} = '${escapeFormulaString(slug)}'`, {
    baseId: BASE_ID,
    revalidate: SETTINGS_CACHE_SECONDS,
    tags: [commsTag("settings", slug)],
  });
  const record = records[0];
  return record ? toSettings(record) : null;
}

/** The reminder email's target send time: event end time minus 22 hours —
 *  for a 9-5 event that's 7pm the night before. It also opens Tailgate, so
 *  the 48-hour window runs to 7pm the day after. */
/**
 * Keep the comms row's date in step with the event's.
 *
 * The event date lives in TWO places: the Events base, and this base's own
 * `Event Date`, which is what `reminderSendTime` computes from. Nothing kept
 * them together, so postponing an event in the Garage left the waiver invite
 * firing on the old schedule — and unlike a cancellation, a postponed event
 * still resolves fine, so no status check catches it. Found 2026-09-23 with a
 * nor'easter forecast for the Mud Run.
 *
 * Best-effort and silent when there is no comms row: plenty of events never
 * get one, and a failure here must not stop the event itself being saved.
 * Only touches a row whose chat has not opened yet — once `Activated At` is
 * stamped the 48-hour window is running and moving its date would shift a
 * window people are already inside.
 */
export async function syncCommsDate(slug: string, date: string): Promise<"updated" | "unchanged" | "none" | "activated"> {
  if (!slug || !date || !isAirtableConfigured(BASE_ID)) return "none";
  try {
    const settings = await getCommsSettings(slug);
    if (!settings) return "none";
    if (settings.activatedAt) return "activated";
    if (settings.eventDate === date) return "unchanged";
    await updateRecord(SETTINGS_TABLE, settings.id, { "Event Date": date }, { baseId: BASE_ID });
    return "updated";
  } catch (err) {
    console.error("comms date sync failed for", slug, err);
    return "none";
  }
}

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

/** The thank-you email goes this long after staff taps Trail over. */
export const THANK_YOU_DELAY_HOURS = 3;

/** Every event whose thank-you email (photo upload link) is due and not sent:
 *  3 hours after staff tapped Trail over, or — if nobody ever tapped it — at
 *  the end of the 48-hour window, so it still goes out. What the hourly
 *  cron's thank-you sweep sends to. */
export async function getSettingsToClose(now = new Date()): Promise<CommsSettings[]> {
  assertConfigured();
  const records = await listRecords(
    SETTINGS_TABLE,
    `AND({Activated At} != BLANK(), {Closed Email Sent} = BLANK())`,
    { baseId: BASE_ID },
  );
  const hoursSince = (iso: string) => (now.getTime() - new Date(iso).getTime()) / (1000 * 60 * 60);
  return records.map(toSettings).filter((s) => {
    if (!s.activatedAt) return false;
    if (s.trailOverAt && hoursSince(s.trailOverAt) >= THANK_YOU_DELAY_HOURS) return true;
    return hoursSince(s.activatedAt) >= CHAT_WINDOW_HOURS;
  });
}

export async function markActivated(settings: Pick<CommsSettings, "id" | "eventSlug">): Promise<void> {
  assertConfigured();
  await updateRecord(SETTINGS_TABLE, settings.id, { "Activated At": new Date().toISOString() }, { baseId: BASE_ID });
  // The chat opens off Activated At — don't make people wait out the cache.
  expire("settings", settings.eventSlug);
}

/** The Control Room's Tailgate switch. Opening by hand stamps Activated At,
 *  which starts the 48-hour window straight away — and takes the row out of
 *  the reminder cron's reach, since that only picks up rows not yet activated.
 *  The screen says so before you tap it. */
export async function setTailgateOpen(
  settings: Pick<CommsSettings, "id" | "eventSlug">,
  open: boolean,
): Promise<void> {
  assertConfigured();
  await updateRecord(
    SETTINGS_TABLE,
    settings.id,
    open ? { Active: true, "Activated At": new Date().toISOString() } : { Active: false },
    { baseId: BASE_ID },
  );
  expire("settings", settings.eventSlug);
}

export async function markClosedEmailSent(settings: Pick<CommsSettings, "id" | "eventSlug">): Promise<void> {
  assertConfigured();
  await updateRecord(SETTINGS_TABLE, settings.id, { "Closed Email Sent": new Date().toISOString() }, { baseId: BASE_ID });
  expire("settings", settings.eventSlug);
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

export function isStaffCode(settings: CommsSettings | null, provided: string | null | undefined): boolean {
  if (!settings || !settings.staffCode || !provided) return false;
  return provided === settings.staffCode;
}

/** Staff is either the event's staff code (the old shared link) or someone
 *  signed in to A&D Garage as Owner/Staff. The Garage is the way forward: the
 *  name on their messages comes from their Google account instead of a prompt,
 *  and there's no code to pass around. Returns the name to post under. */
export async function staffViewer(
  settings: CommsSettings | null,
  providedCode: string | null | undefined,
): Promise<{ isStaff: boolean; staffName: string }> {
  const session = await getSession();
  if (session && canRunEvents(session)) return { isStaff: true, staffName: session.name };
  return { isStaff: isStaffCode(settings, providedCode), staffName: "" };
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
  /** STAFF ONLY — from the sign-up form, so staff can call someone who isn't
   *  answering chat. Never include it in anything an attendee receives. */
  phone: string;
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
    phone: (r.fields.Phone as string) || "",
  };
}

export interface WaiverChild {
  name: string;
  age: string;
  relationship: string;
  mediaConsent: boolean;
  attendanceDates?: string;
  /** 1.1: which vehicle the child rides in. */
  vehicle?: string;
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
  /** They ticked "I don't have one / would rather not share". Recorded so a
   *  deliberate decline is distinguishable from three fields left blank. */
  emergencyContactDeclined?: boolean;
  acceptedAdultTerms: boolean;
  acceptedParentalAuthority: boolean;
  acceptedMediaScope: boolean;
  acceptedElectronicSignature: boolean;
  acknowledgedPrivacyNotice: boolean;
  children: WaiverChild[];
  /** 1.1: accepted section 10 (media submissions) once for this event. */
  postingTermsAccepted?: boolean;
  /** The full agreement text as shown, with event details filled in. */
  agreementSnapshot?: string;
  eventState?: string;
  venue?: string;
  /** YYYY-MM-DD, for the emergency contact's deletion date. */
  eventDate?: string;
}

/** Waiver acceptance. Writes two rows: the Attendee (chat identity + access
 *  token, what staff uses for roll call) and the Waiver Signature (the legal
 *  record, including exactly which document version was accepted). Caller
 *  sends the personal link; nothing here does. */
export async function submitWaiver(input: WaiverSubmission): Promise<Attendee> {
  assertConfigured();
  const signedAt = new Date().toISOString();

  // Filling the form twice on one event must not mint a second identity —
  // that would hand them a second token and orphan the messages they already
  // sent. Reuse the row (and its token, so the original emailed link keeps
  // working) and take the newer screen name/vehicle, which makes
  // re-registering a legitimate way to fix a typo'd name.
  const existing = await findAttendeeByEmail(input.eventSlug, input.email);
  let attendee: Attendee;

  if (existing) {
    await updateRecord(
      ATTENDEES_TABLE,
      existing.id,
      {
        "Screen Name": input.screenName,
        "Vehicle Callsign": input.vehicleCallsign,
        "Legal Name": input.legalName,
        ...(input.phone ? { Phone: input.phone } : {}),
        "Waiver Agreed At": signedAt,
      },
      { baseId: BASE_ID },
    );
    attendee = {
      ...existing,
      screenName: input.screenName,
      vehicleCallsign: input.vehicleCallsign,
      legalName: input.legalName,
      phone: input.phone || existing.phone,
    };
  } else {
    const accessToken = crypto.randomBytes(16).toString("hex");
    const created = await createRecord(
      ATTENDEES_TABLE,
      {
        "Event Slug": input.eventSlug,
        "Screen Name": input.screenName,
        "Vehicle Callsign": input.vehicleCallsign,
        "Legal Name": input.legalName,
        Email: input.email,
        ...(input.phone ? { Phone: input.phone } : {}),
        "Access Token": accessToken,
        "Waiver Agreed At": signedAt,
        "Checked In": false,
      },
      { baseId: BASE_ID, typecast: true },
    );
    attendee = toAttendee({ id: created.id, fields: { ...created, "Access Token": accessToken } });
  }
  // Their emailed link must work the moment it lands, not after the cache window.
  expire("attendees", input.eventSlug);

  const childFields: AirtableFields = {};
  input.children.slice(0, 4).forEach((child, i) => {
    const n = i + 1;
    childFields[`Child ${n} Name`] = child.name;
    childFields[`Child ${n} Age`] = child.age;
    childFields[`Child ${n} Relationship`] = child.relationship;
    childFields[`Child ${n} Media Consent`] = child.mediaConsent;
    if (child.attendanceDates) childFields[`Child ${n} Attendance Dates`] = child.attendanceDates;
    if (child.vehicle) childFields[`Child ${n} Vehicle`] = child.vehicle;
  });

  // Emergency contacts live in their own table so they can be deleted 90 days
  // after the event without touching the long-term signed agreement
  // (privacy policy PRIVACY-1.1). The signature only records that one was given.
  const hasEmergencyContact = Boolean(input.emergencyContactName || input.emergencyContactPhone);

  // The signature is the legally meaningful artifact — if this write fails
  // the caller should know, so it isn't swallowed like the email send is.
  const signatureRecord = await createRecord(
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
      ...(hasEmergencyContact ? { "Emergency Contact Given": true } : {}),
      ...(input.emergencyContactDeclined ? { "No Emergency Contact": true } : {}),
      ...(input.postingTermsAccepted ? { "Posting Terms Accepted": true } : {}),
      ...(input.eventState ? { "Event State": input.eventState } : {}),
      ...(input.venue ? { Venue: input.venue } : {}),
      ...(input.agreementSnapshot ? { "Agreement Snapshot": input.agreementSnapshot } : {}),
      "Accepted Adult Terms": input.acceptedAdultTerms,
      "Accepted Parental Authority": input.acceptedParentalAuthority,
      "Accepted Media Scope": input.acceptedMediaScope,
      "Accepted Electronic Signature": input.acceptedElectronicSignature,
      ...(input.acknowledgedPrivacyNotice ? { "Privacy Notice Acknowledged": PRIVACY_POLICY_VERSION } : {}),
      ...childFields,
    },
    { baseId: BASE_ID, typecast: true },
  );

  if (hasEmergencyContact) {
    const eventDate = input.eventDate || signedAt.slice(0, 10);
    const deleteAfter = new Date(`${eventDate}T12:00:00Z`);
    deleteAfter.setUTCDate(deleteAfter.getUTCDate() + 90);
    await createRecord(
      EMERGENCY_CONTACTS_TABLE,
      {
        "Contact Name": input.emergencyContactName || "",
        Phone: input.emergencyContactPhone || "",
        Relationship: input.emergencyContactRelationship || "",
        "Event Slug": input.eventSlug,
        "Participant Legal Name": input.legalName,
        "Signature Record Id": signatureRecord.id,
        "Event Date": eventDate,
        "Delete After": deleteAfter.toISOString().slice(0, 10),
      },
      { baseId: BASE_ID, typecast: true },
    );
  }

  return attendee;
}

/** An existing registration for this event with the same email, if any.
 *  Someone who fills the form twice (a typo'd screen name, a lost email, a
 *  double-tapped submit) must end up with the SAME identity — a second row
 *  means a second access token, and their own earlier messages become
 *  invisible to them. Matched case-insensitively; addresses are. */
export async function findAttendeeByEmail(slug: string, email: string): Promise<Attendee | null> {
  assertConfigured();
  const normalised = email.trim().toLowerCase();
  if (!normalised) return null;
  const records = await listRecords(ATTENDEES_TABLE, `{Event Slug} = '${escapeFormulaString(slug)}'`, { baseId: BASE_ID });
  const match = records.find((r) => ((r.fields.Email as string) || "").trim().toLowerCase() === normalised);
  return match ? toAttendee(match) : null;
}

/** Staff fixing a hand-typed screen name on the roster ("Rache1" -> "Rachel")
 *  without making the person re-register. Safe now that visibility keys off
 *  the record ID rather than the name. */
export async function renameAttendee(slug: string, attendeeId: string, screenName: string): Promise<void> {
  assertConfigured();
  await updateRecord(ATTENDEES_TABLE, attendeeId, { "Screen Name": screenName }, { baseId: BASE_ID });
  expire("attendees", slug);
}

/** Staff "Reset Link": a lost or forwarded link gets a fresh Access Token,
 *  so the old link stops working the moment the cache is expired. Returns the
 *  updated attendee (server-side only, it carries the new token and email). */
export async function resetAttendeeLink(slug: string, attendeeId: string): Promise<Attendee | null> {
  assertConfigured();
  const attendees = await getEventAttendees(slug);
  const attendee = attendees.find((a) => a.id === attendeeId);
  if (!attendee) return null;
  const accessToken = crypto.randomBytes(16).toString("hex");
  await updateRecord(ATTENDEES_TABLE, attendeeId, { "Access Token": accessToken }, { baseId: BASE_ID });
  expire("attendees", slug);
  return { ...attendee, accessToken };
}

/** Every attendee for one event, from the shared cache (see top of file).
 *  Server-only: includes access tokens. */
async function getEventAttendees(slug: string): Promise<Attendee[]> {
  assertConfigured();
  const records = await listRecords(ATTENDEES_TABLE, `{Event Slug} = '${escapeFormulaString(slug)}'`, {
    baseId: BASE_ID,
    revalidate: ATTENDEES_CACHE_SECONDS,
    tags: [commsTag("attendees", slug)],
  });
  return records.map(toAttendee);
}

export async function getAttendeeByToken(slug: string, token: string): Promise<Attendee | null> {
  if (!token) return null;
  const attendees = await getEventAttendees(slug);
  return attendees.find((a) => a.accessToken && a.accessToken === token) || null;
}

/** Everyone signed up for an event, with emails — server-side sends only
 *  (the thank-you email). Never hand this to a client. */
export async function getAttendeesForEmail(slug: string): Promise<Attendee[]> {
  return getEventAttendees(slug);
}

/** What a staff phone gets for Staging. No access tokens, emails or legal
 *  names: those stay on the server, so a shared staff code can't be used to
 *  sign in as someone else. */
export interface RosterEntry {
  id: string;
  screenName: string;
  vehicleCallsign: string;
  checkedIn: boolean;
  phone: string;
}

/** Full roster for one event — staff-only (Staging). */
export async function getAttendeeRoster(slug: string): Promise<RosterEntry[]> {
  const attendees = await getEventAttendees(slug);
  return attendees
    .sort((a, b) => a.screenName.localeCompare(b.screenName))
    .map((a) => ({ id: a.id, screenName: a.screenName, vehicleCallsign: a.vehicleCallsign, checkedIn: a.checkedIn, phone: a.phone }));
}

export async function setCheckedIn(slug: string, attendeeId: string, checkedIn: boolean): Promise<void> {
  assertConfigured();
  await updateRecord(
    ATTENDEES_TABLE,
    attendeeId,
    { "Checked In": checkedIn, "Checked In At": checkedIn ? new Date().toISOString() : null },
    { baseId: BASE_ID },
  );
  // Roll call flips their view to the group chat on the next poll.
  expire("attendees", slug);
}

/** Every RSVP'd but never-registered person for the waiver-reminder nudge
 *  isn't tracked here — that's a future add if it comes up. */

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export type Channel = "Chat" | "Announcements" | "Staff";
export type SosType = "Mechanical" | "Stuck" | "Lost" | "Emergency";
export type MediaKind = "Photo" | "Video";
export type MediaStatus = "Uploading" | "Ready" | "Failed";

export interface CommsMessage {
  id: string;
  /** Record ID of the Attendees row that posted this — the identity key.
   *  Screen names are hand-typed, collide, and change on re-registration, so
   *  they can't be trusted to decide who sees what. Null for staff posts. */
  attendeeId: string | null;
  /** On a staff reply in the pre-checkin line: whose line it's addressed to. */
  replyToAttendeeId: string | null;
  authorName: string;
  vehicleCallsign: string;
  channel: Channel;
  sosType: SosType | null;
  body: string;
  /** Small preview (a still frame for videos). The original is in Drive. */
  photoUrl: string | null;
  isStaff: boolean;
  createdTime: string;
  /** Null on a text message. */
  mediaKind: MediaKind | null;
  mediaStatus: MediaStatus | null;
  driveFileId: string;
  driveFileName: string;
  mediaSubmissionId: string;
  mediaSize: number;
  /** Staff tapped Hide. Attendees never receive a hidden message. */
  hidden: boolean;
}

function toMessage(r: { id: string; createdTime: string; fields: AirtableFields }): CommsMessage {
  const photo = (r.fields.Photo as { url: string }[] | undefined)?.[0];
  return {
    id: r.id,
    attendeeId: (r.fields["Attendee Id"] as string) || null,
    replyToAttendeeId: (r.fields["Reply To Attendee Id"] as string) || null,
    authorName: (r.fields["Author Name"] as string) || "",
    vehicleCallsign: (r.fields["Vehicle Callsign"] as string) || "",
    channel: (r.fields.Channel as Channel) || "Chat",
    sosType: (r.fields["SOS Type"] as SosType) || null,
    body: (r.fields.Body as string) || "",
    photoUrl: photo?.url || null,
    isStaff: Boolean(r.fields["Is Staff"]),
    createdTime: r.createdTime,
    mediaKind: (r.fields["Media Kind"] as MediaKind) || null,
    mediaStatus: (r.fields["Media Status"] as MediaStatus) || null,
    driveFileId: (r.fields["Drive File Id"] as string) || "",
    driveFileName: (r.fields["Drive File Name"] as string) || "",
    mediaSubmissionId: (r.fields["Media Submission Id"] as string) || "",
    mediaSize: Number(r.fields["Media Size"]) || 0,
    hidden: Boolean(r.fields.Hidden),
  };
}

/** Every message for one event, oldest first. Server-only — this is the
 *  UNFILTERED set and includes every private staff-line conversation. Never
 *  hand the result to a client; use getVisibleMessages instead. */
async function getAllMessages(slug: string): Promise<CommsMessage[]> {
  assertConfigured();
  const records = await listRecords(MESSAGES_TABLE, `{Event Slug} = '${escapeFormulaString(slug)}'`, {
    baseId: BASE_ID,
    revalidate: MESSAGES_CACHE_SECONDS,
    tags: [commsTag("messages", slug)],
  });
  return records.map(toMessage).sort((a, b) => (a.createdTime < b.createdTime ? -1 : 1));
}

/** Photos posted in an event's Tailgate, for the Garage's media review.
 *  Server-only: the whole feed is read, then only the photo posts come back. */
export async function getTailgatePhotos(slug: string): Promise<{ id: string; photoUrl: string; authorName: string; hidden: boolean }[]> {
  const messages = await getAllMessages(slug);
  return messages
    .filter((m) => m.mediaKind === "Photo" && m.mediaStatus === "Ready" && m.photoUrl)
    .map((m) => ({ id: m.id, photoUrl: m.photoUrl as string, authorName: m.authorName, hidden: m.hidden }));
}

export type MessageViewer =
  | { kind: "staff" }
  | { kind: "attendee"; attendeeId: string; checkedIn: boolean };

/**
 * Who can see what. This runs on the server and is the only thing enforcing
 * it — hiding messages in the browser is not privacy, since the full set
 * would still sit in the page payload and the API response.
 *
 *  - Announcements (and SOS alerts from before Tailgate 2.0) reach everyone. Announcements matter most to the
 *    people who AREN'T checked in yet ("safety meeting in 10"), so they
 *    deliberately reach the staff line too.
 *  - Staff sees the group chat plus every private line.
 *  - Attendees see their own private line always — before roll call it's all
 *    they have, and after it they keep it. Getting checked in shouldn't make
 *    your own history disappear; it reads as lost rather than protected. It
 *    stays private either way: nobody else's view ever includes it.
 *  - Checked-in attendees additionally see the group chat. What they said
 *    privately never becomes public retroactively.
 *
 *  - Photo/video posts only appear once the original has finished uploading
 *    to Drive, and a post staff has hidden reaches staff only.
 *
 *  Keyed on the attendee record ID, never the screen name — names are
 *  hand-typed, so they collide and they change.
 */
export function visibleMessagesFor(messages: CommsMessage[], viewer: MessageViewer): CommsMessage[] {
  return messages.filter((m) => {
    if (m.mediaKind && m.mediaStatus !== "Ready") return false;
    if (m.hidden && viewer.kind !== "staff") return false;
    if (m.sosType || m.channel === "Announcements") return true;
    if (viewer.kind === "staff") return m.channel === "Chat" || m.channel === "Staff";
    if (m.channel === "Chat") return viewer.checkedIn;
    if (m.channel !== "Staff") return false;
    return m.attendeeId === viewer.attendeeId || m.replyToAttendeeId === viewer.attendeeId;
  });
}

/** What a phone receives for one message: no Drive IDs or cross-base record
 *  IDs, plus the like count and whether this viewer liked it. */
export interface FeedMessage {
  id: string;
  attendeeId: string | null;
  replyToAttendeeId: string | null;
  authorName: string;
  vehicleCallsign: string;
  channel: Channel;
  sosType: SosType | null;
  body: string;
  photoUrl: string | null;
  isStaff: boolean;
  createdTime: string;
  mediaKind: MediaKind | null;
  mediaSize: number;
  fileName: string;
  hidden: boolean;
  likeCount: number;
  likedByMe: boolean;
}

/** The only message list that should ever leave the server. `likerKey` is
 *  who's asking, for the filled-in heart (see likerKeyFor). */
export async function getVisibleMessages(slug: string, viewer: MessageViewer, likerKey = ""): Promise<FeedMessage[]> {
  const [messages, likes] = await Promise.all([getAllMessages(slug), getEventLikes(slug)]);
  return visibleMessagesFor(messages, viewer).map((m) => {
    const mine = likes.filter((l) => l.messageId === m.id);
    return {
      id: m.id,
      attendeeId: m.attendeeId,
      replyToAttendeeId: m.replyToAttendeeId,
      authorName: m.authorName,
      vehicleCallsign: m.vehicleCallsign,
      channel: m.channel,
      sosType: m.sosType,
      body: m.body,
      photoUrl: m.photoUrl,
      isStaff: m.isStaff,
      createdTime: m.createdTime,
      mediaKind: m.mediaKind,
      mediaSize: m.mediaSize,
      fileName: m.driveFileName.replace(/^\d+ /, ""),
      hidden: m.hidden,
      likeCount: mine.length,
      likedByMe: Boolean(likerKey) && mine.some((l) => l.likerKey === likerKey),
    };
  });
}

/** One message this viewer is allowed to see, or null. What the media, like
 *  and hide routes check before touching anything. */
export async function getVisibleMessage(slug: string, viewer: MessageViewer, messageId: string): Promise<CommsMessage | null> {
  return visibleMessagesFor(await getAllMessages(slug), viewer).find((m) => m.id === messageId) || null;
}

/** Any message by ID, ignoring visibility — server-side upload steps only,
 *  where the caller already proved it opened this post (signed token). */
export async function getMessageForUpload(slug: string, messageId: string): Promise<CommsMessage | null> {
  return (await getAllMessages(slug)).find((m) => m.id === messageId) || null;
}

export async function updateMessage(slug: string, messageId: string, fields: AirtableFields): Promise<void> {
  assertConfigured();
  await updateRecord(MESSAGES_TABLE, messageId, fields, { baseId: BASE_ID });
  expire("messages", slug);
}

// ---------------------------------------------------------------------------
// Likes (photos only). One row per like, so two people tapping at once can't
// overwrite each other the way a shared counter field would.
// ---------------------------------------------------------------------------

interface Like {
  id: string;
  messageId: string;
  likerKey: string;
}

async function getEventLikes(slug: string): Promise<Like[]> {
  assertConfigured();
  const records = await listRecords(LIKES_TABLE, `{Event Slug} = '${escapeFormulaString(slug)}'`, {
    baseId: BASE_ID,
    revalidate: LIKES_CACHE_SECONDS,
    tags: [commsTag("likes", slug)],
  });
  return records.map((r) => ({
    id: r.id,
    messageId: (r.fields["Message Id"] as string) || "",
    likerKey: (r.fields["Liker Key"] as string) || "",
  }));
}

/** Attendees like as themselves (record ID). Staff share one code, so a staff
 *  phone likes as the name it's posting under. */
export function likerKeyFor(viewer: { staff: boolean; attendeeId?: string; staffName?: string }): string {
  if (viewer.staff) return `staff:${(viewer.staffName || "Staff").trim().toLowerCase().slice(0, 60)}`;
  return viewer.attendeeId || "";
}

export async function setLike(
  slug: string,
  messageId: string,
  liker: { key: string; name: string },
  liked: boolean,
): Promise<{ likeCount: number; liked: boolean }> {
  assertConfigured();
  const likes = (await getEventLikes(slug)).filter((l) => l.messageId === messageId);
  const mine = likes.filter((l) => l.likerKey === liker.key);
  if (liked && mine.length === 0) {
    await createRecord(
      LIKES_TABLE,
      { "Liker Key": liker.key, "Event Slug": slug, "Message Id": messageId, "Liker Name": liker.name },
      { baseId: BASE_ID },
    );
  } else if (!liked) {
    for (const like of mine) await deleteRecord(LIKES_TABLE, like.id, { baseId: BASE_ID });
  }
  expire("likes", slug);
  const others = likes.length - mine.length;
  return { likeCount: others + (liked ? 1 : 0), liked };
}

/** Who's calling a Tailgate API: staff (by code) or an attendee (by their
 *  personal token). Null when neither checks out. */
export async function resolveCommsCaller(
  settings: CommsSettings,
  credentials: { token?: string | null; staffCode?: string | null },
): Promise<{ staff: true; attendee: null; viewer: MessageViewer } | { staff: false; attendee: Attendee; viewer: MessageViewer } | null> {
  if (isStaffCode(settings, credentials.staffCode)) return { staff: true, attendee: null, viewer: { kind: "staff" } };
  const attendee = await getAttendeeByToken(settings.eventSlug, credentials.token || "");
  if (!attendee) return null;
  return {
    staff: false,
    attendee,
    viewer: { kind: "attendee", attendeeId: attendee.id, checkedIn: attendee.checkedIn },
  };
}

export interface PostMessageInput {
  eventSlug: string;
  attendeeId?: string;
  replyToAttendeeId?: string;
  authorName: string;
  vehicleCallsign: string;
  channel: Channel;
  sosType?: SosType;
  body: string;
  isStaff: boolean;
  media?: { kind: MediaKind; fileName: string; size: number; submissionId: string };
}

export async function postMessage(input: PostMessageInput): Promise<{ id: string }> {
  assertConfigured();
  const created = await createRecord(
    MESSAGES_TABLE,
    {
      "Event Slug": input.eventSlug,
      ...(input.attendeeId ? { "Attendee Id": input.attendeeId } : {}),
      ...(input.replyToAttendeeId ? { "Reply To Attendee Id": input.replyToAttendeeId } : {}),
      "Author Name": input.authorName,
      "Vehicle Callsign": input.vehicleCallsign,
      Channel: input.channel,
      ...(input.sosType ? { "SOS Type": input.sosType } : {}),
      Body: input.body,
      "Is Staff": input.isStaff,
      ...(input.media
        ? {
            "Media Kind": input.media.kind,
            "Media Status": "Uploading",
            "Drive File Name": input.media.fileName,
            "Media Size": input.media.size,
            "Media Submission Id": input.media.submissionId,
          }
        : {}),
    },
    { baseId: BASE_ID, typecast: true },
  );
  // Sender (and everyone else) sees it on the next poll.
  expire("messages", input.eventSlug);
  return { id: created.id };
}
