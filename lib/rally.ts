import { createRecord, listRecords, updateRecord, isAirtableConfigured, type AirtableRecord } from "@/lib/airtable";
import { todayNY } from "@/lib/garageTasks";
import { notifyRally } from "@/lib/notify";

/**
 * Rally Rewards by A&D (Jose, locked 2026-10-04). Spec:
 * `8. Events Page/Trail Rating/Ride rewards + event drop - spec (2026-09-27).md`.
 *
 * Show up, earn Rally Points, trade them for gear you can't buy.
 *  - 10 per A&D event you're recorded at (20 at a Special Event), from the
 *    Mud Run (10/17) on. Recorded = checked in at Tailgate, or for events
 *    without Tailgate, "I was there" tapped in the thank-you email and not
 *    marked No Show by an owner.
 *  - 5 head start, 5 in your birth month, 5 per store order (one a month;
 *    a cancelled/refunded order takes its 5 back).
 *  - Rank from lifetime points (claims never lower it): Rookie 0 · Regular 50
 *    · Mainstay 150 · Legend 300. FOUNDER is the original five: they never
 *    earn, and stay hidden until the reveal (RALLY_FOUNDERS_REVEALED).
 *
 * Everything lives in the A&D Rally Rewards base. Points are a ledger: every
 * row has a unique Key ("event|<slug>|<email>"), so a sweep can run as often
 * as it likes without counting anything twice.
 *
 * RALLY_LIVE gates everything riders can see (email lines, the page in the
 * sitemap/nav). Points are earned in the background either way, so the Mud
 * Run counts even if launch comes later.
 */

export const RALLY_BASE_ID = process.env.AIRTABLE_RALLY_BASE_ID || "appZaIByrT1nYMXpG";
const EVENTS_BASE_ID = process.env.AIRTABLE_EVENTS_BASE_ID || "app5LS6dvcTKdxGqr";
const COMMS_BASE_ID = process.env.AIRTABLE_EVENT_COMMS_BASE_ID;
const ORDERS_BASE_ID = process.env.AIRTABLE_NEWSLETTER_BASE_ID;
const ORDERS = process.env.AIRTABLE_ORDERS_TABLE || "Orders";

export const RALLY_START = "2026-10-17";
/** Launch = the reveal (Jose 10/4, option B): the Mud Run thank-you email tells
 *  riders they already earned. Goes live by itself on RALLY_LAUNCH_DATE
 *  (default the Mud Run, 10/17) or any time RALLY_LIVE=true. A function, not a
 *  constant, so a warm server crosses midnight correctly. */
export const RALLY_LAUNCH_DATE = process.env.RALLY_LAUNCH_DATE || "2026-10-17";
export function rallyLive(): boolean {
  return process.env.RALLY_LIVE === "true" || todayNY() >= RALLY_LAUNCH_DATE;
}
export const FOUNDERS_REVEALED = process.env.RALLY_FOUNDERS_REVEALED === "true";

export const POINTS = { event: 10, special: 20, headStart: 5, birthday: 5, order: 5 } as const;

export const RANKS = [
  { name: "Rookie", min: 0 },
  { name: "Regular", min: 50 },
  { name: "Mainstay", min: 150 },
  { name: "Legend", min: 300 },
] as const;
export type RankName = (typeof RANKS)[number]["name"];

