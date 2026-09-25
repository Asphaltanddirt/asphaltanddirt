import { isAirtableConfigured, listRecords } from "@/lib/airtable";
import { getPostsBetween, type SocialPost } from "@/lib/garageSocial";
import { todayNY } from "@/lib/garageTasks";

/**
 * Garage → Numbers (punchlist #9, Jose 9/25: Jose only for now).
 *
 * The house rule applies here as everywhere: show what CHANGED, not a table.
 * Every number on the screen is "now" next to "the time before", read from
 * rows the crons already write into the Analytics base:
 *   - Audience Snapshot: followers per platform + weekly merch (Monday cron,
 *     and Garage → Weekly Socials for TikTok / X / the FB Group)
 *   - Performance: YouTube channel + per-format and Vercel site rows, each in
 *     rolling 7- and 28-day windows
 *   - Social Posts: the 7-day numbers on each posted card (daily stats sync)
 *
 * Rolling windows are compared end-to-end only (this 7 days vs the 7 days
 * before), never overlapping ones, which is what the Performance table's own
 * rules ask for.
 */

const BASE_ID = process.env.AIRTABLE_ANALYTICS_BASE_ID || "appzbX0Mz3rXtc1GN";

export interface Point {
  date: string;
  value: number;
}

export interface AudienceLine {
  platform: string;
  metric: string;
  /** Oldest first, at most the last 8. */
  trend: Point[];
  now: Point | null;
  before: Point | null;
}

export interface Compare {
  label: string;
  now: number | null;
  before: number | null;
  unit?: "min" | "sec" | "$";
}

export interface PostLine {
  id: string;
  platform: string;
  title: string;
  due: string;
  views: number;
  why: string;
}

export interface TestLine {
  name: string;
  arms: { label: string; posts: number; average: number | null }[];
  metric: string;
}

