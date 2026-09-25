import { NextRequest, NextResponse } from "next/server";

/**
 * Admin check (2026-09-25, before building punchlist #8): can our Meta token
 * READ comments on Instagram and the Facebook Page? It was set up for posting
 * and stats, so comment-reading permission isn't a given.
 *
 * Returns only permission names, yes/no and counts. Never the token and never
 * comment text. Bearer ADMIN_API_SECRET, like the other admin routes.
 */
export const dynamic = "force-dynamic";

const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v26.0"}`;

async function get<T>(path: string, params: Record<string, string>, token: string): Promise<T> {
  const res = await fetch(`${GRAPH}/${path}?${new URLSearchParams({ ...params, access_token: token })}`, { cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string; code?: number } };
  if (!res.ok || data?.error) throw new Error(`${data?.error?.message || `HTTP ${res.status}`}${data?.error?.code ? ` (code ${data.error.code})` : ""}`);
  return data;
}

export async function GET(req: NextRequest) {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const token = process.env.META_GRAPH_TOKEN || "";
  const igUser = process.env.META_IG_USER_ID || "";
  const pageId = process.env.META_PAGE_ID || "";
  if (!token) return NextResponse.json({ error: "META_GRAPH_TOKEN not set." }, { status: 500 });

  const out: Record<string, unknown> = {};

  try {
    const p = await get<{ data: { permission: string; status: string }[] }>("me/permissions", {}, token);
    out.granted = p.data.filter((x) => x.status === "granted").map((x) => x.permission).sort();
  } catch (e) {
    out.granted = `couldn't list (${e instanceof Error ? e.message : "error"})`;
  }

  try {
    const media = await get<{ data: { id: string; comments_count?: number }[] }>(`${igUser}/media`, { fields: "id,comments_count", limit: "25" }, token);
    const withComments = media.data.find((m) => (m.comments_count || 0) > 0);
    if (!withComments) out.instagram = { ok: true, note: "no recent post has comments to test with" };
    else {
      const c = await get<{ data: unknown[] }>(`${withComments.id}/comments`, { fields: "id,timestamp", limit: "5" }, token);
      out.instagram = { ok: true, postHas: withComments.comments_count, readable: c.data.length };
    }
  } catch (e) {
    out.instagram = { ok: false, error: e instanceof Error ? e.message : "error" };
  }

  try {
    const page = await get<{ access_token?: string }>(pageId, { fields: "access_token" }, token);
    const pt = page.access_token || token;
    const posts = await get<{ data: { id: string; comments?: { summary?: { total_count?: number } } }[] }>(
      `${pageId}/posts`,
      { fields: "id,comments.summary(true).limit(0)", limit: "25" },
      pt,
    );
    const withComments = posts.data.find((x) => (x.comments?.summary?.total_count || 0) > 0);
    if (!withComments) out.facebook = { ok: true, note: "no recent post has comments to test with" };
    else {
      const c = await get<{ data: unknown[] }>(`${withComments.id}/comments`, { fields: "id,created_time", limit: "5" }, pt);
      out.facebook = { ok: true, postHas: withComments.comments?.summary?.total_count, readable: c.data.length };
    }
  } catch (e) {
    out.facebook = { ok: false, error: e instanceof Error ? e.message : "error" };
  }

  return NextResponse.json(out);
}