export function isRallyConfigured() {
  return isAirtableConfigured(RALLY_BASE_ID);
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
export const normEmail = (e: string) => e.trim().toLowerCase();
const esc = (s: string) => s.replace(/'/g, "\\'");

export function rankFor(lifetime: number): RankName {
  let rank: RankName = "Rookie";
  for (const r of RANKS) if (lifetime >= r.min) rank = r.name;
  return rank;
}

export function rankIndex(rank: string): number {
  return RANKS.findIndex((r) => r.name === rank);
}

/** The next rank and how many lifetime points it still needs. */
export function nextRank(lifetime: number): { name: RankName; need: number } | null {
  const next = RANKS.find((r) => r.min > lifetime);
  return next ? { name: next.name, need: next.min - lifetime } : null;
}

// ---------------------------------------------------------------- riders

export interface Rider {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  birthMonth: number | null;
  birthYear: number | null;
  founder: boolean;
  boardOptOut: boolean;
  lastRank: string;
}

function toRider(r: AirtableRecord): Rider {
  const f = r.fields;
  return {
    id: r.id,
    email: normEmail(str(f.Email)),
    firstName: str(f["First Name"]),
    lastName: str(f["Last Name"]),
    birthMonth: typeof f["Birth Month"] === "number" ? f["Birth Month"] : null,
    birthYear: typeof f["Birth Year"] === "number" ? f["Birth Year"] : null,
    founder: f.Founder === true,
    boardOptOut: f["Board Opt Out"] === true,
    lastRank: str(f["Last Rank"]),
  };
}

export async function listRiders(): Promise<Map<string, Rider>> {
  const rows = await listRecords("Riders", undefined, { baseId: RALLY_BASE_ID });
  const map = new Map<string, Rider>();
  for (const r of rows) {
    const rider = toRider(r);
    if (rider.email && !map.has(rider.email)) map.set(rider.email, rider);
  }
  return map;
}

export async function getRider(email: string): Promise<Rider | null> {
  const e = normEmail(email);
  if (!e) return null;
  const [row] = await listRecords("Riders", `LOWER({Email}) = '${esc(e)}'`, { baseId: RALLY_BASE_ID });
  return row ? toRider(row) : null;
}

function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] || "", last: parts.length > 1 ? parts[parts.length - 1] : "" };
}

export type CreatedFrom = "RSVP" | "Check-in" | "Subscribe" | "Order" | "Sign-in" | "Garage";

/**
 * The rider for this email, made if new (accounts come from any email: RSVP,
 * subscribe, order). A new rider gets the head start. Pass `riders` / `keys`
 * from a sweep to save lookups; both are updated in place.
 */
export async function ensureRider(
  email: string,
  name: string,
  from: CreatedFrom,
  ctx?: { riders: Map<string, Rider>; keys: Set<string> },
): Promise<Rider | null> {
  const e = normEmail(email);
  if (!e || !e.includes("@") || !isRallyConfigured()) return null;
  const existing = ctx ? ctx.riders.get(e) : await getRider(e);
  if (existing) {
    // Fill in a name we didn't have, never overwrite one.
    if (!existing.firstName && name.trim()) {
      const { first, last } = splitName(name);
      await updateRecord("Riders", existing.id, { "First Name": first, "Last Name": last }, { baseId: RALLY_BASE_ID });
      existing.firstName = first;
      existing.lastName = last;
    }
    return existing;
  }
  const { first, last } = splitName(name);
  const row = await createRecord(
    "Riders",
    { Email: e, "First Name": first, "Last Name": last, "Created From": from, "Last Rank": "Rookie" },
    { baseId: RALLY_BASE_ID, typecast: true },
  );
  const rider = toRider(row as AirtableRecord);
  ctx?.riders.set(e, rider);
  await addPoints({ key: `head|${e}`, email: e, points: POINTS.headStart, reason: "Head start", label: "Head start" }, ctx?.keys);
  return rider;
}

/** Same as ensureRider, but never throws: for forms (RSVP, subscribe) that
 *  must not fail because the rewards base had a hiccup. */
export async function ensureRiderQuietly(email: string, name: string, from: CreatedFrom): Promise<void> {
  try {
    await ensureRider(email, name, from);
  } catch (err) {
    console.error("rally: ensureRider failed", err);
  }
}

// ---------------------------------------------------------------- ledger

export type Reason = "Head start" | "Event" | "Special event" | "Birthday" | "Order" | "Refund" | "Claim" | "Adjustment";

export interface LedgerEntry {
  key: string;
  email: string;
  points: number;
  reason: Reason;
  eventSlug?: string;
  label: string;
  date: string;
  by?: string;
}

async function keyExists(key: string): Promise<boolean> {
  const rows = await listRecords("Ledger", `{Key} = '${esc(key)}'`, { baseId: RALLY_BASE_ID });
  return rows.length > 0;
}

/** Adds a ledger row unless its Key is already there. Returns whether it was added. */
export async function addPoints(entry: Omit<LedgerEntry, "date"> & { date?: string }, keys?: Set<string>): Promise<boolean> {
  if (keys ? keys.has(entry.key) : await keyExists(entry.key)) return false;
  await createRecord(
    "Ledger",
    {
      Key: entry.key,
      Email: normEmail(entry.email),
      Points: entry.points,
      Reason: entry.reason,
      ...(entry.eventSlug ? { "Event Slug": entry.eventSlug } : {}),
      Label: entry.label,
      Date: entry.date || todayNY(),
      ...(entry.by ? { By: entry.by } : {}),
    },
    { baseId: RALLY_BASE_ID, typecast: true },
  );
  keys?.add(entry.key);
  return true;
}

