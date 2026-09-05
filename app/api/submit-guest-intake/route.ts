import { NextRequest, NextResponse } from "next/server";
import { createRecord, isAirtableConfigured } from "@/lib/airtable";

// Not secrets — safe to reference here. Override in env if these ever need to change.
const TO_EMAIL = process.env.GUEST_INTAKE_TO_EMAIL || "team@asphaltanddirt.com";
const FROM_EMAIL = process.env.GUEST_INTAKE_FROM_EMAIL || "Asphalt & Dirt <notifications@asphaltanddirt.com>";

// Own base (Podcast Production — Guests/Sponsors/Episodes/Video Ideas), not
// the Road & Trail Crew base other Airtable-backed features use.
const BASE_ID = process.env.AIRTABLE_PODCAST_PRODUCTION_BASE_ID;
const TABLE = process.env.AIRTABLE_GUESTS_TABLE || "Guests";
const MAX_BIO_LENGTH = 800;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  // Airtable is the actual destination for this data — without it configured,
  // a submission has nowhere to land.
  if (!isAirtableConfigured(BASE_ID)) {
    return NextResponse.json({ error: "Guest intake isn't configured yet — check back soon." }, { status: 500 });
  }

  let body: {
    company?: string; // honeypot
    name?: string;
    email?: string;
    phone?: string;
    bio?: string;
    socialLinks?: { platform?: string; url?: string }[];
    hasYoutubeChannel?: boolean;
    youtubeUrl?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  // Honeypot — a real visitor never fills this hidden field. Accept quietly so
  // bots don't learn anything, and skip both the Airtable write and the email.
  if (body.company) {
    return NextResponse.json({ status: "ok" });
  }

  const name = (body.name || "").trim();
  const email = (body.email || "").trim();
  const phone = (body.phone || "").trim();
  const bio = (body.bio || "").trim().slice(0, MAX_BIO_LENGTH);
  // Stored as one "Platform: url" line per link — supports however many a
  // guest has without needing a fixed column per platform.
  const socialLinks = (Array.isArray(body.socialLinks) ? body.socialLinks : [])
    .map((l) => ({ platform: (l.platform || "Other").trim(), url: (l.url || "").trim() }))
    .filter((l) => l.url);
  const socialLinksText = socialLinks.map((l) => `${l.platform}: ${l.url}`).join("\n");
  const hasYoutubeChannel = Boolean(body.hasYoutubeChannel);
  const youtubeUrl = hasYoutubeChannel ? (body.youtubeUrl || "").trim() : "";

  if (!name || !email || !bio) {
    return NextResponse.json({ error: "Please fill out your name, email, and a short bio." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  try {
    await createRecord(
      TABLE,
      {
        "Guest Name": name,
        "Contact Email": email,
        "Contact Phone": phone || undefined,
        "Public Bio": bio,
        "Social Links": socialLinksText || undefined,
        "Has Own YouTube Channel": hasYoutubeChannel,
        "YouTube Channel URL": youtubeUrl || undefined,
        "Booking Status": "Reached Out",
      },
      { baseId: BASE_ID },
    );
  } catch (err) {
    console.error("Airtable write error", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }

  // Notification email is best-effort — the Airtable record above is the
  // reliable record either way.
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;color:#111;">
        <h2 style="margin-bottom:4px;">New Guest Intake: ${escapeHtml(name)}</h2>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        ${phone ? `<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ""}
        ${socialLinks.length ? `<p><strong>Social Links:</strong><br>${socialLinks.map((l) => `${escapeHtml(l.platform)}: ${escapeHtml(l.url)}`).join("<br>")}</p>` : ""}
        ${hasYoutubeChannel ? `<p><strong>YouTube Channel:</strong> ${escapeHtml(youtubeUrl || "(not provided)")}</p>` : ""}
        <h3>Bio</h3>
        <p style="white-space:pre-wrap;">${escapeHtml(bio)}</p>
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
          subject: `Guest Intake: ${name}`,
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
