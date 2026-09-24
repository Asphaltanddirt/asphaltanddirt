import { getWeekPosts, type SocialPost } from "@/lib/garageSocial";
import { todayNY, weekOf } from "@/lib/garageTasks";
import { needsAHuman, effectiveWindow } from "@/lib/notify";
import { isAutoPlatform } from "@/lib/socialCopy";
import { slotStart } from "@/lib/autoPost";

/**
 * The posting week, arranged to answer one question: what is still on me?
 *
 * This replaces the Google Calendar sync we decided against (Jose, 2026-09-23).
 * The reason a calendar lost that argument is the reason this exists — a
 * calendar can only list what was planned, so it shows a finished job exactly
 * the same way it shows an unfinished one. This greys out what's done and
 * leaves what's left.
 *
 * The other lesson, learned the expensive way on the content calendar: do NOT
 * itemise the automatic posts. ~21 a week go out on their own, and listing
 * them is most of the ink for none of the information. They get a count.
 */

export interface WeekDay {
  date: string;
  /** "Mon", "Tue"… */
  label: string;
  dayOfMonth: number;
  isToday: boolean;
  isPast: boolean;
  /** Posts this person has to make themselves, in slot order. */
  byHand: { id: string; platform: string; what: string; time: string; done: boolean }[];
  /** Everything the auto-poster handles — a count, never a list. */
  auto: { total: number; done: number; failed: number };
}

export interface PostingWeek {
  monday: string;
  days: WeekDay[];
  /** What's left by hand across the whole week, today included. */
  leftByHand: number;
  /** By-hand slots whose day has passed and were never posted. */
  missed: number;
  autoRemaining: number;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Just the clock part of a window: "12:30–1:30 PM" → "12:30 PM". */
function timeLabel(post: SocialPost): string {
  const window = effectiveWindow(post);
  if (!window) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "2-digit",
    }).format(slotStart(post.due, window));
  } catch {
    return window;
  }
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function getPostingWeek(reference = todayNY()): Promise<PostingWeek | null> {
  const monday = weekOf(reference);
  const posts = await getWeekPosts(monday).catch(() => [] as SocialPost[]);
  if (posts.length === 0) return null;

  const today = todayNY();
  const days: WeekDay[] = [];

  for (let i = 0; i < 7; i += 1) {
    const date = addDays(monday, i);
    const forDay = posts.filter((p) => p.due === date);
    const d = new Date(`${date}T12:00:00Z`);

    const byHand = forDay
      // Every by-hand slot shows, attachment or not — on TikTok and YouTube the
      // card is a reminder and a record, not where the file lives.
      .filter((p) => !isAutoPlatform(p.platform) && (needsAHuman(p) || p.status === "Posted"))
      .map((p) => ({
        id: p.id,
        platform: p.platform,
        what: p.asset || p.topic || p.name,
        time: timeLabel(p),
        done: p.status === "Posted",
      }))
      .sort((a, b) => a.time.localeCompare(b.time));

    const autoPosts = forDay.filter((p) => isAutoPlatform(p.platform));

    days.push({
      date,
      label: DAY_LABELS[d.getUTCDay()],
      dayOfMonth: d.getUTCDate(),
      isToday: date === today,
      isPast: date < today,
      byHand,
      auto: {
        total: autoPosts.length,
        done: autoPosts.filter((p) => p.status === "Posted").length,
        failed: autoPosts.filter((p) => p.autoStatus === "Failed").length,
      },
    });
  }

  const openByHand = days.flatMap((d) => d.byHand.filter((b) => !b.done).map((b) => ({ ...b, date: d.date })));

  return {
    monday,
    days,
    leftByHand: openByHand.filter((b) => b.date >= today).length,
    missed: openByHand.filter((b) => b.date < today).length,
    autoRemaining: days.reduce((n, d) => n + (d.isPast ? 0 : d.auto.total - d.auto.done), 0),
  };
}
