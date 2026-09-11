/**
 * Weekly analytics snapshot — pulls what we can from first-party APIs and writes
 * it into the "A&D Analytics" Airtable base. Three tiers:
 *
 *   No OAuth (always runs if keys present):
 *     - Fourthwall (Open API, Basic Auth)  -> Audience Snapshot: Merch revenue / orders / units
 *     - YouTube Data API v3 (YOUTUBE_API_KEY) -> Audience Snapshot: subscribers
 *                                             -> Performance: per-video + channel lifetime views, upload count
 *     - Vercel Web Analytics API (VERCEL_API_TOKEN) -> Performance: site pageviews/visitors
 *       broken down by utm_source (bio-link attribution — facebook/instagram/tiktok/x/youtube),
 *       rolling 7d and 28d
 *
 *   OAuth (runs if GOOGLE_OAUTH_* present):
 *     - YouTube Analytics API -> Performance: channel + per-video views / watch time /
 *       avg view duration for rolling 7d and 28d, plus traffic-source view split
 *     - Search Console API    -> Performance: site clicks / impressions / CTR / position, 7d and 28d
 *
 * Not available from any API (still Studio-only): YouTube impressions & CTR.
 * Not yet wired up: Search Console "platform properties" (Instagram/TikTok/X/YouTube
 * content performance on Google Search) — needs each account verified in the GSC UI
 * first, and Google hasn't documented whether the same searchAnalytics.query API
 * reaches them, so this is deferred until one is verified and testable for real.
 *
 * Idempotent: every row's primary id is date-stamped, so re-running on the same
 * day updates that day's row and a new day appends a new one — old observations
 * are never overwritten. Uses upsert (merge on the primary id field).
 */

import { listRecords, upsertRecords, isAirtableConfigured, type AirtableFields } from "@/lib/airtable";
import { getOrdersInRange } from "@/lib/fourthwall-platform";

const BASE_ID = process.env.AIRTABLE_ANALYTICS_BASE_ID || "appzbX0Mz3rXtc1GN";
const YT_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || "UCxW12IVrVrAx-UKFoNfq45Q";
const GSC_PROPERTY = process.env.GSC_PROPERTY || "sc-domain:asphaltanddirt.com";

/** Store opened ~Aug 30 2026; a fixed early epoch keeps "store-to-date" totals stable. */
const MERCH_EPOCH = new Date("2026-08-01T00:00:00Z");

/** YouTube Analytics and Search Console finalize data ~2-3 days back. */
const DATA_LAG_DAYS = 3;

const CONTENT_TABLE = "Content";
const PERFORMANCE_TABLE = "Performance";
const SNAPSHOT_TABLE = "Audience Snapshot";

const YT_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";
const YT_CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels";
const YT_ANALYTICS_URL = "https://youtubeanalytics.googleapis.com/v2/reports";
const GSC_QUERY_URL = (prop: string) =>
  `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(prop)}/searchAnalytics/query`;

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function daysAgo(base: Date, n: number) {
  return new Date(base.getTime() - n * 86_400_000);
}

export interface SnapshotResult {
  ranAt: string;
  dryRun: boolean;
  fourthwall: { ok: boolean; skipped?: string; realOrders?: number; revenue?: number; units?: number };
  youtube: { ok: boolean; skipped?: string; subscribers?: number; videos?: number };
  vercelAnalytics: { ok: boolean; skipped?: string; error?: string; rows?: number };
  youtubeAnalytics: { ok: boolean; skipped?: string; error?: string; rows?: number };
  searchConsole: { ok: boolean; skipped?: string; error?: string; rows?: number };
  written: { performance: number; audienceSnapshot: number };
}

// ---------------------------------------------------------------------------
// Fourthwall
// ---------------------------------------------------------------------------

async function pullFourthwall(now: Date) {
  if (!process.env.FOURTHWALL_API_USERNAME || !process.env.FOURTHWALL_API_PASSWORD) {
    return { ok: false as const, skipped: "Fourthwall credentials not configured" };
  }
  const orders = await getOrdersInRange(MERCH_EPOCH, now);
  const real = orders.filter((o) => (o.source?.type ?? "ORDER") === "ORDER");
  const revenue = Math.round(real.reduce((a, o) => a + (o.amounts?.total?.value ?? 0), 0) * 100) / 100;
  const units = real.reduce((a, o) => a + (o.offers?.length ?? 0), 0);
  return { ok: true as const, realOrders: real.length, revenue, units };
}

