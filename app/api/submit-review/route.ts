import { NextRequest, NextResponse } from "next/server";
import { createRecord, isAirtableConfigured } from "@/lib/airtable";

// Not secrets — safe to reference here. Override in env if these ever need to change.
const TO_EMAIL = process.env.REVIEW_SUBMISSIONS_TO_EMAIL || "team@asphaltanddirt.com";
const FROM_EMAIL = process.env.REVIEW_SUBMISSIONS_FROM_EMAIL || "Asphalt & Dirt <onboarding@resend.dev>";

const TABLE = process.env.AIRTABLE_TESTIMONIALS_TABLE || "Testimonials";
const MAX_QUOTE_LENGTH = 600;

// Mirrors the <select> options in ReviewSubmissionForm — kept fixed so a
// submission (whether from the dropdown or a raw request) can't inject
// arbitrary free text into what's shown next to a testimonial.
const ALLOWED_ROLES = new Set([
  "Podcast Listener",
  "Event Attendee",
  "Trail Rider",
  "Community Member",
  "Customer",
  "Other",
]);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  // Airtable is the actual publishing mechanism for this feature — without it
  // configured, a submission would have nowhere to land, so this is required
  // (unlike the best-effort Airtable write on the Ambassador application).
  if (!isAirtableConfigured()) {
    return NextResponse.json({ error: "Reviews aren't configured yet — check back soon." }, { status: 500 });
  }

  let body: { name?: string; email?: string; role?: string; quote?: string; rating?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  const name = (body.name || "").trim();
  const email = (body.email || "").trim();
  const rawRole = (body.role || "").trim();
  const role = ALLOWED_ROLES.has(rawRole) ? rawRole : "";
  const quote = (body.quote || "").trim().slice(0, MAX_QUOTE_LENGTH);
  const rating = Math.min(5, Math.max(1, Math.round(Number(body.rating)) || 5));

  if (!name || !email || !quote) {
    return NextResponse.json({ error: "Please fill out your name, email, and review." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  try {
    await createRecord(TABLE, {
      Name: name,
      Email: email,
      Role: role || "Community Member",
      Rating: String(rating), // Rating is an Airtable single-select ("1"–"5"), not a number field
      Quote: quote,
      Approved: false,
    });
  } catch (err) {
    console.error("Airtable write error", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }

  // Notification email is best-effort — the Airtable record above is the reliable
  // record either way, and a missing/misconfigured Resend key shouldn't block
  // the reviewer's submission from going through.
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;color:#111;">
        <h2 style="margin-bottom:4px;">New Review Submitted: ${escapeHtml(name)}</h2>
        <p style="color:#555;margin-top:0;">${"★".repeat(rating)}${"☆".repeat(5 - rating)} &mdash; awaiting approval in Airtable</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Role:</strong> ${escapeHtml(role || "Community Member")}</p>
        <h3>Quote</h3>
        <p style="white-space:pre-wrap;">${escapeHtml(quote)}</p>
      </div>
    `;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: TO_EMAIL,
          reply_to: email,
          subject: `Review Submission: ${name}`,
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
