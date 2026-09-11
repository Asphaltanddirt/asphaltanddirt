import { NextRequest, NextResponse } from "next/server";
import { createRecord, uploadAttachment, isAirtableConfigured } from "@/lib/airtable";

// Not secrets — safe to reference here. Override in env if these ever need to change.
const TO_EMAIL = process.env.REVIEW_SUBMISSIONS_TO_EMAIL || "team@asphaltanddirt.com";
const FROM_EMAIL = process.env.REVIEW_SUBMISSIONS_FROM_EMAIL || "Asphalt & Dirt <notifications@asphaltanddirt.com>";

// Own base (not the Road & Trail Crew base other Airtable-backed features
// use) — keeps its record count independent on the free plan.
const BASE_ID = process.env.AIRTABLE_TESTIMONIALS_BASE_ID;
const TABLE = process.env.AIRTABLE_TESTIMONIALS_TABLE || "Testimonials";
const MAX_QUOTE_LENGTH = 600;

const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // per-photo safety net (photos are pre-compressed client-side)
const MAX_TOTAL_BYTES = 3.5 * 1024 * 1024; // keeps the base64'd email comfortably under Vercel's ~4.5MB request cap
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];

// Mirrors the <select> options in ReviewSubmissionForm, and the Role
// single-select's exact choices in Airtable — kept fixed so a submission
// (whether from the dropdown or a raw request) can't inject arbitrary free
// text into what's shown next to a testimonial.
const ALLOWED_ROLES = new Set([
  "Podcast Listener",
  "Event Attendee",
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
  if (!isAirtableConfigured(BASE_ID)) {
    return NextResponse.json({ error: "Reviews aren't configured yet — check back soon." }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  const name = ((formData.get("name") as string) || "").trim();
  const email = ((formData.get("email") as string) || "").trim();
  const rawRole = ((formData.get("role") as string) || "").trim();
  const role = ALLOWED_ROLES.has(rawRole) ? rawRole : "";
  const quote = ((formData.get("quote") as string) || "").trim().slice(0, MAX_QUOTE_LENGTH);
  const rating = Math.min(5, Math.max(1, Math.round(Number(formData.get("rating"))) || 5));

  if (!name || !email || !quote) {
    return NextResponse.json({ error: "Please fill out your name, email, and review." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const photos = formData.getAll("photos").filter((p): p is File => p instanceof File && p.size > 0);
  if (photos.length > MAX_PHOTOS) {
    return NextResponse.json({ error: `Please upload at most ${MAX_PHOTOS} photos.` }, { status: 400 });
  }
  for (const photo of photos) {
    if (photo.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "One of those photos is too large. Try removing it and re-adding a smaller one." }, { status: 400 });
    }
    if (photo.type && !ALLOWED_TYPES.includes(photo.type)) {
      return NextResponse.json({ error: "Photos must be JPG, PNG, WEBP, or HEIC." }, { status: 400 });
    }
  }
  const totalBytes = photos.reduce((sum, p) => sum + p.size, 0);
  if (totalBytes > MAX_TOTAL_BYTES) {
    return NextResponse.json({ error: "Your photos are too large combined. Try removing one." }, { status: 400 });
  }

  let recordId: string;
  try {
    const record = await createRecord(
      TABLE,
      {
        Name: name,
        Email: email,
        Role: role || "Community Member",
        Rating: String(rating), // Rating is an Airtable single-select ("1"–"5"), not a number field
        Quote: quote,
        Approved: false,
      },
      { baseId: BASE_ID },
    );
    recordId = record.id;
  } catch (err) {
    console.error("Airtable write error", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }

  // Attachments upload to the existing record one at a time, after it
  // exists — best-effort, since the record itself is already saved.
  for (const photo of photos) {
    try {
      await uploadAttachment(
        recordId,
        "Photo",
        {
          filename: photo.name || "photo.jpg",
          contentType: photo.type || "image/jpeg",
          base64: Buffer.from(await photo.arrayBuffer()).toString("base64"),
        },
        { baseId: BASE_ID },
      );
    } catch (err) {
      console.error("Airtable photo upload error", err);
    }
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
        ${photos.length ? `<p><strong>Photos:</strong> ${photos.length} attached in Airtable</p>` : ""}
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