// ---------------------------------------------------------------------------
// YouTube Data API v3 (public stats — no OAuth)
// ---------------------------------------------------------------------------

async function ytFetch(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`YouTube API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function pullYouTube(videoIds: string[]) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return { ok: false as const, skipped: "YOUTUBE_API_KEY not configured" };

  const chData = await ytFetch(`${YT_CHANNELS_URL}?part=statistics&id=${YT_CHANNEL_ID}&key=${key}`);
  const chStats = chData.items?.[0]?.statistics ?? {};
  const subscribers = Number(chStats.subscriberCount ?? NaN);
  const channelViews = Number(chStats.viewCount ?? NaN);
  const videoCount = Number(chStats.videoCount ?? NaN);

  const perVideo: Record<string, number> = {};
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    if (!batch.length) break;
    const vData = await ytFetch(`${YT_VIDEOS_URL}?part=statistics&id=${batch.join(",")}&key=${key}`);
    for (const item of vData.items ?? []) {
      const v = Number(item.statistics?.viewCount ?? NaN);
      if (item.id && Number.isFinite(v)) perVideo[item.id] = v;
    }
  }

  return {
    ok: true as const,
    subscribers: Number.isFinite(subscribers) ? subscribers : undefined,
    channelViews: Number.isFinite(channelViews) ? channelViews : undefined,
    videoCount: Number.isFinite(videoCount) ? videoCount : undefined,
    perVideo,
  };
}

// ---------------------------------------------------------------------------
// Vercel Web Analytics (bio-link attribution via UTM source)
// ---------------------------------------------------------------------------

const VERCEL_ANALYTICS_URL = "https://api.vercel.com/v1/query/web-analytics/visits/aggregate";

async function pullVercelAnalytics(now: Date) {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) {
    return { ok: false as const, skipped: "VERCEL_API_TOKEN/VERCEL_PROJECT_ID not configured" };
  }
  const teamId = process.env.VERCEL_TEAM_ID;

  // Vercel Web Analytics isn't subject to the multi-day finalization lag that
  // YouTube Analytics / Search Console have, so windows run through today.
  const end = isoDate(now);
  const windows: { label: "Rolling 7 days" | "Rolling 28 days"; start: string }[] = [
    { label: "Rolling 7 days", start: isoDate(daysAgo(now, 6)) },
    { label: "Rolling 28 days", start: isoDate(daysAgo(now, 27)) },
  ];

  const out: { fields: AirtableFields }[] = [];
  for (const w of windows) {
    const tag = w.label === "Rolling 7 days" ? "7d" : "28d";
    const params = new URLSearchParams({ projectId, since: w.start, until: end, by: "utmSource", limit: "15" });
    if (teamId) params.set("teamId", teamId);

    const res = await fetch(`${VERCEL_ANALYTICS_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Vercel Web Analytics ${res.status}: ${JSON.stringify(data)}`);

    for (const row of (data.data ?? []) as { utmSource?: string; pageviews?: number; visitors?: number }[]) {
      // Blank utmSource = direct/organic traffic with no bio link involved —
      // still worth a baseline row so the social sources have something to compare against.
      const source = (row.utmSource || "direct").toString();
      const slug = source.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const push = (metric: string, value: number) =>
        out.push({
          fields: {
            observation_id: `VERCEL-utm-${slug}-${metric}-${tag}-${end}`,
            scope: "Website",
            entity_id: `utm_source:${source}`,
            observed_date: end,
            period_start: w.start,
            period_end: end,
            window: w.label,
            metric: `${metric}_from_utm_source`,
            value,
            unit: "count",
            source: `Vercel Web Analytics API (cron, data through ${end})`,
            notes: `utm_source = ${source}`,
          },
        });
      push("pageviews", Number(row.pageviews ?? 0));
      push("visitors", Number(row.visitors ?? 0));
    }
  }
  return { ok: true as const, rows: out.length, data: out };
}

// ---------------------------------------------------------------------------
// Google OAuth (YouTube Analytics + Search Console)
// ---------------------------------------------------------------------------

function googleOAuthConfigured() {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  );
}

async function getGoogleAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status} ${JSON.stringify(data)}`);
  return data.access_token as string;
}

