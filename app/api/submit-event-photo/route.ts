import { NextRequest, NextResponse } from "next/server";
import { createRecord, uploadAttachment, isAirtableConfigured } from "@/lib/airtable";

const TO_EMAIL = process.env.REVIEW_SUBMISSIONS_TO_EMAIL || "team@asphaltanddirt.com";
const FROM_EMAIL = process.env.REVIEW_SUBMISSIONS_FROM_EMAIL || "Asphalt & Dirt <notifications@asphaltanddirt.com>";

const BASE_ID = process.env.AIRTABLE_EVENTS_BASE_ID;
const TABLE = "Event Photo Submissions";

const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // per-photo safety net (photos are pre-compressed client-side)
const MAX_TOTAL_BYTES = 3.5 * 1024 * 1024; // keeps the base64'd email comfortably under Vercel's ~4.5MB request cap
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  if (!isAirtableConfigured(BASE_ID)) {
    return NextResponse.json({ error: "Photo submissions aren't configured yet — check back soon." }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  // Honeypot — a real visitor never fills this hidden field.
  if (formData.get("company")) {
    return NextResponse.json({ status: "sent" });
  }

  const name = ((formData.get("name") as string) || "").trim();
  const email = ((formData.get("email") as string) || "").trim();
  const eventRecordId = ((formData.get("eventRecordId") as string) || "").trim();
  const eventTitle = ((formData.get("eventTitle") as string) || "").trim();

  if (!name || !email || !eventRecordId) {
    return NextResponse.json({ error: "Please fill out your name and email." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const photos = formData.getAll("photos").filter((p): p is File => p instanceof File && p.size > 0);
  if (photos.length === 0) {
    return NextResponse.json({ error: "Please add at least one photo." }, { status: 400 });
  }
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
        Event: [eventRecordId],
        Approved: false,
      },
      { baseId: BASE_ID },
    );
    recordId = record.id;
  } catch (err) {
    console.error("Airtable write error", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }

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

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;color:#111;">
        <h2 style="margin-bottom:4px;">New Event Photo Submission: ${escapeHtml(name)}</h2>
        <p style="color:#555;margin-top:0;">For ${escapeHtml(eventTitle || "an event")} &mdash; awaiting approval in Airtable</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Photos:</strong> ${photos.length} attached in Airtable</p>
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
          subject: `Event Photo Submission: ${name}`,
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
