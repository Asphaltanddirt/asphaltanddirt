import { listRecords, updateRecord, isAirtableConfigured, SOCIAL_BASE_ID } from "@/lib/airtable";
import { isThreadsConnected, threadsKeywordSearch, type ThreadsFound } from "@/lib/threadsPost";

/**
 * Garage → Engage (Jose 2026-10-03): the accounts Jose comments on as A&D
 * during his ~3 hours a day at his son's therapy. FB Pages, Threads and X
 * only, as the brand, every comment by hand. Targets live in the Social Ops
 * base's "Engage Targets" table (seeded from the 10/3 research); Done stamps
 * Last Engaged so the daily list rotates through everyone.
 */

const BASE_ID = SOCIAL_BASE_ID;
const TABLE = "Engage Targets";
/** How many accounts make up one session. */
export const SESSION_SIZE = 12;
/** Friends and local accounts come round more often than shops or big accounts. */
const TIER_WEIGHT: Record<string, number> = {
  "Friends & peers": 3,
  "Local off-road": 2,
  "Local asphalt": 2,
  "Places & shops": 1.5,
  "Bigger accounts": 1,
};
export const TIER_ORDER = Object.keys(TIER_WEIGHT);

export interface EngageTarget {
  id: string;
  name: string;
  platform: string;
  url: string;
  tier: string;
  side: string;
  followers: number | null;
  why: string;
  active: boolean;
  lastEngaged: string;
  timesEngaged: number;
  skippedOn: string;
  /** Newest post seen from them; recent posters come first (Jose 10/3). */
  lastPostSeen: string;
  snoozeUntil: string;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

export function todayNY(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
}
const dayNY = (iso: string) => (iso ? todayNY(new Date(iso)) : "");

export async function getEngageTargets(): Promise<EngageTarget[]> {
  if (!isAirtableConfigured(BASE_ID)) return [];
  const rows = await listRecords(TABLE, undefined, { baseId: BASE_ID });
  return rows.map((r) => ({
    id: r.id,
    name: str(r.fields.Name),
    platform: str(r.fields.Platform),
    url: str(r.fields.URL),
    tier: str(r.fields.Tier),
    side: str(r.fields.Side),
    followers: typeof r.fields.Followers === "number" ? r.fields.Followers : null,
    why: str(r.fields.Why),
    active: r.fields.Active === true,
    lastEngaged: str(r.fields["Last Engaged"]),
    timesEngaged: typeof r.fields["Times Engaged"] === "number" ? r.fields["Times Engaged"] : 0,
    skippedOn: str(r.fields["Skipped On"]).slice(0, 10),
    lastPostSeen: str(r.fields["Last Post Seen"]).slice(0, 10),
    snoozeUntil: str(r.fields["Snooze Until"]).slice(0, 10),
  }));
}

/**
 * Today's session: active accounts not done or skipped today, ranked by how
 * long since we last engaged (never = top) times the tier weight, so friends
 * and local clubs come round about every few days and big accounts less.
 */
export function planSession(targets: EngageTarget[], now = new Date()) {
  const today = todayNY(now);
  const active = targets.filter((t) => t.active && t.url);
  const doneToday = active.filter((t) => dayNY(t.lastEngaged) === today);
  const pool = active.filter(
    (t) => dayNY(t.lastEngaged) !== today && t.skippedOn !== today && !(t.snoozeUntil && t.snoozeUntil > today),
  );
  // Accounts that posted in the last week are worth a comment now (Jose 10/3:
  // "some of these people have not posted in months"); quiet ones sink.
  const fresh = (t: EngageTarget) => {
    if (!t.lastPostSeen) return 1;
    const age = (now.getTime() - new Date(`${t.lastPostSeen}T12:00:00Z`).getTime()) / 86_400_000;
    return age <= 7 ? 2.5 : age <= 14 ? 1 : 0.3;
  };
  const score = (t: EngageTarget) => {
    const days = t.lastEngaged ? (now.getTime() - new Date(t.lastEngaged).getTime()) / 86_400_000 : 30;
    return Math.min(days, 30) * (TIER_WEIGHT[t.tier] ?? 1) * fresh(t);
  };
  const session = [...pool].sort((a, b) => score(b) - score(a)).slice(0, Math.max(0, SESSION_SIZE - doneToday.length));
  return { today, session, doneToday, active };
}

export type EngageAction = "done" | "skip" | "pause" | "undo" | "quiet";

export async function engageAction(id: string, action: EngageAction, current: EngageTarget): Promise<void> {
  if (!/^rec[A-Za-z0-9]{14}$/.test(id)) throw new Error("bad id");
  const fields =
    action === "done"
      ? { "Last Engaged": new Date().toISOString(), "Times Engaged": current.timesEngaged + 1 }
      : action === "skip"
        ? { "Skipped On": todayNY() }
        : action === "pause"
          ? { Active: false }
          : action === "quiet"
            ? // Nothing new on their page: hide for two weeks.
              { "Snooze Until": todayNY(new Date(Date.now() + 14 * 86_400_000)) }
          : // Undo today's Done: the count goes back; the previous date isn't kept.
            { "Last Engaged": null, "Times Engaged": Math.max(0, current.timesEngaged - 1) };
  await updateRecord(TABLE, id, fields, { baseId: BASE_ID });
}

/** Local topics searched on Threads alongside the target accounts. */
const THREADS_TOPICS = ["Pine Barrens jeep", "NJ jeep", "jeep wrangler new jersey", "cars and coffee NJ", "NJ car meet", "AOAA"];

/**
 * Fresh Threads posts worth a reply: newest posts (3 days) from our Threads
 * targets plus local topics, newest first, de-duplicated. Empty until Meta
 * approves threads_keyword_search (until then search only sees our own posts).
 */
export async function freshThreadsPosts(targets: EngageTarget[], max = 15): Promise<ThreadsFound[]> {
  if (!(await isThreadsConnected().catch(() => false))) return [];
  // Search needs a keyword even when filtering by account, so use the side's
  // core word ("jeep" for dirt accounts, "car" for asphalt ones).
  const authors = targets
    .filter((t) => t.active && t.platform === "Threads")
    .map((t) => ({ handle: t.url.match(/@([A-Za-z0-9._]+)/)?.[1] || "", q: t.side === "Asphalt" ? "car" : "jeep" }))
    .filter((a) => a.handle);
  const searches = [
    ...authors.map((a) => threadsKeywordSearch(a.q, { author: a.handle, limit: 3 }).catch(() => [] as ThreadsFound[])),
    ...THREADS_TOPICS.map((q) => threadsKeywordSearch(q, { limit: 5 }).catch(() => [] as ThreadsFound[])),
  ];
  const seen = new Set<string>();
  return (await Promise.all(searches))
    .flat()
    .filter((p) => !seen.has(p.id) && seen.add(p.id))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, max);
}
