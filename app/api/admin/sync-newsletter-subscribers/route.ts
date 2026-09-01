import { NextRequest, NextResponse } from "next/server";
import { syncNewsletterSubscribers } from "@/lib/newsletterSubscribers";

/**
 * Pulls every subscriber from Kit and upserts them into the Newsletter
 * Airtable base (matched on Kit ID) — never sends anything, purely a data
 * sync for reporting. Triggered manually: either hit directly, or wired to
 * an Airtable "Run a script" button automation (see the setup snippet given
 * alongside this route).
 */
export async function POST(req: NextRequest) {
  const adminSecret = process.env.ADMIN_API_SECRET;
  if (!adminSecret) {
    return NextResponse.json({ error: "Admin actions are not configured." }, { status: 500 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const count = await syncNewsletterSubscribers();
    return NextResponse.json({ status: "synced", count });
  } catch (err) {
    console.error("Newsletter subscriber sync error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed." },
      { status: 502 },
    );
  }
}
