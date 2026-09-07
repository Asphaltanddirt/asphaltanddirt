import { NextRequest, NextResponse } from "next/server";
import { listRecords, updateRecord, isAirtableConfigured } from "@/lib/airtable";
import { AGREEMENT_VERSION } from "@/lib/ambassadorAgreement";

// Not secrets — safe to reference here. Override in env if these ever need to change.
const TO_EMAIL = process.env.AGREEMENT_ACCEPTANCE_TO_EMAIL || "team@asphaltanddirt.com";
const FROM_EMAIL = process.env.AGREEMENT_ACCEPTANCE_FROM_EMAIL || "Asphalt & Dirt <notifications@asphaltanddirt.com>";

const AMBASSADORS_TABLE = process.env.AIRTABLE_AMBASSADORS_TABLE || "Ambassadors";

const MAX_NAME_LENGTH = 120;
const MAX_TEXT = 500;
const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

/** "@handle" or "instagram.com/handle" -> a full profile URL for the
 *  Instagram URL field (a real url-type field in Airtable). */
function instagramUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, "").replace(/^(www\.)?instagram\.com\//i, "").replace(/\/+$/, "");
  return handle ? `https://instagram.com/${handle}` : "";
}

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

// Mirrors the Ambassadors "Expected Rate" formula (tier → commission %).
const TIER_RATE: Record<string, string> = {
  "Road & Trail Member": "10%",
  "Featured Ambassador": "12%",
  "Crew Partner": "15%",
};

export async function POST(req: NextRequest) {
  // Airtable is the record of acceptance — without it there's nowhere for the
  // signature to land, so it's required here (not best-effort).
  if (!isAirtableConfigured()) {
    return NextResponse.json({ error: "Agreement acceptance isn't configured yet — check back soon." }, { status: 500 });
  }

  let body: {
    email?: string;
    legalName?: string;
    phone?: string;
    instagram?: string;
    otherSocials?: string;
    vehicle?: string;
    shippingAddress?: string;
    shirtSize?: string;
    accepted?: boolean;
    company?: string;
  };
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
  const phone = (body.phone || "").trim().slice(0, 40);
  const instagram = (body.instagram || "").trim().slice(0, MAX_TEXT);
  const otherSocials = (body.otherSocials || "").trim().slice(0, MAX_TEXT);
  const vehicle = (body.vehicle || "").trim().slice(0, MAX_TEXT);
  const shippingAddress = (body.shippingAddress || "").trim().slice(0, MAX_TEXT);
  const shirtSize = (body.shirtSize || "").trim();

  if (!email || !legalName || !phone || !instagram || !vehicle || !shippingAddress || !shirtSize) {
    return NextResponse.json({ error: "Please fill in every field so we can finish setting you up." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (!SHIRT_SIZES.includes(shirtSize)) {
    return NextResponse.json({ error: "Please pick a shirt size." }, { status: 400 });
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

  const igUrl = instagramUrl(instagram);
  const socialLinks = [igUrl ? `Instagram: ${igUrl}` : `Instagram: ${instagram}`, otherSocials]
    .filter(Boolean)
    .join("\n");

  try {
    await updateRecord(AMBASSADORS_TABLE, ambassador.id, {
      "Agreement Signed": true,
      "Agreement Signed Date": todayISODate(),
      "Agreement Signature": legalName,
      "Agreement Acceptance Log": acceptanceLog,
      Phone: phone,
      "Vehicle / Build": vehicle,
      "Shipping Address": shippingAddress,
      "Shirt Size": shirtSize,
      "Instagram URL": igUrl || undefined,
      "Social Links": socialLinks,
    });
  } catch (err) {
    console.error("Airtable agreement write error", err);
    return NextResponse.json({ error: "Something went wrong saving your acceptance. Please try again." }, { status: 502 });
  }

  // Notify the team so they know to send Welcome Email Part 2 (the code + link).
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const ambName = (ambassador.fields.Name as string) || legalName;
    const tier = (ambassador.fields.Tier as string) || "Road & Trail Member";
    const rate = TIER_RATE[tier] || "10%";
    const hasCode = Boolean((ambassador.fields["Promo Code"] as string) || "");
    const row = (label: string, value: string) =>
      `<tr><td style="font-weight:bold;border-bottom:1px solid #eee;vertical-align:top;width:150px;">${escapeHtml(label)}</td><td style="border-bottom:1px solid #eee;white-space:pre-wrap;">${escapeHtml(value)}</td></tr>`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;color:#111;">
        <h2 style="margin-bottom:4px;">Brand Ambassador Agreement accepted: ${escapeHtml(ambName)}</h2>
        <p style="color:#555;margin-top:0;">Agreement Signed is checked and their profile + shipping details are on the record. Time to finish onboarding.</p>
        <table cellpadding="6" style="border-collapse:collapse;width:100%;font-size:14px;">
          ${row("Ambassador", ambName)}
          ${row("Email on file", (ambassador.fields.Email as string) || email)}
          ${row("Phone", phone)}
          ${row("Tier", `${tier} — ${rate} commission`)}
          ${row("Instagram", igUrl || instagram)}
          ${otherSocials ? row("Other socials", otherSocials) : ""}
          ${row("Vehicle / build", vehicle)}
          ${row("Shirt size", shirtSize)}
          ${row("Ship to", shippingAddress)}
          ${row("Signed", `${legalName} · ${acceptedAt}`)}
          ${row("Agreement version", AGREEMENT_VERSION)}
        </table>

        <h3 style="margin:24px 0 6px;">Onboarding checklist</h3>
        <ol style="font-size:14px;line-height:1.7;padding-left:20px;margin:0;">
          <li>${hasCode ? "Promo code already on the record — double-check it's live in Fourthwall." : "Create their discount code + tracked link in Fourthwall (10% customer discount)."}</li>
          <li>On their Ambassador record, set: <b>Promo Code</b>, <b>Fourthwall Promotion ID</b>, <b>Commission Rate</b> (${escapeHtml(rate)} for ${escapeHtml(tier)}), and <b>Start Date</b>.</li>
          <li>Pack &amp; ship the welcome kit (patch, stickers, shirt — size <b>${escapeHtml(shirtSize)}</b>) to the address above, then check <b>Kit Sent</b> + set <b>Kit Sent Date</b>.</li>
          <li>Send <b>Welcome Email Part 2</b> from Kit — the one with their code and tracking link. Only after steps 1–2 are done.</li>
        </ol>
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
