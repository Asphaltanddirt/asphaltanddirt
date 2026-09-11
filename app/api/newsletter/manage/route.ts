import { NextRequest, NextResponse } from "next/server";
import { updateTopicsByToken, ALL_TOPICS, type Topic } from "@/lib/newsletterSubscribers";

/**
 * Saves a subscriber's exact topic list from the /manage page — the
 * "drop just one list" alternative to the one-click /api/newsletter/
 * unsubscribe endpoint (which stays a single total unsubscribe for
 * List-Unsubscribe compliance). An empty topic list here is equivalent to
 * unsubscribing from everything.
 */
export async function POST(req: NextRequest) {
  let body: { token?: string; topics?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }
  const topics = (body.topics || []).filter((t): t is Topic => ALL_TOPICS.includes(t as Topic));

  const result = await updateTopicsByToken(token, topics);
  if (!result.ok) {
    return NextResponse.json({ error: "We couldn't find that subscription." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, active: topics.length > 0 });
}