export interface Numbers {
  today: string;
  audience: AudienceLine[];
  merch: AudienceLine[];
  youtube: { week: Compare[]; month: Compare[]; asOf: string | null; formats: Compare[] };
  site: { week: Compare[]; month: Compare[]; asOf: string | null; sources: { name: string; visitors: number }[] };
  posts: { best: PostLine[]; weakest: PostLine | null; counted: number };
  tests: TestLine[];
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const day = (v: unknown) => String(v || "").slice(0, 10);

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Audience Snapshot → one line per platform/metric, newest point first. */
function audienceLines(rows: Awaited<ReturnType<typeof listRecords>>, filter: (platform: string) => boolean): AudienceLine[] {
  const by = new Map<string, Point[]>();
  for (const r of rows) {
    const platform = String(r.fields.platform || "");
    const metric = String(r.fields.metric || "");
    const value = num(r.fields.value);
    const date = day(r.fields.snapshot_date);
    if (!platform || !metric || value === null || !date || !filter(platform)) continue;
    const key = `${platform}|${metric}`;
    by.set(key, [...(by.get(key) || []), { date, value }]);
  }
  const lines: AudienceLine[] = [];
  for (const [key, points] of by) {
    const [platform, metric] = key.split("|");
    // One point per day (a re-run the same day overwrites), oldest first.
    const perDay = new Map(points.map((p) => [p.date, p]));
    const sorted = [...perDay.values()].sort((a, b) => a.date.localeCompare(b.date));
    const now = sorted[sorted.length - 1] || null;
    // "Before" = the last reading at least 5 days older, so two runs in one
    // week don't show as a week's change.
    const before = now ? [...sorted].reverse().find((p) => p.date <= addDays(now.date, -5)) || null : null;
    lines.push({ platform, metric, trend: sorted.slice(-8), now, before });
  }
  const order = ["YouTube", "Instagram", "Facebook Page", "Facebook Group", "TikTok", "X", "Threads", "Merch"];
  return lines.sort((a, b) => order.indexOf(a.platform) - order.indexOf(b.platform) || a.metric.localeCompare(b.metric));
}

/** Newest rolling window vs the one that ended just before it started. */
function windowCompare(
  rows: Awaited<ReturnType<typeof listRecords>>,
  window: string,
  metrics: { metric: string; label: string; unit?: Compare["unit"] }[],
): { compares: Compare[]; asOf: string | null } {
  const mine = rows.filter((r) => r.fields.window === window);
  const ends = [...new Set(mine.map((r) => day(r.fields.period_end)))].filter(Boolean).sort();
  const latest = ends[ends.length - 1] || null;
  if (!latest) return { compares: metrics.map((m) => ({ label: m.label, now: null, before: null, unit: m.unit })), asOf: null };
  const latestStart = day(mine.find((r) => day(r.fields.period_end) === latest)?.fields.period_start);
  // The previous window is the newest one that ended before this one began.
  const prior = [...ends].reverse().find((e) => latestStart && e < latestStart) || null;
  const value = (end: string | null, metric: string) =>
    end ? num(mine.find((r) => day(r.fields.period_end) === end && r.fields.metric === metric)?.fields.value) : null;
  return {
    compares: metrics.map((m) => ({ label: m.label, now: value(latest, m.metric), before: value(prior, m.metric), unit: m.unit })),
    asOf: latest,
  };
}

const WHY_TOPIC: Record<string, string> = { Feature: "the week's Feature", Alternate: "the Alternate post", "Trail Talk": "Trail Talk" };

function postWhy(p: SocialPost): string {
  const bits = [WHY_TOPIC[p.topic] || p.topic || "post"];
  if (p.asset) bits.push(p.asset.toLowerCase());
  if (p.creative) bits.push(p.creative.replace(/_/g, " "));
  if (p.testSlot) bits.push(`${p.testSlot} slot`);
  if (p.linkPlacement) bits.push(`link ${p.linkPlacement.toLowerCase()}`);
  return bits.join(" · ");
}

export async function getNumbers(): Promise<Numbers> {
  const today = todayNY();
  const empty: Numbers = {
    today,
    audience: [],
    merch: [],
    youtube: { week: [], month: [], asOf: null, formats: [] },
    site: { week: [], month: [], asOf: null, sources: [] },
    posts: { best: [], weakest: null, counted: 0 },
    tests: [],
  };
  if (!isAirtableConfigured(BASE_ID)) return empty;

  const since = addDays(today, -120);
  const [audienceRows, perfRows, posts] = await Promise.all([
    listRecords("Audience Snapshot", `NOT(IS_BEFORE({snapshot_date}, '${since}'))`, { baseId: BASE_ID }).catch(() => []),
    listRecords(
      "Performance",
      `AND(OR({scope} = 'Channel', {scope} = 'Website'), NOT(IS_BEFORE({period_end}, '${since}')))`,
      { baseId: BASE_ID },
    ).catch(() => []),
    getPostsBetween(addDays(today, -35), today).catch(() => [] as SocialPost[]),
  ]);

  const channel = perfRows.filter((r) => String(r.fields.observation_id || "").startsWith("YTA-channel-"));
  const format = perfRows.filter((r) => String(r.fields.observation_id || "").startsWith("YTA-format-"));
  const site = perfRows.filter((r) => String(r.fields.observation_id || "").startsWith("VERCEL-"));

  const ytMetrics = [
    { metric: "views", label: "Views" },
    { metric: "watch_time", label: "Watch time", unit: "min" as const },
    { metric: "subscribers_gained", label: "Subscribers gained" },
  ];
  const ytWeek = windowCompare(channel, "Rolling 7 days", ytMetrics);
  const ytMonth = windowCompare(channel, "Rolling 28 days", ytMetrics);
  const formats = windowCompare(format, "Rolling 7 days", [
    { metric: "shorts_views", label: "Shorts views" },
    { metric: "long_form_views", label: "Long-form views" },
    { metric: "long_form_watch_time", label: "Long-form watch time", unit: "min" },
  ]);

  const siteMetrics = [
    { metric: "visitors_total", label: "Visitors" },
    { metric: "pageviews_total", label: "Page views" },
  ];
  const siteTotals = site.filter((r) => r.fields.entity_id === "site");
  const siteWeek = windowCompare(siteTotals, "Rolling 7 days", siteMetrics);
  const siteMonth = windowCompare(siteTotals, "Rolling 28 days", siteMetrics);
  const sources = site
    .filter(
      (r) =>
        r.fields.metric === "visitors_from_referrer" &&
        r.fields.window === "Rolling 7 days" &&
        day(r.fields.period_end) === siteWeek.asOf,
    )
    .map((r) => ({ name: String(r.fields.entity_id || "").replace(/^referrer:/, ""), visitors: num(r.fields.value) || 0 }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 5);

  // Posts with a 7-day number. Views where the platform gives them; X and
  // Threads often only have likes, so they're ranked on views when present.
  const counted = posts.filter((p) => p.status === "Posted" && p.stats.views !== null);
  const lines: PostLine[] = counted
    .map((p) => ({
      id: p.id,
      platform: p.platform,
      title: p.blogTitle || p.name,
      due: p.due,
      views: p.stats.views || 0,
      why: postWhy(p),
    }))
    .sort((a, b) => b.views - a.views);

  // The two running experiments, straight from the cards that carry them.
  const avg = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x !== null);
    return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null;
  };
  const tiktok = posts.filter((p) => p.platform === "TikTok" && p.testSlot && p.status === "Posted");
  const xTest = posts.filter((p) => p.platform === "X" && p.linkPlacement && p.status === "Posted");
  const tests: TestLine[] = [
    {
      name: "TikTok: 1 PM vs 7 PM",
      metric: "avg views after 7 days",
      arms: [...new Set(tiktok.map((p) => p.testSlot))].sort().map((slot) => {
        const mine = tiktok.filter((p) => p.testSlot === slot);
        return { label: slot, posts: mine.length, average: avg(mine.map((p) => p.stats.views)) };
      }),
    },
    {
      name: "X: link in the post vs in a reply",
      metric: "avg link clicks after 7 days",
      arms: (["In post", "In reply"] as const).map((placement) => {
        const mine = xTest.filter((p) => p.linkPlacement === placement);
        return { label: placement, posts: mine.length, average: avg(mine.map((p) => p.stats.linkClicks)) };
      }),
    },
  ];

  return {
    today,
    audience: audienceLines(audienceRows, (p) => p !== "Merch"),
    merch: audienceLines(audienceRows, (p) => p === "Merch"),
    youtube: { week: ytWeek.compares, month: ytMonth.compares, asOf: ytWeek.asOf, formats: formats.asOf ? formats.compares : [] },
    site: { week: siteWeek.compares, month: siteMonth.compares, asOf: siteWeek.asOf, sources },
    posts: { best: lines.slice(0, 3), weakest: lines.length > 3 ? lines[lines.length - 1] : null, counted: lines.length },
    tests,
  };
}
