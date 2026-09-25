import { NextRequest, NextResponse } from "next/server";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { createRecord } from "@/lib/airtable";
import { todayNY, weekOf } from "@/lib/garageTasks";

/**
 * Planning Calendar → "I've got it" on a shared item (Calendar v2, 2026-09-25).
 * Turns "Film asphalt clips" (orange for everyone) into a task on the
 * claimer's own calendar; the shared item disappears for the others.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });
  const { side } = (await req.json().catch(() => ({}))) as { side?: string };
  if (side !== "Asphalt" && side !== "Dirt") return NextResponse.json({ error: "Which side?" }, { status: 400 });
  const today = todayNY();
  const due = new Date(Date.parse(`${today}T12:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10);
  try {
    await createRecord(
      "Tasks",
      {
        Title: `Film ${side.toLowerCase()} clips`,
        Assignee: session.email.trim().toLowerCase(),
        Due: due,
        Status: "To do",
        Details: `Claimed from the Planning Calendar ("I've got it"). The Library is low on unused ${side.toLowerCase()} clips. Upload in Garage → Upload; tag it ${side}.`,
        Link: "/garage/upload",
        "Template Key": `claim-footage-${side.toLowerCase()}|${weekOf(today)}`,
      },
      { baseId: process.env.AIRTABLE_GARAGE_BASE_ID, typecast: true },
    );
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("claim failed", err);
    return NextResponse.json({ error: "Couldn't claim it. Try again." }, { status: 502 });
  }
}