export interface Standing {
  email: string;
  balance: number;
  lifetime: number;
  rank: RankName;
  next: { name: RankName; need: number } | null;
  entries: LedgerEntry[];
}

function toEntry(r: AirtableRecord): LedgerEntry {
  const f = r.fields;
  return {
    key: str(f.Key),
    email: normEmail(str(f.Email)),
    points: typeof f.Points === "number" ? f.Points : 0,
    reason: str(f.Reason) as Reason,
    eventSlug: str(f["Event Slug"]) || undefined,
    label: str(f.Label),
    date: str(f.Date),
    by: str(f.By) || undefined,
  };
}

function standingOf(email: string, entries: LedgerEntry[]): Standing {
  const balance = entries.reduce((n, e) => n + e.points, 0);
  // Lifetime = everything earned. Claims spend points but never lower a rank;
  // refunds and owner adjustments do (they correct what was earned).
  const lifetime = Math.max(0, entries.filter((e) => e.reason !== "Claim").reduce((n, e) => n + e.points, 0));
  return { email, balance, lifetime, rank: rankFor(lifetime), next: nextRank(lifetime), entries: entries.sort((a, b) => b.date.localeCompare(a.date)) };
}

export async function loadLedger(): Promise<LedgerEntry[]> {
  const rows = await listRecords("Ledger", undefined, { baseId: RALLY_BASE_ID });
  return rows.map(toEntry);
}

export async function allStandings(): Promise<Map<string, Standing>> {
  const byEmail = new Map<string, LedgerEntry[]>();
  for (const e of await loadLedger()) {
    if (!e.email) continue;
    byEmail.set(e.email, [...(byEmail.get(e.email) || []), e]);
  }
  const out = new Map<string, Standing>();
  for (const [email, entries] of byEmail) out.set(email, standingOf(email, entries));
  return out;
}

export async function getStanding(email: string): Promise<Standing> {
  const e = normEmail(email);
  const rows = await listRecords("Ledger", `LOWER({Email}) = '${esc(e)}'`, { baseId: RALLY_BASE_ID });
  return standingOf(e, rows.map(toEntry));
}

/** "Rookie · 15 Rally Points (35 to Regular)" — the line the emails carry. */
export function standingLine(s: Pick<Standing, "rank" | "balance" | "next">): string {
  const next = s.next ? ` (${s.next.need} to ${s.next.name})` : "";
  return `${s.rank} · ${s.balance} Rally Point${s.balance === 1 ? "" : "s"}${next}`;
}

// ---------------------------------------------------------------- the sweep

interface EventRow {
  id: string;
  slug: string;
  title: string;
  date: string;
  special: boolean;
}

async function eventsToCount(today: string): Promise<EventRow[]> {
  const rows = await listRecords(
    "Events",
    `AND({Status} = 'Published', NOT({Photos Only}), NOT(IS_BEFORE({Date}, '${RALLY_START}')), NOT(IS_AFTER({Date}, '${today}')))`,
    { baseId: EVENTS_BASE_ID },
  );
  return rows.map((r) => ({
    id: r.id,
    slug: str(r.fields.Slug),
    title: str(r.fields.Title),
    date: str(r.fields.Date),
    special: r.fields["Special Event"] === true,
  }));
}

/** Who was at an event: Tailgate check-ins when the event ran Tailgate,
 *  otherwise RSVPs who tapped "I was there" and weren't marked No Show. */
export async function attendeesOf(ev: EventRow): Promise<{ email: string; name: string; via: "Check-in" | "RSVP" }[]> {
  if (COMMS_BASE_ID && isAirtableConfigured(COMMS_BASE_ID)) {
    const [settings] = await listRecords("Event Settings", `{Event Slug} = '${esc(ev.slug)}'`, { baseId: COMMS_BASE_ID });
    if (settings && settings.fields["Activated At"]) {
      const rows = await listRecords("Attendees", `AND({Event Slug} = '${esc(ev.slug)}', {Checked In})`, { baseId: COMMS_BASE_ID });
      return rows
        .map((r) => ({ email: normEmail(str(r.fields.Email)), name: str(r.fields["Legal Name"]) || str(r.fields["Screen Name"]), via: "Check-in" as const }))
        .filter((a) => a.email);
    }
  }
  // {Event} in a formula gives titles, not ids, so match the link in code.
  const linked = await listRecords("RSVPs", `AND({Status} = 'Confirmed', {Was There} != '', NOT({No Show}))`, { baseId: EVENTS_BASE_ID });
  return linked
    .filter((r) => ((r.fields.Event as string[]) || []).includes(ev.id))
    .map((r) => ({ email: normEmail(str(r.fields.Email)), name: str(r.fields.Name), via: "RSVP" as const }))
    .filter((a) => a.email);
}