type YtaRow = (string | number)[];
async function ytaReport(token: string, params: Record<string, string>): Promise<{ headers: string[]; rows: YtaRow[] }> {
  const url = `${YT_ANALYTICS_URL}?${new URLSearchParams({ ids: "channel==MINE", ...params }).toString()}`;
  // The YouTube Analytics API returns sporadic 500 "backendError"s; retry a few times.
  let lastErr = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 1500 * attempt));
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const data = await res.json();
    if (res.ok) {
      return {
        headers: (data.columnHeaders ?? []).map((h: { name: string }) => h.name),
        rows: data.rows ?? [],
      };
    }
    lastErr = `YouTube Analytics ${res.status}: ${JSON.stringify(data)}`;
    if (res.status !== 500 && res.status !== 503) break; // only retry transient server errors
  }
  throw new Error(lastErr);
}

async function pullYouTubeAnalytics(token: string, now: Date, trackedVideoIds: string[]) {
  const tracked = new Set(trackedVideoIds);
  const end = isoDate(daysAgo(now, DATA_LAG_DAYS));
  const windows: { label: "Rolling 7 days" | "Rolling 28 days"; start: string }[] = [
    { label: "Rolling 7 days", start: isoDate(daysAgo(now, DATA_LAG_DAYS + 6)) },
    { label: "Rolling 28 days", start: isoDate(daysAgo(now, DATA_LAG_DAYS + 27)) },
  ];

  const out: { fields: AirtableFields }[] = [];
  const metrics = "views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost";

  for (const w of windows) {
    const tag = w.label === "Rolling 7 days" ? "7d" : "28d";

    // Channel totals.
    const ch = await ytaReport(token, { startDate: w.start, endDate: end, metrics });
    if (ch.rows[0]) {
      const row = Object.fromEntries(ch.headers.map((h, i) => [h, ch.rows[0][i]]));
      const push = (metric: string, value: unknown, unit: string, notes?: string) =>
        out.push({
          fields: {
            observation_id: `YTA-channel-${metric}-${tag}-${end}`,
            scope: "Channel",
            entity_id: YT_CHANNEL_ID,
            observed_date: end,
            period_start: w.start,
            period_end: end,
            window: w.label,
            metric,
            value: Number(value),
            unit,
            source: `YouTube Analytics API (cron, data through ${end})`,
            ...(notes ? { notes } : {}),
          },
        });
      push("views", row.views, "count");
      push("watch_time", row.estimatedMinutesWatched, "count", "Value is minutes watched.");
      push("average_view_duration", row.averageViewDuration, "seconds");
      push("subscribers_gained", row.subscribersGained, "count");
      push("subscribers_lost", row.subscribersLost, "count");
    }

    // Per-video.
    const pv = await ytaReport(token, {
      startDate: w.start,
      endDate: end,
      metrics: "views,estimatedMinutesWatched,averageViewDuration",
      dimensions: "video",
      sort: "-views",
      maxResults: "50",
    });
    for (const r of pv.rows) {
      const row = Object.fromEntries(pv.headers.map((h, i) => [h, r[i]]));
      const vid = String(row.video);
      if (!tracked.has(vid)) continue; // only videos in the Content archive
      const push = (metric: string, value: unknown, unit: string, notes?: string) =>
        out.push({
          fields: {
            observation_id: `YTA-${vid}-${metric}-${tag}-${end}`,
            scope: "Video",
            entity_id: vid,
            observed_date: end,
            period_start: w.start,
            period_end: end,
            window: w.label,
            metric,
            value: Number(value),
            unit,
            source: `YouTube Analytics API (cron, data through ${end})`,
            ...(notes ? { notes } : {}),
          },
        });
      push("views", row.views, "count");
      push("watch_time", row.estimatedMinutesWatched, "count", "Value is minutes watched.");
      push("average_view_duration", row.averageViewDuration, "seconds");
    }
  }

  // Traffic sources (28d).
  const ts = await ytaReport(token, {
    startDate: windows[1].start,
    endDate: end,
    metrics: "views",
    dimensions: "insightTrafficSourceType",
    sort: "-views",
  });
  for (const r of ts.rows) {
    const row = Object.fromEntries(ts.headers.map((h, i) => [h, r[i]]));
    out.push({
      fields: {
        observation_id: `YTA-traffic-${row.insightTrafficSourceType}-28d-${end}`,
        scope: "Traffic source",
        entity_id: YT_CHANNEL_ID,
        observed_date: end,
        period_start: windows[1].start,
        period_end: end,
        window: "Rolling 28 days",
        metric: `views_from_${row.insightTrafficSourceType}`,
        value: Number(row.views),
        unit: "count",
        source: `YouTube Analytics API (cron, data through ${end})`,
      },
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Search Console
// ---------------------------------------------------------------------------

async function pullSearchConsole(token: string, now: Date) {
  const end = isoDate(daysAgo(now, DATA_LAG_DAYS));
  const windows: { label: "Rolling 7 days" | "Rolling 28 days"; start: string }[] = [
    { label: "Rolling 7 days", start: isoDate(daysAgo(now, DATA_LAG_DAYS + 6)) },
    { label: "Rolling 28 days", start: isoDate(daysAgo(now, DATA_LAG_DAYS + 27)) },
  ];

  const out: { fields: AirtableFields }[] = [];
  for (const w of windows) {
    const tag = w.label === "Rolling 7 days" ? "7d" : "28d";
    const res = await fetch(GSC_QUERY_URL(GSC_PROPERTY), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startDate: w.start, endDate: end, dimensions: [], rowLimit: 1 }),
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Search Console ${res.status}: ${JSON.stringify(data)}`);
    const t = data.rows?.[0];
    if (!t) continue;
    const push = (metric: string, value: number, unit: string, notes?: string) =>
      out.push({
        fields: {
          observation_id: `GSC-site-${metric}-${tag}-${end}`,
          scope: "Blog",
          entity_id: GSC_PROPERTY,
          observed_date: end,
          period_start: w.start,
          period_end: end,
          window: w.label,
          metric,
          value,
          unit,
          source: `Google Search Console API (cron, data through ${end})`,
          ...(notes ? { notes } : {}),
        },
      });
    push("gsc_clicks", t.clicks ?? 0, "count");
    push("gsc_impressions", t.impressions ?? 0, "count");
    push("gsc_ctr", t.ctr ?? 0, "ratio", "Click-through rate as a 0-1 fraction.");
    push("gsc_avg_position", t.position ?? 0, "count", "Average ranking position (lower is better).");
  }
  return out;
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export async function runAnalyticsSnapshot(
  now = new Date(),
  opts: { dryRun?: boolean } = {},
): Promise<SnapshotResult> {
  if (!isAirtableConfigured(BASE_ID)) {
    throw new Error("Airtable not configured for the Analytics base.");
  }
  const today = isoDate(now);

  // Map YouTube content_id -> Airtable record id, for the Performance link field.
  const contentRows = await listRecords(CONTENT_TABLE, "{platform} = 'YouTube'", { baseId: BASE_ID });
  const recIdByVideo: Record<string, string> = {};
  for (const r of contentRows) {
    const pid = (r.fields.platform_id as string) || (r.fields.content_id as string);
    if (pid) recIdByVideo[pid] = r.id;
  }
  const videoIds = Object.keys(recIdByVideo);

  const [fw, yt, vercel] = await Promise.all([
    pullFourthwall(now),
    pullYouTube(videoIds),
    pullVercelAnalytics(now).catch((e) => ({ ok: false as const, error: String(e) })),
  ]);

  const perfRows: { fields: AirtableFields }[] = [];
  const snapRows: { fields: AirtableFields }[] = [];

  // --- Audience Snapshot: Merch ---
  if (fw.ok) {
    const base = {
      platform: "Merch",
      snapshot_date: today,
      period_start: isoDate(MERCH_EPOCH),
      period_end: today,
      source: `Fourthwall Open API (cron ${today})`,
    };
    snapRows.push({
      fields: {
        snapshot_id: `SNAP-${today}-merch-revenue`,
        ...base,
        metric: "Revenue",
        unit: "USD",
        value: fw.revenue,
        notes: "Store-to-date. Real customer orders only (source.type = ORDER); excludes samples/gifts.",
      },
    });
    snapRows.push({
      fields: {
        snapshot_id: `SNAP-${today}-merch-orders`,
        ...base,
        metric: "Orders",
        unit: "count",
        value: fw.realOrders,
        notes: "Store-to-date real customer orders.",
      },
    });
    snapRows.push({
      fields: {
        snapshot_id: `SNAP-${today}-merch-units`,
        ...base,
        metric: "Units sold",
        unit: "count",
        value: fw.units,
        notes: "Line items across real customer orders.",
      },
    });
  }

  // --- YouTube Data API (public) ---
  if (yt.ok) {
    if (yt.subscribers !== undefined) {
      snapRows.push({
        fields: {
          snapshot_id: `SNAP-${today}-youtube-subscribers`,
          platform: "YouTube",
          snapshot_date: today,
          metric: "Subscribers",
          unit: "count",
          value: yt.subscribers,
          source: `YouTube Data API (cron ${today})`,
          notes: "Public subscriber count; fluctuates at small scale.",
        },
      });
      perfRows.push({
        fields: {
          observation_id: `YT-channel-subscribers-${today}`,
          scope: "Channel",
          entity_id: YT_CHANNEL_ID,
          observed_date: today,
          window: "Lifetime snapshot",
          metric: "subscribers",
          value: yt.subscribers,
          unit: "count",
          source: `YouTube Data API (cron ${today})`,
        },
      });
    }
    if (yt.channelViews !== undefined) {
      perfRows.push({
        fields: {
          observation_id: `YT-channel-views-lifetime-${today}`,
          scope: "Channel",
          entity_id: YT_CHANNEL_ID,
          observed_date: today,
          window: "Lifetime",
          metric: "views",
          value: yt.channelViews,
          unit: "count",
          source: `YouTube Data API (cron ${today})`,
        },
      });
    }
    if (yt.videoCount !== undefined) {
      perfRows.push({
        fields: {
          observation_id: `YT-channel-uploads-${today}`,
          scope: "Channel",
          entity_id: YT_CHANNEL_ID,
          observed_date: today,
          window: "Inventory snapshot",
          metric: "uploads_all_types",
          value: yt.videoCount,
          unit: "count",
          source: `YouTube Data API (cron ${today})`,
          notes: "All channel uploads, not just the tracked set.",
        },
      });
    }
    for (const [videoId, views] of Object.entries(yt.perVideo)) {
      perfRows.push({
        fields: {
          observation_id: `YT-${videoId}-views-lifetime-${today}`,
          scope: "Video",
          content: recIdByVideo[videoId] ? [recIdByVideo[videoId]] : undefined,
          entity_id: videoId,
          observed_date: today,
          window: "Lifetime",
          metric: "views",
          value: views,
          unit: "count",
          source: `YouTube Data API (cron ${today})`,
        },
      });
    }
  }

  // --- Vercel Web Analytics (UTM / bio-link attribution) ---
  if (vercel.ok && "data" in vercel) {
    perfRows.push(...vercel.data);
  }

  // --- OAuth tier: YouTube Analytics + Search Console ---
  let yta: SnapshotResult["youtubeAnalytics"] = { ok: false, skipped: "GOOGLE_OAUTH_* not configured" };
  let gsc: SnapshotResult["searchConsole"] = { ok: false, skipped: "GOOGLE_OAUTH_* not configured" };

  if (googleOAuthConfigured()) {
    try {
      const token = await getGoogleAccessToken();
      try {
        const rows = await pullYouTubeAnalytics(token, now, videoIds);
        for (const r of rows) {
          const vid = r.fields.entity_id as string;
          if (r.fields.scope === "Video" && recIdByVideo[vid]) r.fields.content = [recIdByVideo[vid]];
          perfRows.push(r);
        }
        yta = { ok: true, rows: rows.length };
      } catch (e) {
        yta = { ok: false, error: String(e) };
      }
      try {
        const rows = await pullSearchConsole(token, now);
        perfRows.push(...rows);
        gsc = { ok: true, rows: rows.length };
      } catch (e) {
        gsc = { ok: false, error: String(e) };
      }
    } catch (e) {
      yta = { ok: false, error: `token: ${String(e)}` };
      gsc = { ok: false, error: `token: ${String(e)}` };
    }
  }

  if (!opts.dryRun) {
    if (perfRows.length) {
      await upsertRecords(PERFORMANCE_TABLE, perfRows, ["observation_id"], { baseId: BASE_ID });
    }
    if (snapRows.length) {
      await upsertRecords(SNAPSHOT_TABLE, snapRows, ["snapshot_id"], { baseId: BASE_ID });
    }
  }

  return {
    ranAt: now.toISOString(),
    dryRun: opts.dryRun ?? false,
    fourthwall: fw.ok
      ? { ok: true, realOrders: fw.realOrders, revenue: fw.revenue, units: fw.units }
      : { ok: false, skipped: fw.skipped },
    youtube: yt.ok
      ? { ok: true, subscribers: yt.subscribers, videos: Object.keys(yt.perVideo).length }
      : { ok: false, skipped: yt.skipped },
    vercelAnalytics: vercel.ok
      ? { ok: true, rows: "rows" in vercel ? vercel.rows : undefined }
      : { ok: false, skipped: "skipped" in vercel ? vercel.skipped : undefined, error: "error" in vercel ? vercel.error : undefined },
    youtubeAnalytics: yta,
    searchConsole: gsc,
    written: { performance: perfRows.length, audienceSnapshot: snapRows.length },
  };
}
