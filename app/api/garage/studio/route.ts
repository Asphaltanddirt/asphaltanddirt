import { NextRequest, NextResponse } from "next/server";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { getStudioRecord, saveStudioRecord, toAirtableFields } from "@/lib/garageStudio";
import { STUDIO_TABLES, type StudioTableKey } from "@/lib/studioConfig";

/** Owners add ({ table, values }) or edit ({ table, id, values }) a Podcast
 *  Production record from the Garage Studio. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });

  let body: { table?: string; id?: string; values?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  // Any configured table, including newsletter issues (their screen lives
  // under /garage/newsletter but saves through here).
  if (!body.table || !(body.table in STUDIO_TABLES) || !body.values || typeof body.values !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const table = body.table as StudioTableKey;
  try {
    if (body.id && !(await getStudioRecord(table, body.id))) {
      return NextResponse.json({ error: "That record is gone. Reload the list." }, { status: 404 });
    }
    const fields = await toAirtableFields(table, body.values);
    if (typeof fields === "string") return NextResponse.json({ error: fields }, { status: 400 });
    const record = await saveStudioRecord(table, body.id || null, fields);
    return NextResponse.json({ status: "ok", record });
  } catch (err) {
    console.error("garage studio save failed", err);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 502 });
  }
}
