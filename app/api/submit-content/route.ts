import { NextRequest, NextResponse } from "next/server";
import { listRecords, createRecord, isAirtableConfigured } from "@/lib/airtable";

// Not secrets — safe to reference here. Override in env if these ever need to change.
const TO_EMAIL = process.env.CONTENT_SUBMISSIONS_TO_EMAIL || "team@asphaltanddirt.com";
const FROM_EMAIL = process.env.CONTENT_SUBMISSIONS_FROM_EMAIL || "Asphalt & Dirt <onboarding@resend.dev>";

const AMBASSADORS_TABLE = process.env.AIRTABLE_AMBASSADORS_TABLE || "Ambassadors";
const SUBMISSIONS_TABLE = process.env.AIRTABLE_CONTENT_SUBMISSIONS_TABLE || "Content Submissions";

// Mirrors the Content Type single-select's exact choices in Airtable.
const ALLOWED_CONTENT_TYPES = new Set(["Photo", "Video", "Written Story", "Event Coverage"]);

const MAX_NOTES_LENGTH = 1000;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  if (!isAirtableConfigured()) {
    return NextResponse.json({ error: "Content submissions aren't configured yet — check back soon." }, { status: 500 });
  }

  let body: { email?: string; month?: string; contentType?: string; link?: string; notes?: string; company?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  // Honeypot — a real visitor never fills this hidden field. Accept quietly so bots
  // don't learn anything.
  if (body.company) {
    return NextResponse.json({ status: "ok" });
  }

  const email = (body.email || "").trim();
  const month = (body.month || "").trim();
  const rawContentType = (body.contentType || "").trim();
  const contentType = ALLOWED_CONTENT_TYPES.has(rawContentType) ? rawContentType : "";
  const link = (body.link || "").trim();
  const notes = (body.notes || "").trim().slice(0, MAX_NOTES_LENGTH);

  if (!email || !month || !contentType || !link) {
    return NextResponse.json({ error: "Please fill out all required fields." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  try {
    new URL(link);
  } catch {
    return NextResponse.json({ error: "Please enter a valid link (including https://)." }, { status: 400 });
  }

  // Only real, active ambassadors can submit — look up by the email they signed up with.
  let ambassador;
  try {
    const escapedEmail = email.replace(/'/g, "\\'");
    const matches = await listRecords(AMBASSADORS_TABLE, `AND({Email}='${escapedEmail}', {Status}='Active')`);
    ambassador = matches[0];
  } catch (err) {
    console.error("Ambassador lookup error", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }

  if (!ambassador) {
    return NextResponse.json(
      { error: "We couldn't find an active ambassador with that email. Double-check the address you signed up with, or contact us." },
      { status: 404 },
    );
  }

  try {
    await createRecord(SUBMISSIONS_TABLE, {
      Ambassador: [ambassador.id],
      Month: month,
      "Content Type": contentType,
      Link: link,
      Notes: notes,
      Approved: false,
    });
  } catch (err) {
    console.error("Airtable write error", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }

  // Notification email is best-effort — the Airtable record above is the reliable
  // record either way.
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;color:#111;">
        <h2 style="margin-bottom:4px;">New Content Submission: ${escapeHtml(ambassador.fields.Name as string || email)}</h2>
        <p style="color:#555;margin-top:0;">${escapeHtml(contentType)} — ${escapeHtml(month)}</p>
        <p><strong>Link:</strong> <a href="${link}">${escapeHtml(link)}</a></p>
        ${notes ? `<h3>Notes</h3><p style="white-space:pre-wrap;">${escapeHtml(notes)}</p>` : ""}
      </div>
    `;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: TO_EMAIL,
          reply_to: email,
          subject: `Content Submission: ${ambassador.fields.Name || email}`,
          html,
        }),
      });
      if (!res.ok) {
        console.error("Resend send error", res.status, await res.text());
      }
    } catch (err) {
      console.error("Resend send threw", err);
    }
  }

  return NextResponse.json({ status: "sent" });
}
