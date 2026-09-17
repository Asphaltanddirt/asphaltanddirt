import { NextRequest, NextResponse } from "next/server";
import { listRecords, updateRecord, isAirtableConfigured } from "@/lib/airtable";
import { AGREEMENT_VERSION } from "@/lib/ambassadorAgreement";
import {
  SOCIAL_PLATFORMS,
  dedupeSocials,
  firstSocial,
  formatSocialLines,
  parseSocialLines,
  socialUrl,
  type SocialLink,
  type SocialPlatformName,
} from "@/lib/socialLinks";

// Not secrets — safe to reference here. Override in env if these ever need to change.
const TO_EMAIL = process.env.AGREEMENT_ACCEPTANCE_TO_EMAIL || "team@asphaltanddirt.com";
const FROM_EMAIL = process.env.AGREEMENT_ACCEPTANCE_FROM_EMAIL || "Asphalt & Dirt <notifications@asphaltanddirt.com>";

const AMBASSADORS_TABLE = process.env.AIRTABLE_AMBASSADORS_TABLE || "Ambassadors";

const MAX_NAME_LENGTH = 120;
const MAX_TEXT = 500;
const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

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
    socials?: { platform?: string; url?: string }[];
    // Older form (a page open from before the deploy): one Instagram box + a
    // free-text box of other links.
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
  const socials: SocialLink[] = dedupeSocials(
    Array.isArray(body.socials)
      ? body.socials
          .slice(0, 20)
          .map((s) => {
            const platform = (SOCIAL_PLATFORMS as readonly string[]).includes(s?.platform || "")
              ? (s.platform as SocialPlatformName)
              : "Other";
            return { platform, url: socialUrl(platform, String(s?.url || "").slice(0, MAX_TEXT)) };
          })
          .filter((s) => s.url)
      : [
          ...(body.instagram ? [{ platform: "Instagram" as const, url: socialUrl("Instagram", body.instagram.slice(0, MAX_TEXT)) }] : []),
          ...parseSocialLines((body.otherSocials || "").slice(0, MAX_TEXT)),
        ],
  );
  const vehicle = (body.vehicle || "").trim().slice(0, MAX_TEXT);
  const shippingAddress = (body.shippingAddress || "").trim().slice(0, MAX_TEXT);
  const shirtSize = (body.shirtSize || "").trim();

  if (!socials.length) {
    return NextResponse.json({ error: "Please add at least one social link." }, { status: 400 });
  }
  if (!email || !legalName || !phone || !vehicle || !shippingAddress || !shirtSize) {
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

  // Social Links keeps every link, any platform. The three per-platform URL
  // fields (read by the Garage profile and /team) follow what they confirmed.
  const socialLinks = formatSocialLines(socials);
  const platformUrl = (platform: SocialPlatformName, field: string) => {
    const url = firstSocial(socials, platform);
    return url && /^https?:\/\//i.test(url) ? { [field]: url } : {};
  };

  let updated;
  try {
    updated = await updateRecord(AMBASSADORS_TABLE, ambassador.id, {
      "Agreement Signed": true,
      "Agreement Signed Date": todayISODate(),
      "Agreement Signature": legalName,
      "Agreement Acceptance Log": acceptanceLog,
      Phone: phone,
      "Vehicle / Build": vehicle,
      "Shipping Address": shippingAddress,
      "Shirt Size": shirtSize,
      ...platformUrl("Instagram", "Instagram URL"),
      ...platformUrl("TikTok", "TikTok URL"),
      ...platformUrl("YouTube", "YouTube URL"),
      "Social Links": socialLinks,
      // Signing is when they become a working ambassador: fill Start Date and
      // their tier's commission rate if nobody has set them yet (they used to
      // be manual steps and were easy to miss). A rate set by hand is kept.
      ...(ambassador.fields["Start Date"] ? {} : { "Start Date": todayISODate() }),
      ...(typeof ambassador.fields["Commission Rate"] === "number"
        ? {}
        : { "Commission Rate": Number.parseFloat(TIER_RATE[(ambassador.fields.Tier as string) || ""] || "10%") / 100 }),
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
    const hasCode = Boolean((updated.fields["Promo Code"] as string) || "");
    const appId = ((ambassador.fields["Related Application"] as string[] | undefined) || [])[0];
    const garageUrl = appId ? `https://www.asphaltanddirt.com/garage/applications/${appId}` : "https://www.asphaltanddirt.com/garage/applications";
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
          ${row("Socials", socialLinks)}
          ${row("Vehicle / build", vehicle)}
          ${row("Shirt size", shirtSize)}
          ${row("Ship to", shippingAddress)}
          ${row("Signed", `${legalName} · ${acceptedAt}`)}
          ${row("Agreement version", AGREEMENT_VERSION)}
        </table>

        <h3 style="margin:24px 0 6px;">Next steps, in the Garage</h3>
        <p style="font-size:14px;margin:0 0 8px;"><a href="${garageUrl}">Open their onboarding in the Garage</a></p>
        <ol style="font-size:14px;line-height:1.7;padding-left:20px;margin:0;">
          <li>${hasCode ? "Their code is already made." : "Create their code (type the code and % off; the Garage makes it in Fourthwall and makes their link)."}</li>
          <li>Send welcome email 2 (their code + link).</li>
          <li>Pack &amp; ship the welcome kit (patch, stickers, shirt, size <b>${escapeHtml(shirtSize)}</b>) to the address above, then check <b>Kit Sent</b> + set <b>Kit Sent Date</b> in Airtable.</li>
        </ol>
        <p style="font-size:13px;color:#555;">Commission rate ${escapeHtml(rate)} and Start Date were filled in automatically if blank.</p>
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
