import { NextResponse } from "next/server";
import { listRecords, isAirtableConfigured } from "@/lib/airtable";

// TEMPORARY diagnostic route — delete once the empty-testimonials-on-production
// issue is root-caused. Bypasses getApprovedTestimonials()'s try/catch so the
// real Airtable error (if any) is visible, and runs with no caching so it
// always reflects the live, current state rather than a stale build.
export async function GET() {
  const configured = isAirtableConfigured();
  if (!configured) {
    return NextResponse.json({ configured: false });
  }

  try {
    const records = await listRecords("Testimonials", "{Approved}=1");
    return NextResponse.json({
      configured: true,
      count: records.length,
      records: records.map((r) => ({ id: r.id, fields: r.fields })),
    });
  } catch (err) {
    return NextResponse.json({
      configured: true,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
