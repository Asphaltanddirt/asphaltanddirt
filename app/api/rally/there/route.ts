import { NextRequest, NextResponse } from "next/server";
import { listRecords, updateRecord } from "@/lib/airtable";
import { verifyWasThere } from "@/lib/rallyAuth";
import { creditRsvp } from "@/lib/rally";

const EVENTS_BASE_ID = process.env.AIRTABLE_EVENTS_BASE_ID || "app5LS6dvcTKdxGqr";

/** "I was there" — the button on /rally/there (never on page load: mail
 *  scanners open links). Stamps Was There and adds the points right away. */
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { s?: string; id?: string; t?: string };
  if (!verifyWasThere(b.s, b.id, b.t)) return NextResponse.json({ error: "That link didn't work." }, { status: 400 });
  const [row] = await listRecords("RSVPs", `RECORD_ID() = '${b.id}'`, { baseId: EVENTS_BASE_ID });
  if (!row) return NextResponse.json({ error: "We couldn't find your RSVP." }, { status: 404 });
  if (!row.fields["Was There"]) await updateRecord("RSVPs", row.id, { "Was There": new Date().toISOString() }, { baseId: EVENTS_BASE_ID });
  const credited = await creditRsvp(row.id).catch((err) => {
    console.error("rally: creditRsvp failed", err);
    return false;
  });
  return NextResponse.json({ ok: true, credited });
}
