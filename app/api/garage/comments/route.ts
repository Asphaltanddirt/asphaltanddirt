import { NextRequest, NextResponse } from "next/server";
import { BUCKETS, STATUSES, setCommentBucket, setCommentStatus, type Bucket, type CommentStatus } from "@/lib/commentHarvest";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";

/** Comment harvester actions (Garage → Comments). Owners only. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });

  let body: { id?: string; status?: string; bucket?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const id = String(body.id || "");
  try {
    if (body.bucket) {
      if (!BUCKETS.includes(body.bucket as Bucket)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
      await setCommentBucket(id, body.bucket as Bucket);
    } else if (body.status) {
      if (!STATUSES.includes(body.status as CommentStatus)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
      await setCommentStatus(id, body.status as CommentStatus, session.name || session.email);
    } else {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("comment action failed", err);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 502 });
  }
}