/** Points for one person at one event right away (the "I was there" tap),
 *  instead of waiting for the daily sweep. Same Key, so never twice. */
export async function creditRsvp(rsvpId: string): Promise<boolean> {
  const [row] = await listRecords("RSVPs", `RECORD_ID() = '${esc(rsvpId)}'`, { baseId: EVENTS_BASE_ID });
  if (!row || row.fields["No Show"] === true || str(row.fields.Status) !== "Confirmed") return false;
  const email = normEmail(str(row.fields.Email));
  const eventId = ((row.fields.Event as string[]) || [])[0];
  if (!email || !eventId) return false;
  const today = todayNY();
  const ev = (await eventsToCount(today)).find((e) => e.id === eventId);
  if (!ev) return false;
  const rider = await ensureRider(email, str(row.fields.Name), "RSVP");
  if (!rider || rider.founder) return false;
  return addPoints({
    key: `event|${ev.slug}|${email}`,
    email,
    points: ev.special ? POINTS.special : POINTS.event,
    reason: ev.special ? "Special event" : "Event",
    eventSlug: ev.slug,
    label: ev.title,
    date: ev.date,
  });
}

/** Credit everyone checked in at one event now (before its thank-you email
 *  goes out, so the email can show the new total). */
export async function creditEvent(slug: string): Promise<number> {
  if (!isRallyConfigured()) return 0;
  const ev = (await eventsToCount(todayNY())).find((e) => e.slug === slug);
  if (!ev) return 0;
  let n = 0;
  for (const a of await attendeesOf(ev)) {
    const rider = await ensureRider(a.email, a.name, a.via);
    if (!rider || rider.founder) continue;
    const added = await addPoints({
      key: `event|${ev.slug}|${a.email}`,
      email: a.email,
      points: ev.special ? POINTS.special : POINTS.event,
      reason: ev.special ? "Special event" : "Event",
      eventSlug: ev.slug,
      label: ev.title,
      date: ev.date,
    });
    if (added) n++;
  }
  return n;
}

/** The email line for one rider, or "" (not launched, no rider, a founder). */
export async function rallyLineFor(email: string): Promise<string> {
  if (!rallyLive() || !isRallyConfigured() || !email) return "";
  try {
    const rider = await getRider(email);
    if (!rider || rider.founder) return "";
    return standingLine(await getStanding(email));
  } catch {
    return "";
  }
}

/** The thank-you email's line, and whether this is the rider's first event
 *  (then the email says so: the reveal). */
export async function rallyThanksFor(email: string): Promise<{ line: string; first: boolean } | null> {
  const line = await rallyLineFor(email);
  if (!line) return null;
  const s = await getStanding(email).catch(() => null);
  const events = s ? s.entries.filter((e) => e.reason === "Event" || e.reason === "Special event").length : 0;
  return { line, first: events <= 1 };
}

export interface RallySweep {
  riders: number;
  added: { event: number; birthday: number; order: number; refund: number };
  rankUps: string[];
}

/**
 * The daily sweep (cron /api/cron/rally): event points, birthdays, store
 * orders and refunds, then rank-ups (an owner push to celebrate in the FB
 * Group). Safe to run any number of times.
 */
