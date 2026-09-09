import { NextRequest, NextResponse } from "next/server";
import { createRecord, isAirtableConfigured } from "@/lib/airtable";

// Not secrets — safe to reference here. Override in env if they ever change.
const TO_EMAIL = process.env.CONTACT_TO_EMAIL || "team@asphaltanddirt.com";
const FROM_EMAIL =
  process.env.CONTACT_FROM_EMAIL || "Asphalt & Dirt <notifications@asphaltanddirt.com>";

// Optional — if set, submissions are also logged to Airtable. Email is the
// primary delivery either way, so this is best-effort (unlike the review
// route, where Airtable IS the publish mechanism).
const BASE_ID = process.env.AIRTABLE_CONTACT_BASE_ID;
const TABLE = process.env.AIRTABLE_CONTACT_TABLE || "Contact";

const MAX_MESSAGE_LENGTH = 4000;

// Mirrors the <select> in ContactForm — fixed so a raw request can't inject
// arbitrary text into the subject line / Airtable single-select.
const ALLOWED_TOPICS = new Set([
  "Podcast",
  "Events & Partnerships",
  "Ambassador Program",
  "Media & Press",
  "Something Else",
]);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  let body: { name?: string; email?: string; topic?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  const name = (body.name || "").trim();
  const email = (body.email || "").trim();
  const rawTopic = (body.topic || "").trim();
  const topic = ALLOWED_TOPICS.has(rawTopic) ? rawTopic : "Something Else";
  const message = (body.message || "").trim().slice(0, MAX_MESSAGE_LENGTH);

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Please fill out your name, email, and message." },
      { status: 400 },
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Contact isn't configured yet — please email team@asphaltanddirt.com." },
      { status: 500 },
    );
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;color:#111;">
      <h2 style="margin-bottom:4px;">New Contact: ${escapeHtml(name)}</h2>
      <p style="color:#555;margin-top:0;">Topic: <strong>${escapeHtml(topic)}</strong></p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <h3>Message</h3>
      <p style="white-space:pre-wrap;">${escapeHtml(message)}</p>
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
        subject: `Contact (${topic}): ${name}`,
        html,
      }),
    });
    if (!res.ok) {
      console.error("Resend send error", res.status, await res.text());
      return NextResponse.json(
        { error: "Something went wrong sending your message. Please try again." },
        { status: 502 },
      );
    }
  } catch (err) {
    console.error("Resend send threw", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 502 },
    );
  }

  // Best-effort Airtable log — a failure here must not fail the submission,
  // the email above already delivered it.
  if (isAirtableConfigured(BASE_ID)) {
    try {
      await createRecord(
        TABLE,
        { Name: name, Email: email, Topic: topic, Message: message },
        { baseId: BASE_ID },
      );
    } catch (err) {
      console.error("Contact Airtable log error", err);
    }
  }

  return NextResponse.json({ status: "sent" });
}
