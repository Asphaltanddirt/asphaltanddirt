import { createRecord, listRecords, updateRecord, isAirtableConfigured } from "@/lib/airtable";
import { todayNY, weekOf } from "@/lib/garageTasks";
import { xFetch } from "@/lib/xPost";

/**
 * Garage → Weekly Socials (punchlist #10, 2026-09-25). The three audience
 * numbers nothing can fetch for us, typed once a week into the Analytics
 * base's Audience Snapshot. YouTube, Instagram and the Facebook Page fill
 * themselves in the Monday snapshot; TikTok has no API for us yet, X would
 * cost per call, and Facebook Groups have none.
 *
 * One row per platform per week, keyed like the rest of the table
 * (SNAP-<Monday>-<platform>-<metric>), so saving twice in a week updates the
 * row instead of adding a second one.
 */

const BASE_ID = process.env.AIRTABLE_ANALYTICS_BASE_ID || "appzbX0Mz3rXtc1GN";
const TABLE = "Audience Snapshot";

export const WEEKLY_SOCIALS = [
  { key: "tiktok", platform: "TikTok", metric: "Followers", label: "TikTok followers", where: "TikTok app → Profile" },
  { key: "x", platform: "X", metric: "Followers", label: "X followers", where: "Fills itself Monday morning from X; fix it here only if it looks wrong" },
  { key: "fbgroup", platform: "Facebook Group", metric: "Members", label: "Facebook Group members", where: "Group → Members" },
] as const;
export type WeeklySocialKey = (typeof WEEKLY_SOCIALS)[number]["key"];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const idFor = (monday: string, platform: string, metric: string) => `SNAP-${monday}-${slug(platform)}-${slug(metric)}`;

export interface WeeklySocialsState {
  monday: string;
  rows: { key: WeeklySocialKey; label: string; where: string; thisWeek: number | null; last: { value: number; date: string } | null }[];
}

export async function getWeeklySocials(): Promise<WeeklySocialsState> {
  const monday = weekOf(todayNY());
  const empty = { monday, rows: WEEKLY_SOCIALS.map((s) => ({ key: s.key, label: s.label, where: s.where, thisWeek: null, last: null })) };
  if (!isAirtableConfigured(BASE_ID)) return empty;
  const rows = await listRecords(TABLE, `OR(${WEEKLY_SOCIALS.map((s) => `AND({platform} = '${s.platform}', {metric} = '${s.metric}')`).join(",")})`, { baseId: BASE_ID });
  return {
    monday,
    rows: WEEKLY_SOCIALS.map((s) => {
      const mine = rows
        .filter((r) => r.fields.platform === s.platform && r.fields.metric === s.metric && typeof r.fields.value === "number")
        .map((r) => ({ value: r.fields.value as number, date: String(r.fields.snapshot_date || "").slice(0, 10) }))
        .sort((a, b) => b.date.localeCompare(a.date));
      const current = mine.find((m) => m.date === monday);
      return { key: s.key, label: s.label, where: s.where, thisWeek: current ? current.value : null, last: mine.find((m) => m.date < monday) || null };
    }),
  };
}

export async function saveWeeklySocials(values: Partial<Record<WeeklySocialKey, number>>, by: string): Promise<number> {
  if (!isAirtableConfigured(BASE_ID)) throw new Error("The Analytics base isn't configured.");
  const monday = weekOf(todayNY());
  let saved = 0;
  for (const s of WEEKLY_SOCIALS) {
    const value = values[s.key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) continue;
    const id = idFor(monday, s.platform, s.metric);
    const fields = {
      snapshot_id: id,
      platform: s.platform,
      snapshot_date: monday,
      metric: s.metric,
      value: Math.round(value),
      unit: "count",
      source: `Garage → Weekly Socials (${by})`,
    };
    const [existing] = await listRecords(TABLE, `{snapshot_id} = '${id}'`, { baseId: BASE_ID });
    if (existing) await updateRecord(TABLE, existing.id, fields, { baseId: BASE_ID });
    else await createRecord(TABLE, fields, { baseId: BASE_ID, typecast: true });
    saved++;
  }
  return saved;
}

/**
 * X followers, read from X on the Monday snapshot run (Jose 9/25, "yes X")
 * and saved to this week's Weekly Socials row, so Jose only types TikTok and
 * the Facebook Group. One /2/users/me call a week (pay-per-use, well under a
 * cent). Typing a number on the screen afterwards still overwrites it.
 */
export async function autoFillXFollowers(): Promise<{ ok: boolean; followers?: number; error?: string }> {
  try {
    const me = await xFetch<{ data?: { public_metrics?: { followers_count?: number } } }>("/2/users/me?user.fields=public_metrics", {
      method: "GET",
    });
    const followers = me.data?.public_metrics?.followers_count;
    if (typeof followers !== "number") return { ok: false, error: "X didn't return a follower count." };
    await saveWeeklySocials({ x: followers }, "X API");
    return { ok: true, followers };
  } catch (err) {
    return { ok: false, error: String(err).slice(0, 200) };
  }
}