export async function runRallySweep(): Promise<RallySweep> {
  const today = todayNY();
  const out: RallySweep = { riders: 0, added: { event: 0, birthday: 0, order: 0, refund: 0 }, rankUps: [] };
  if (!isRallyConfigured()) return out;

  const [riders, ledger] = await Promise.all([listRiders(), loadLedger()]);
  const keys = new Set(ledger.map((e) => e.key));
  const ctx = { riders, keys };

  // 1. Events.
  for (const ev of await eventsToCount(today)) {
    for (const a of await attendeesOf(ev)) {
      const rider = await ensureRider(a.email, a.name, a.via, ctx);
      if (!rider || rider.founder) continue;
      const added = await addPoints(
        {
          key: `event|${ev.slug}|${a.email}`,
          email: a.email,
          points: ev.special ? POINTS.special : POINTS.event,
          reason: ev.special ? "Special event" : "Event",
          eventSlug: ev.slug,
          label: ev.title,
          date: ev.date,
        },
        keys,
      );
      if (added) out.added.event++;
    }
  }

  // 2. Birthdays: once in the birth month, each year.
  const [year, month] = today.split("-").map(Number);
  for (const r of riders.values()) {
    if (r.founder || r.birthMonth !== month) continue;
    if (await addPoints({ key: `bday|${r.email}|${year}`, email: r.email, points: POINTS.birthday, reason: "Birthday", label: "Birthday" }, keys)) {
      out.added.birthday++;
    }
  }

  // 3. Store orders: 5 per order, one a month; a cancelled/refunded order
  //    takes its points back.
  if (ORDERS_BASE_ID && isAirtableConfigured(ORDERS_BASE_ID)) {
    const orders = await listRecords(ORDERS, `NOT(IS_BEFORE({Order Date}, '${RALLY_START}'))`, { baseId: ORDERS_BASE_ID });
    const sorted = orders.sort((a, b) => str(a.fields["Order Date"]).localeCompare(str(b.fields["Order Date"])));
    for (const o of sorted) {
      const email = normEmail(str(o.fields.Email));
      const id = str(o.fields["Fourthwall Order ID"]) || o.id;
      const date = str(o.fields["Order Date"]);
      const status = str(o.fields["Fourthwall Status"]).toUpperCase();
      if (!email || str(o.fields.Channel) === "Samples/Other") continue;
      const orderKey = `order|${id}`;
      const undone = /CANCEL|REFUND/.test(status);
      if (undone) {
        if (keys.has(orderKey) && (await addPoints({ key: `refund|${id}`, email, points: -POINTS.order, reason: "Refund", label: `Order ${str(o.fields.Order) || id} refunded` }, keys))) {
          out.added.refund++;
        }
        continue;
      }
      if (keys.has(orderKey)) continue;
      const rider = await ensureRider(email, str(o.fields["First Name"]), "Order", ctx);
      if (!rider || rider.founder) continue;
      const monthKey = `ordermonth|${email}|${date.slice(0, 7)}`;
      if (keys.has(monthKey)) continue;
      await addPoints({ key: orderKey, email, points: POINTS.order, reason: "Order", label: `Order ${str(o.fields.Order) || id}`, date }, keys);
      // A marker row (0 points) so a second order that month earns nothing.
      await addPoints({ key: monthKey, email, points: 0, reason: "Order", label: `Order points used for ${date.slice(0, 7)}`, date }, keys);
      out.added.order++;
    }
  }

  // 4. Rank-ups.
  const standings = await allStandings();
  out.riders = riders.size;
  for (const r of riders.values()) {
    if (r.founder) continue;
    const s = standings.get(r.email);
    if (!s) continue;
    const was = rankIndex(r.lastRank || "Rookie");
    const now = rankIndex(s.rank);
    if (now > was) {
      await updateRecord("Riders", r.id, { "Last Rank": s.rank }, { baseId: RALLY_BASE_ID });
      const name = boardName(r) || r.email;
      out.rankUps.push(`${name} → ${s.rank}`);
      await notifyRally({
        id: `rankup-${r.id}-${s.rank}`,
        title: `Rank up: ${name} is now a ${s.rank}`,
        body: "Celebrate it in the FB Group (rank image in Rally Rewards marks / social).",
        url: "/garage/rally",
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------- the board

/** "Bob R." — first name + last initial (Jose 10/4). */
export function boardName(r: Pick<Rider, "firstName" | "lastName">): string {
  const first = r.firstName.trim();
  if (!first) return "";
  const initial = r.lastName.trim().charAt(0).toUpperCase();
  return initial ? `${first} ${initial}.` : first;
}

export interface BoardRow {
  name: string;
  rank: RankName | "Founder";
  lifetime: number;
}

export async function getBoard(): Promise<{ founders: BoardRow[]; riders: BoardRow[] }> {
  if (!isRallyConfigured()) return { founders: [], riders: [] };
  const [riders, standings] = await Promise.all([listRiders(), allStandings()]);
  const rows: BoardRow[] = [];
  const founders: BoardRow[] = [];
  for (const r of riders.values()) {
    if (r.boardOptOut) continue;
    const name = boardName(r);
    if (!name) continue;
    if (r.founder) {
      if (FOUNDERS_REVEALED) founders.push({ name, rank: "Founder", lifetime: 0 });
      continue;
    }
    const s = standings.get(r.email);
    if (!s || s.lifetime <= 0) continue;
    rows.push({ name, rank: s.rank, lifetime: s.lifetime });
  }
  rows.sort((a, b) => b.lifetime - a.lifetime || a.name.localeCompare(b.name));
  return { founders, riders: rows };
}

// ---------------------------------------------------------------- shelf + claims

export interface ShelfItem {
  id: string;
  item: string;
  points: number;
  type: "Gear" | "Rank gear" | "Experience";
  rankNeeded: RankName | "";
  blurb: string;
  sizes: string[];
  image: string;
  productUrl: string;
}

/** The 250 experience is all of these together (Jose 10/4). */
export const EXPERIENCE_PARTS = ["Pick the ride", "Lead the ride", "Featured in photos + video from that ride", "Your story in The Dirt Line"] as const;

export async function getShelf(): Promise<ShelfItem[]> {
  if (!isRallyConfigured()) return [];
  const rows = await listRecords("Shelf", "{Active}", { baseId: RALLY_BASE_ID, revalidate: 300 });
  return rows
    .sort((a, b) => Number(a.fields.Sort || 0) - Number(b.fields.Sort || 0))
    .map((r) => ({
      id: r.id,
      item: str(r.fields.Item),
      points: typeof r.fields.Points === "number" ? r.fields.Points : 0,
      type: (str(r.fields.Type) || "Gear") as ShelfItem["type"],
      rankNeeded: str(r.fields["Rank Needed"]) as ShelfItem["rankNeeded"],
      blurb: str(r.fields.Blurb),
      sizes: str(r.fields.Sizes).split(",").map((s) => s.trim()).filter(Boolean),
      image: ((r.fields.Image as { url: string }[] | undefined) || [])[0]?.url || "",
      productUrl: str(r.fields["Product URL"]),
    }));
}

export function isAdult(rider: Pick<Rider, "birthMonth" | "birthYear">, today = todayNY()): boolean {
  if (!rider.birthYear || !rider.birthMonth) return false;
  const [y, m] = today.split("-").map(Number);
  const age = y - rider.birthYear - (m < rider.birthMonth ? 1 : 0);
  return age >= 18;
}

/**
 * A claim: checks the rider can (18+, enough points, rank for rank gear —
 * anyone at that rank or higher, so a Legend can order a Rookie shirt for
 * someone), takes the points and makes a Claims row for an owner to fulfil.
 */
export async function makeClaim(input: {
  email: string;
  itemId: string;
  size?: string;
  rank?: string;
  choice?: string;
  notes?: string;
}): Promise<{ ok: true; claimId: string } | { ok: false; error: string }> {
  const email = normEmail(input.email);
  const rider = await getRider(email);
  if (!rider) return { ok: false, error: "We couldn't find your account." };
  if (rider.founder) return { ok: false, error: "Founders don't claim from the locker." };
  if (!isAdult(rider)) return { ok: false, error: "Add your birth month and year first (Rally Rewards is 18+)." };
  const item = (await getShelf()).find((i) => i.id === input.itemId);
  if (!item) return { ok: false, error: "That item isn't in the locker any more." };
  const standing = await getStanding(email);
  if (standing.balance < item.points) return { ok: false, error: `You need ${item.points - standing.balance} more points for this.` };

  let rankChoice = "";
  if (item.type === "Rank gear") {
    rankChoice = input.rank && rankIndex(input.rank) >= 0 ? input.rank : standing.rank;
    if (rankIndex(rankChoice) > rankIndex(standing.rank)) return { ok: false, error: `You can claim ${rankChoice} gear once you're a ${rankChoice}.` };
  }
  if (item.rankNeeded && rankIndex(standing.rank) < rankIndex(item.rankNeeded)) {
    return { ok: false, error: `This one opens up at ${item.rankNeeded}.` };
  }
  if (item.sizes.length && !(input.size && item.sizes.includes(input.size))) return { ok: false, error: "Pick a size." };
  const choice = rankChoice;

  const now = new Date();
  const row = await createRecord(
    "Claims",
    {
      Claim: `${item.item}${choice ? ` (${choice})` : ""} · ${boardName(rider) || email}`,
      Email: email,
      Item: item.item,
      Points: item.points,
      ...(input.size ? { Size: input.size } : {}),
      ...(choice ? { Choice: choice } : {}),
      Status: "New",
      ...(input.notes ? { Notes: input.notes.slice(0, 2000) } : {}),
      "Claimed At": now.toISOString(),
    },
    { baseId: RALLY_BASE_ID, typecast: true },
  );
  const claimId = (row as AirtableRecord).id;
  await addPoints({ key: `claim|${claimId}`, email, points: -item.points, reason: "Claim", label: item.item });
  await notifyRally({
    id: `claim-${claimId}`,
    title: "New Rally claim",
    body: `${boardName(rider) || email}: ${item.item}${choice ? ` (${choice})` : ""}${input.size ? `, ${input.size}` : ""}`,
    url: "/garage/rally",
  });
  return { ok: true, claimId };
}

export async function saveProfile(
  email: string,
  input: { firstName?: string; lastName?: string; birthMonth?: number; birthYear?: number; boardOptOut?: boolean },
): Promise<Rider | null> {
  const rider = (await getRider(email)) || (await ensureRider(email, "", "Sign-in"));
  if (!rider) return null;
  const fields: Record<string, unknown> = {};
  if (input.firstName !== undefined) fields["First Name"] = input.firstName.trim().slice(0, 60);
  if (input.lastName !== undefined) fields["Last Name"] = input.lastName.trim().slice(0, 60);
  if (input.birthMonth && input.birthMonth >= 1 && input.birthMonth <= 12) fields["Birth Month"] = input.birthMonth;
  const thisYear = Number(todayNY().slice(0, 4));
  if (input.birthYear && input.birthYear > thisYear - 110 && input.birthYear <= thisYear) fields["Birth Year"] = input.birthYear;
  if (input.boardOptOut !== undefined) fields["Board Opt Out"] = input.boardOptOut;
  if (Object.keys(fields).length) await updateRecord("Riders", rider.id, fields, { baseId: RALLY_BASE_ID });
  return getRider(email);
}

// ---------------------------------------------------------------- Garage

export interface ClaimRow {
  id: string;
  claim: string;
  email: string;
  item: string;
  points: number;
  size: string;
  choice: string;
  status: string;
  notes: string;
  claimedAt: string;
}

export async function listClaims(): Promise<ClaimRow[]> {
  const rows = await listRecords("Claims", undefined, { baseId: RALLY_BASE_ID });
  return rows
    .map((r) => ({
      id: r.id,
      claim: str(r.fields.Claim),
      email: str(r.fields.Email),
      item: str(r.fields.Item),
      points: typeof r.fields.Points === "number" ? r.fields.Points : 0,
      size: str(r.fields.Size),
      choice: str(r.fields.Choice),
      status: str(r.fields.Status) || "New",
      notes: str(r.fields.Notes),
      claimedAt: str(r.fields["Claimed At"]),
    }))
    .sort((a, b) => b.claimedAt.localeCompare(a.claimedAt));
}

/** Owner closes or cancels a claim. Cancelling gives the points back. */
export async function setClaimStatus(id: string, status: "In progress" | "Done" | "Cancelled", by: string): Promise<void> {
  const [row] = await listRecords("Claims", `RECORD_ID() = '${esc(id)}'`, { baseId: RALLY_BASE_ID });
  if (!row) throw new Error("Claim not found.");
  await updateRecord("Claims", id, { Status: status }, { baseId: RALLY_BASE_ID, typecast: true });
  if (status === "Cancelled") {
    const points = typeof row.fields.Points === "number" ? row.fields.Points : 0;
    await addPoints({ key: `unclaim|${id}`, email: str(row.fields.Email), points, reason: "Claim", label: `Cancelled: ${str(row.fields.Item)}`, by });
  }
}

/** Owner adjustment (a walk-up recorded late, a correction). */
export async function adjustPoints(email: string, points: number, label: string, by: string): Promise<void> {
  const e = normEmail(email);
  await ensureRider(e, "", "Garage");
  await addPoints({ key: `adj|${e}|${Date.now()}`, email: e, points, reason: "Adjustment", label: label.slice(0, 120), by });
}
