import { NextRequest, NextResponse } from "next/server";
import { listRecords, updateRecord, isAirtableConfigured } from "@/lib/airtable";
import { AGREEMENT_VERSION } from "@/lib/ambassadorAgreement";

// Not secrets — safe to reference here. Override in env if these ever need to change.
const TO_EMAIL = process.env.AGREEMENT_ACCEPTANCE_TO_EMAIL || "team@asphaltanddirt.com";
const FROM_EMAIL = process.env.AGREEMENT_ACCEPTANCE_FROM_EMAIL || "Asphalt & Dirt <notifications@asphaltanddirt.com>";

const AMBASSADORS_TABLE = process.env.AIRTABLE_AMBASSADORS_TABLE || "Ambassadors";

const MAX_NAME_LENGTH = 120;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function todayISODate() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD for the Airtable date field
}

export async function POST(req: NextRequest) {
  // Airtable is the record of acceptance — without it there's nowhere for the
  // signature to land, so it's required here (not best-effort).
  if (!isAirtableConfigured()) {
    return NextResponse.json({ error: "Agreement acceptance isn't configured yet — check back soon." }, { status: 500 });
  }

  let body: { email?: string; legalName?: string; accepted?: boolean; company?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  // Honeypot — a real visitor never fills this hidden field.
  if (body.company) {
    return NextResponse.json({ status: "ok" });
  }

  const email = (body.email || "").trim();
  const legalName = (body.legalName || "").trim().slice(0, MAX_NAME_LENGTH);

  if (!email || !legalName) {
    return NextResponse.json({ error: "Please enter your ambassador email and full legal name." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (body.accepted !== true) {
    return NextResponse.json({ error: "Please check the box to confirm you've read and accept the Agreement." }, { status: 400 });
  }

  // Match the ambassador by the email A&D has on file. No Status filter — an
  // ambassador can be accepting the agreement before they're fully activated.
  let ambassador;
  try {
    const escapedEmail = email.replace(/'/g, "\\'");
    const matches = await listRecords(AMBASSADORS_TABLE, `LOWER({Email})=LOWER('${escapedEmail}')`);
    ambassador = matches[0];
  } catch (err) {
    console.error("Ambassador lookup error", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }

  if (!ambassador) {
    return NextResponse.json(
      {
        error:
          "We couldn't find a Road & Trail Crew member with that email. Use the address on your acceptance email, or contact crew@asphaltanddirt.com.",
      },
      { status: 404 },
    );
  }

  // Already accepted — treat as success rather than an error, so a double
  // submit (or a re-visit) doesn't look broken.
  if (ambassador.fields["Agreement Signed"] === true) {
    return NextResponse.json({
      status: "already-accepted",
      name: (ambassador.fields.Name as string) || legalName,
    });
  }

  const acceptedAt = new Date().toISOString();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";
  const acceptanceLog = [
    `Accepted ${acceptedAt}`,
    `Agreement version: ${AGREEMENT_VERSION}`,
    `Typed name: ${legalName}`,
    `Email entered: ${email}`,
    `IP: ${ip}`,
    `Browser: ${userAgent}`,
  ].join("\n");

  try {
    await updateRecord(AMBASSADORS_TABLE, ambassador.id, {
      "Agreement Signed": true,
      "Agreement Signed Date": todayISODate(),
      "Agreement Signature": legalName,
      "Agreement Acceptance Log": acceptanceLog,
    });
  } catch (err) {
    console.error("Airtable agreement write error", err);
    return NextResponse.json({ error: "Something went wrong saving your acceptance. Please try again." }, { status: 502 });
  }

  // Notify the team so they know to send Welcome Email Part 2 (the code + link).
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const ambName = (ambassador.fields.Name as string) || legalName;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;color:#111;">
        <h2 style="margin-bottom:4px;">Brand Ambassador Agreement accepted: ${escapeHtml(ambName)}</h2>
        <p style="color:#555;margin-top:0;">Agreement Signed is now checked on their Ambassador record — clear to send Welcome Email Part 2 (code + tracking link).</p>
        <table cellpadding="6" style="border-collapse:collapse;width:100%;font-size:14px;">
          <tr><td style="font-weight:bold;border-bottom:1px solid #eee;">Ambassador</td><td style="border-bottom:1px solid #eee;">${escapeHtml(ambName)}</td></tr>
          <tr><td style="font-weight:bold;border-bottom:1px solid #eee;">Email on file</td><td style="border-bottom:1px solid #eee;">${escapeHtml((ambassador.fields.Email as string) || email)}</td></tr>
          <tr><td style="font-weight:bold;border-bottom:1px solid #eee;">Typed legal name</td><td style="border-bottom:1px solid #eee;">${escapeHtml(legalName)}</td></tr>
          <tr><td style="font-weight:bold;border-bottom:1px solid #eee;">Accepted</td><td style="border-bottom:1px solid #eee;">${escapeHtml(acceptedAt)}</td></tr>
          <tr><td style="font-weight:bold;">Agreement version</td><td>${escapeHtml(AGREEMENT_VERSION)}</td></tr>
        </table>
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
          subject: `Agreement Accepted: ${ambName}`,
          html,
        }),
      });
      if (!res.ok) console.error("Resend send error", res.status, await res.text());
    } catch (err) {
      console.error("Resend send threw", err);
    }
  }

  return NextResponse.json({ status: "accepted", name: (ambassador.fields.Name as string) || legalName });
}
