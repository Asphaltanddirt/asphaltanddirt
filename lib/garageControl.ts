import { listRecords, isAirtableConfigured } from "@/lib/airtable";
import { SITE_URL } from "@/lib/site";
import { getPublishedEvents, listRsvpsForEvent } from "@/lib/events";
import { getAttendeeRoster, getCommsSettings, isCommsOpen, type CommsSettings } from "@/lib/eventComms";
import { getEventResponses } from "@/lib/garageEvents";
import { getPhotoMarks } from "@/lib/garageMedia";
import { listGarageUsers, type GarageSession } from "@/lib/garageAuth";
import { listActiveRecipients } from "@/lib/newsletterSubscribers";
import { getOrdersInRange } from "@/lib/fourthwall-platform";
import { todayNY } from "@/lib/garageTasks";

/**
 * The Control Room: one screen that answers "is everything running, and what
 * needs me?" without opening Airtable, Vercel, Fourthwall and the site in four
 * tabs.
 *
 * Every read here is best-effort. A dead integration shows as a dash on its own
 * line rather than taking the whole screen down with it — the point of the
 * screen is to keep working on the morning something is broken.
 */

/** Who gets the Control Room. Jose only for now — Anthony gets added by
 *  putting his address on this list once the screen has settled. */
const CONTROL_ROOM = ["jrodrigues1278@gmail.com"];

export function canSeeControlRoom(session: GarageSession | null) {
  return Boolean(session && CONTROL_ROOM.includes(session.email.trim().toLowerCase()));
}

export type Health = "ok" | "warn" | "off";

export interface SystemRow {
  name: string;
  health: Health;
  note: string;
}

export interface ControlEvent {
  title: string;
  slug: string;
  date: string;
  daysOut: number;
  rsvps: number | null;
  crewGoing: number;
  crewSilent: number;
}

export interface ControlTailgate {
  id: string;
  slug: string;
  state: "Off" | "Armed" | "Open" | "On trail" | "Closed";
  detail: string;
  signedUp: number | null;
  checkedIn: number | null;
}

export interface ControlRoom {
  site: { ok: boolean; ms: number };
  deploy: { state: string; at: number; message: string } | null;
  event: ControlEvent | null;
  tailgate: ControlTailgate | null;
  queues: { applications: number | null; builds: number | null; reviews: number | null; flagged: number };
  audience: { newsletter: number | null; eventUpdates: number | null };
  store: { orders: number; revenue: number } | null;
  systems: SystemRow[];
}

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);

/** Is the public site answering, and how fast. Same check anyone would do by
 *  pulling up asphaltanddirt.com — just done for you. */
