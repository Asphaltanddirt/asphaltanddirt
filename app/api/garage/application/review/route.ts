import { NextRequest, NextResponse } from "next/server";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { SCORE_CATEGORIES, getApplication, saveReview, type ReviewEdit, type ScoreKey } from "@/lib/garageApplications";

/** Owners score an application and keep review + interview notes, from the
 *  Garage. Saves only what's sent, straight to the Applications record. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const app = await getApplication(typeof body.id === "string" ? body.id : "");
  if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });

  const edit: ReviewEdit = {};
  if (body.scores && typeof body.scores === "object") {
    edit.scores = {};
    for (const c of SCORE_CATEGORIES) {
      if (!(c.key in (body.scores as object))) continue;
      const v = (body.scores as Record<string, unknown>)[c.key];
      if (v === null) edit.scores[c.key as ScoreKey] = null;
      else if (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5) edit.scores[c.key as ScoreKey] = v;
      else return NextResponse.json({ error: "Scores are 1 to 5." }, { status: 400 });
    }
  }
  for (const key of ["reviewerNotes", "interviewNotes"] as const) {
    if (typeof body[key] === "string") edit[key] = (body[key] as string).trim();
  }
  if (typeof body.interviewDate === "string") {
    const d = body.interviewDate.trim();
    if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return NextResponse.json({ error: "Pick a real date." }, { status: 400 });
    edit.interviewDate = d;
  }

  try {
    const saved = await saveReview(app.id, edit);
    return NextResponse.json({ status: "ok", score: saved.score });
  } catch (err) {
    console.error("garage application review save failed", err);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 502 });
  }
}
