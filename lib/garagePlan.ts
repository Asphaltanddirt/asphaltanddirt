import { getPostsBetween, type SocialPost } from "@/lib/garageSocial";
import { getTasksBetween, todayNY, weekOf, type GarageTask } from "@/lib/garageTasks";
import { listGarageUsers } from "@/lib/garageAuth";
import { getCrewEvents } from "@/lib/events";
import { isAutoPlatform } from "@/lib/socialCopy";
import { planPublish } from "@/lib/autoPost";
import { getMediaLibrary, type MediaRow } from "@/lib/mediaLibrary";

/**
 * The Planning Calendar on the Garage home (spec: 9. Analytics/Planning
 * Calendar - spec (2026-09-25).html, Jose's calls that day).
 *
 * Its one job is to show what's MISSING early enough to fix it. Everything
 * that's ready collapses into a count; only work somebody still has to do
 * gets a name. That rule is the whole reason the earlier calendars were
 * abandoned: they listed every post and nobody could read them.
 *
 * Fourteen days from this week's Monday: this week (the day buttons) and
 * next week (the rest of the Monday plan, Tue → Mon, and the look-ahead).
 * The cron builds next week's cards and tasks early so they exist by then.
 *
 * Every item has an owner. The screen is the same for everyone; only the
 * orange changes: yours is orange, someone else's is grey with their name,
 * Claude's steps are grey and never anyone's alarm.
 */

export type PlanNeed = "missing" | "approve" | "by-hand" | "task" | "missed";

export interface PlanItem {
  id: string;
  kind: "post" | "task" | "footage";
  title: string;
  /** What's missing, in a few words, e.g. "Instagram: no clip". */
  sub: string;
  /** Lowercase email, "claude", or "everyone" (orange for whoever's looking). */
  owner: string;
  ownerName: string;
  need: PlanNeed;
  /** The button word: Pick, Write, Approve, Post, Open. */
  fix: string;
  href: string;
  done: boolean;
}

export interface PlanDay {
  date: string;
  label: string;
  dayOfMonth: number;
  isToday: boolean;
  isPast: boolean;
  /** Cards the auto-poster will handle, ready or already out: a count only. */
  autoReady: number;
  autoTotal: number;
  items: PlanItem[];
  events: { title: string; href: string }[];
}

/** Unused clips in the Library for one side, against how fast we burn them. */
export interface FootageStock {
  side: "Asphalt" | "Dirt";
  unused: number;
  perWeek: number;
  /** Whole weeks the stock lasts at perWeek. */
  weeks: number;
}

export interface Plan {
  today: string;
  monday: string;
  /** 14 days from this week's Monday. */
  days: PlanDay[];
  footage: FootageStock[];
}

/**
 * How many clips a week each side uses (the clip-supply memory, Jose 9/24):
 * the Wednesday trail clip is always dirt, and the Feature and Alternate clips
 * are one asphalt and one dirt (Thursday's cuts from the two Garage Takes).
 * Fewer than LOW_WEEKS of stock on a side and the look-ahead says "film".
 */
const CLIPS_PER_WEEK = { Dirt: 2, Asphalt: 1 } as const;
const LOW_WEEKS = 2;
const isVideo = (r: MediaRow) => /\.(mov|mp4|m4v)$/i.test(r.fileName);