async function checkSite(): Promise<{ ok: boolean; ms: number }> {
  const started = Date.now();
  try {
    const res = await fetch(SITE_URL, {
      method: "HEAD",
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    return { ok: res.ok, ms: Date.now() - started };
  } catch {
    return { ok: false, ms: Date.now() - started };
  }
}

/** The last deploy Vercel ran: when it went out, whether it worked, and what
 *  the commit said. Answers "did my change go live?" without leaving the app. */
async function lastDeploy(): Promise<ControlRoom["deploy"]> {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return null;
  try {
    const url = new URL("https://api.vercel.com/v6/deployments");
    url.searchParams.set("projectId", projectId);
    url.searchParams.set("limit", "1");
    url.searchParams.set("target", "production");
    if (process.env.VERCEL_TEAM_ID) url.searchParams.set("teamId", process.env.VERCEL_TEAM_ID);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      deployments?: { state?: string; readyState?: string; created?: number; meta?: { githubCommitMessage?: string } }[];
    };
    const deployment = data.deployments?.[0];
    if (!deployment) return null;
    return {
      state: deployment.readyState || deployment.state || "UNKNOWN",
      at: deployment.created || 0,
      message: (deployment.meta?.githubCommitMessage || "").split("\n")[0],
    };
  } catch {
    return null;
  }
}

/** What's sitting in a queue waiting on an owner. */
async function queues() {
  const count = async (base: string | undefined, table: string, formula: string) => {
    if (!isAirtableConfigured(base)) return null;
    try {
      return (await listRecords(table, formula, { baseId: base })).length;
    } catch {
      return null;
    }
  };
  const [applications, builds, reviews, marks] = await Promise.all([
    count(process.env.AIRTABLE_BASE_ID, "Applications", `OR({Status} = 'Needs Review', {Status} = BLANK())`),
    count(process.env.AIRTABLE_BUILD_SUBMISSIONS_BASE_ID, "Build Submissions", `{Approved} = FALSE()`),
    count(process.env.AIRTABLE_TESTIMONIALS_BASE_ID, "Testimonials", `{Approved} = FALSE()`),
    getPhotoMarks().catch(() => []),
  ]);
  return { applications, builds, reviews, flagged: marks.filter((m) => m.flagReason).length };
}

/** The next event, plus who has answered — RSVPs from the public, and the
 *  crew's own Going/Maybe/Can't. */
async function nextEvent(): Promise<ControlEvent | null> {
  const events = await getPublishedEvents().catch(() => ({ upcoming: [], past: [] }));
  const event = events.upcoming[0];
  if (!event) return null;

  const [rsvps, responses, users] = await Promise.all([
    listRsvpsForEvent(event.id).then((r) => r.length).catch(() => null),
    getEventResponses([event.slug]).catch(() => []),
    listGarageUsers().catch(() => []),
  ]);

  const answered = new Set(responses.map((r) => r.email));
  return {
    title: event.title,
    slug: event.slug,
    date: event.date,
    daysOut: daysBetween(todayNY(), event.date),
    rsvps,
    crewGoing: responses.filter((r) => r.response === "Going").length,
    crewSilent: users.filter((u) => !answered.has(u.email)).length,
  };
}

/** Plain English for where Tailgate is: off, armed for its date, live, on the
 *  trail, or finished. */
function tailgateState(settings: CommsSettings): { state: ControlTailgate["state"]; detail: string } {
  if (!settings.active) return { state: "Off", detail: "Switched off — nobody can get in." };
  if (settings.trailStatus === "On trail") {
    return { state: "On trail", detail: `Rolled out. Trail channel ${settings.trailChannel || "—"}.` };
  }
  if (isCommsOpen(settings)) {
    const opened = new Date(settings.activatedAt!);
    return { state: "Open", detail: `Live since ${opened.toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.` };
  }
  if (!settings.activatedAt) {
    return { state: "Armed", detail: "Opens by itself the night before, with the reminder email." };
  }
  return { state: "Closed", detail: "The 48-hour window has run out." };
}

async function tailgate(slug: string | null): Promise<ControlTailgate | null> {
  if (!slug) return null;
  const settings = await getCommsSettings(slug).catch(() => null);
  if (!settings) return null;
  const roster = await getAttendeeRoster(slug).catch(() => null);
  return {
    id: settings.id,
    slug,
    ...tailgateState(settings),
    signedUp: roster ? roster.length : null,
    checkedIn: roster ? roster.filter((a) => a.checkedIn).length : null,
  };
}

/** Orders through the store in the last seven days. */
async function store(): Promise<ControlRoom["store"]> {
  if (!process.env.FOURTHWALL_API_USERNAME || !process.env.FOURTHWALL_API_PASSWORD) return null;
  try {
    const now = new Date();
    const orders = await getOrdersInRange(new Date(now.getTime() - 7 * 86_400_000), now);
    const real = orders.filter((o) => (o.source?.type || "ORDER") === "ORDER");
    return {
      orders: real.length,
      revenue: real.reduce((sum, o) => sum + (o.amounts?.total?.value || 0), 0),
    };
  } catch {
    return null;
  }
}

/** One line per moving part, so a missing key shows up here instead of in a
 *  broken page three days later. */
function systems(): SystemRow[] {
  const row = (name: string, present: unknown, note: string, missing: string): SystemRow =>
    present ? { name, health: "ok", note } : { name, health: "off", note: missing };

  return [
    row("Airtable", process.env.AIRTABLE_API_KEY, "Key set", "No API key — every list on the site is empty"),
    row("Garage base", process.env.AIRTABLE_GARAGE_BASE_ID, "Connected", "Not connected — sign-in and tasks won't work"),
    row("Tailgate base", process.env.AIRTABLE_EVENT_COMMS_BASE_ID, "Connected", "Not connected — no event chat"),
    row("Events base", process.env.AIRTABLE_EVENTS_BASE_ID, "Connected", "Not connected — no events or RSVPs"),
    row("Email (Resend)", process.env.RESEND_API_KEY, "Sending", "Off — no email goes out"),
    row("Google Drive", process.env.GOOGLE_DRIVE_REFRESH_TOKEN, "Uploads on", "Off — photo and video uploads fail"),
    row("Google sign-in", process.env.GARAGE_GOOGLE_CLIENT_ID && process.env.AUTH_SECRET, "Working", "Off — nobody can sign in here"),
    row("Store (checkout)", process.env.FOURTHWALL_STOREFRONT_TOKEN, "Live", "Off — merch pages are empty"),
    row("Store (orders)", process.env.FOURTHWALL_API_USERNAME, "Reporting on", "Off — no order or commission reports"),
    row("YouTube", process.env.YOUTUBE_REFRESH_TOKEN, "Connected", "Not connected — captions and stats are manual"),
    row("Scheduled jobs", process.env.CRON_SECRET, "Armed", "Off — reminders and weekly tasks won't run"),
  ];
}

export async function getControlRoom(): Promise<ControlRoom> {
  const [site, deploy, event, queueCounts, newsletter, eventUpdates, orders] = await Promise.all([
    checkSite(),
    lastDeploy(),
    nextEvent(),
    queues(),
    listActiveRecipients().then((r) => r.length).catch(() => null),
    listActiveRecipients(undefined, "Event Updates").then((r) => r.length).catch(() => null),
    store(),
  ]);

  return {
    site,
    deploy,
    event,
    tailgate: await tailgate(event?.slug ?? null),
    queues: queueCounts,
    audience: { newsletter, eventUpdates },
    store: orders,
    systems: systems(),
  };
}
