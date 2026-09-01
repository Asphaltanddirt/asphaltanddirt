import { NextRequest, NextResponse } from "next/server";

// Not secrets — safe to reference here. Override in env if these ever need to change.
const TO_EMAIL = process.env.AMBASSADOR_APPLICATIONS_TO_EMAIL || "team@asphaltanddirt.com";
const FROM_EMAIL = process.env.AMBASSADOR_APPLICATIONS_FROM_EMAIL || "Asphalt & Dirt <notifications@asphaltanddirt.com>";

// Airtable is optional — if it's not configured yet, the application still emails through.
// See lib/airtable.ts for the exact base/table field names this expects.
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_APPLICATIONS_TABLE = process.env.AIRTABLE_APPLICATIONS_TABLE || "Applications";

const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_BYTES = 3.5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];

const REQUIRED_FIELDS = [
  "name",
  "email",
  "location",
  "socialLinks",
  "vehicle",
  "why",
  "contribution",
] as const;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function field(formData: FormData, key: string) {
  return ((formData.get(key) as string) || "").trim();
}

async function writeToAirtable(values: Record<string, string>, contentTypes: string[]) {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) return;

  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_APPLICATIONS_TABLE)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: {
            Name: values.name,
            Email: values.email,
            Location: values.location,
            "Social Links": values.socialLinks,
            "Primary Vehicle / Build": values.vehicle,
            "Automotive Interests": values.interests || "",
            "Clubs / Events / Communities": values.clubs || "",
            "Content Examples": values.contentExamples || "",
            "Engagement / Audience Info": values.audience || "",
            "Why A&D": values.why,
            "Non-Sales Contribution": values.contribution,
            "Content Types": contentTypes.join(", "),
            "Conduct Standards Accepted": true,
            "Other Brand Relationships": values.otherBrands || "None",
            Status: "New",
          },
        }),
      },
    );
    if (!res.ok) {
      console.error("Airtable write error", res.status, await res.text());
    }
  } catch (err) {
    console.error("Airtable write threw", err);
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Applications aren't configured yet — check back soon." }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  // Honeypot — a real visitor never fills this hidden field.
  if (field(formData, "company")) {
    return NextResponse.json({ status: "ok" });
  }

  const values = Object.fromEntries(REQUIRED_FIELDS.map((key) => [key, field(formData, key)])) as Record<
    (typeof REQUIRED_FIELDS)[number],
    string
  >;

  const missing = REQUIRED_FIELDS.filter((key) => !values[key]);
  if (missing.length) {
    return NextResponse.json({ error: "Please fill out all required fields." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const conductAccepted = field(formData, "conductAccepted") === "on";
  if (!conductAccepted) {
    return NextResponse.json({ error: "Please confirm you accept the conduct standards." }, { status: 400 });
  }

  const interests = field(formData, "interests");
  const clubs = field(formData, "clubs");
  const contentExamples = field(formData, "contentExamples");
  const audience = field(formData, "audience");
  const otherBrands = field(formData, "otherBrands");
  const contentTypes = formData.getAll("contentTypes").map((v) => String(v)).filter(Boolean);

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

  const attachments = await Promise.all(
    photos.map(async (photo) => ({
      filename: photo.name || "photo.jpg",
      content: Buffer.from(await photo.arrayBuffer()).toString("base64"),
    })),
  );

  const rows: [string, string][] = [
    ["Applicant", `${values.name} (${values.email})`],
    ["Location", values.location],
    ["Social Links", values.socialLinks],
    ["Primary Vehicle / Build", values.vehicle],
    ["Automotive Interests", interests || "—"],
    ["Clubs / Events / Communities", clubs || "—"],
    ["Content Examples", contentExamples || "—"],
    ["Engagement / Audience Info", audience || "—"],
    ["Can Create", contentTypes.length ? contentTypes.join(", ") : "—"],
    ["Other Brand Relationships", otherBrands || "None"],
    ["Conduct Standards Accepted", "Yes"],
  ];

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;color:#111;">
      <h2 style="margin-bottom:4px;">New Road &amp; Trail Crew Application: ${escapeHtml(values.name)}</h2>
      <p style="color:#555;margin-top:0;">${photos.length} photo${photos.length === 1 ? "" : "s"} attached</p>
      <table cellpadding="6" style="border-collapse:collapse;width:100%;font-size:14px;">
        ${rows
          .map(
            ([label, value]) => `
          <tr>
            <td style="font-weight:bold;vertical-align:top;width:200px;border-bottom:1px solid #eee;">${escapeHtml(label)}</td>
            <td style="border-bottom:1px solid #eee;white-space:pre-wrap;">${escapeHtml(value)}</td>
          </tr>`,
          )
          .join("")}
      </table>
      <h3>Why They Want To Represent A&amp;D</h3>
      <p style="white-space:pre-wrap;">${escapeHtml(values.why)}</p>
      <h3>What They Can Contribute Beyond Sales</h3>
      <p style="white-space:pre-wrap;">${escapeHtml(values.contribution)}</p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      reply_to: values.email,
      subject: `Road & Trail Crew Application: ${values.name}`,
      html,
      attachments,
    }),
  });

  if (!res.ok) {
    console.error("Resend send error", res.status, await res.text());
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }

  // Best-effort — Airtable being unconfigured or briefly down should never block the
  // applicant's confirmation; the email above is the reliable record either way.
  await writeToAirtable({ ...values, interests, clubs, contentExamples, audience, otherBrands }, contentTypes);

  return NextResponse.json({ status: "sent" });
}