function footageStock(rows: MediaRow[]): FootageStock[] {
  const unused = rows.filter((r) => isVideo(r) && !r.usedAt);
  return (["Asphalt", "Dirt"] as const).map((side) => {
    const n = unused.filter((r) => r.eventType === side || r.eventType === "Both").length;
    return { side, unused: n, perWeek: CLIPS_PER_WEEK[side], weeks: Math.floor(n / CLIPS_PER_WEEK[side]) };
  });
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** "This slot is a clip, but no video is attached." → "no clip". */
function shortReason(reason: string): string {
  if (/no video/i.test(reason)) return "no clip";
  if (/no image/i.test(reason)) return "no image";
  if (/no caption/i.test(reason)) return "no caption";
  return reason.replace(/\.$/, "");
}

/** What a card still needs, or null when it's ready / out / skipped. */
function cardNeed(post: SocialPost): { need: PlanNeed; what: string } | null {
  if (post.status === "Posted" || post.status === "Skipped") return null;
  if (!isAutoPlatform(post.platform)) return { need: "by-hand", what: "by hand" };
  if (post.autoStatus === "Posted" || post.autoStatus === "Processing") return null;
  const plan = planPublish(post);
  if (!plan.ok) return { need: "missing", what: shortReason(plan.reason) };
  if (!post.approved) return { need: "approve", what: "needs Approve" };
  return null;
}

function topicLabel(post: SocialPost): string {
  if (post.topic === "Trail clip") return "Trail clip";
  if (post.topic === "Event promo") return post.promoBeat ? `Event promo · ${post.promoBeat.replace(/-/g, " ")}` : "Event promo";
  const clip = post.asset === "Vertical clip" ? " clip" : "";
  return `${post.topic || "Post"}${clip}`;
}

/** Group a day's open cards by what they are and whose they are, so one clip
 *  going to three platforms reads as one thing to do, not three. */
function postItems(posts: SocialPost[], isPast: boolean, name: (o: string) => string, monday: string): PlanItem[] {
  const groups = new Map<string, { posts: SocialPost[]; needs: { post: SocialPost; need: PlanNeed; what: string }[] }>();
  for (const post of posts) {
    const n = cardNeed(post);
    if (!n) continue;
    const key = `${topicLabel(post)}|${post.owner}`;
    const g = groups.get(key) || { posts: [], needs: [] };
    g.posts.push(post);
    g.needs.push({ post, ...n });
    groups.set(key, g);
  }
  const items: PlanItem[] = [];
  for (const [key, g] of groups) {
    const [title, owner] = key.split("|");
    // Worst first: something missing outranks an approval outranks by-hand.
    const rank: Record<PlanNeed, number> = { missing: 0, approve: 1, "by-hand": 2, task: 3, missed: 4 };
    g.needs.sort((a, b) => rank[a.need] - rank[b.need]);
    const top = g.needs[0];
    // "Instagram: no clip · TikTok, YouTube: by hand"
    const byWhat = new Map<string, string[]>();
    for (const n of g.needs) byWhat.set(n.what, [...(byWhat.get(n.what) || []), n.post.platform]);
    const sub = [...byWhat.entries()].map(([what, platforms]) => `${platforms.join(", ")}: ${what}`).join(" · ");
    const need: PlanNeed = isPast ? "missed" : top.need;
    const fix =
      need === "missed" ? "Open" : need === "approve" ? "Approve" : need === "by-hand" ? "Post" : title === "Trail Talk" ? "Write" : "Pick";
    items.push({
      id: top.post.id,
      kind: "post",
      title,
      sub,
      owner,
      ownerName: name(owner),
      need,
      fix,
      // A missing clip is fixed in the Library (one pick fills every card in
      // the slot); everything else is fixed on the card itself.
      href:
        need === "missing" && top.what === "no clip"
          ? "/garage/library"
          : `/garage/social?week=${weekOf(top.post.due) || monday}&all=1#card-${top.post.id}`,
      done: false,
    });
  }
  return items;
}

function taskItem(task: GarageTask, isPast: boolean, name: (o: string) => string): PlanItem {
  return {
    id: task.id,
    kind: "task",
    title: task.title,
    sub: "",
    owner: task.assignee,
    ownerName: name(task.assignee),
    need: task.done ? "task" : isPast ? "missed" : "task",
    fix: "Open",
    href: `/garage/tasks/${task.id}`,
    done: task.done,
  };
}

export async function getPlan(reference = todayNY()): Promise<Plan | null> {
  const today = todayNY();
  const monday = weekOf(reference);
  const last = addDays(monday, 13);

  const [posts, tasks, users, events, media] = await Promise.all([
    getPostsBetween(monday, last).catch(() => [] as SocialPost[]),
    getTasksBetween(monday, last).catch(() => [] as GarageTask[]),
    listGarageUsers().catch(() => []),
    getCrewEvents().catch(() => ({ upcoming: [], past: [] })),
    getMediaLibrary().catch(() => [] as MediaRow[]),
  ]);
  if (posts.length === 0 && tasks.length === 0) return null;

  const names = new Map(users.map((u) => [u.email.trim().toLowerCase(), u.name.split(" ")[0] || u.name]));
  const name = (owner: string) =>
    owner === "claude" ? "Claude" : owner === "everyone" ? "Anyone" : names.get(owner) || owner.split("@")[0] || "Someone";

  const days: PlanDay[] = [];
  for (let i = 0; i < 14; i += 1) {
    const date = addDays(monday, i);
    const d = new Date(`${date}T12:00:00Z`);
    const isPast = date < today;
    const dayPosts = posts.filter((p) => p.due === date);
    const autoPosts = dayPosts.filter((p) => isAutoPlatform(p.platform));
    const hasGroupCard = dayPosts.some((p) => p.platform === "Facebook Group" && p.topic === "Trail Talk");
    const dayTasks = tasks
      .filter((t) => t.due === date)
      // The Wednesday FB Group task and the FB Group card are the same job;
      // the card is the one with the post on it.
      .filter((t) => !(hasGroupCard && t.templateKey === "fb-group-trail-talk"));

    days.push({
      date,
      label: DAY_LABELS[d.getUTCDay()],
      dayOfMonth: d.getUTCDate(),
      isToday: date === today,
      isPast,
      autoTotal: autoPosts.filter((p) => p.status !== "Skipped").length,
      autoReady: autoPosts.filter((p) => p.status !== "Skipped" && !cardNeed(p)).length,
      items: [...postItems(dayPosts, isPast, name, monday), ...dayTasks.map((t) => taskItem(t, isPast, name))],
      events: events.upcoming
        .filter((e) => e.date === date)
        .map((e) => ({ title: e.title, href: `/garage/events/${e.slug}` })),
    });
  }
  // Running low on one side's clips is lead-time work: it lands on the first
  // look-ahead day, orange for everyone until the footage exists.
  const footage = footageStock(media);
  for (const f of footage.filter((x) => x.weeks < LOW_WEEKS)) {
    days[8].items.push({
      id: `footage-${f.side}`,
      kind: "footage",
      title: `Film ${f.side.toLowerCase()} clips`,
      sub: `${f.unused} unused in the Library, about ${f.weeks} week${f.weeks === 1 ? "" : "s"} at ${f.perWeek} a week`,
      owner: "everyone",
      ownerName: name("everyone"),
      need: "missing",
      fix: "Upload",
      href: "/garage/upload",
      done: false,
    });
  }
  return { today, monday, days, footage };
}
