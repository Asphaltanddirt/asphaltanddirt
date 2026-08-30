import { NextRequest, NextResponse } from "next/server";

// Not secrets — safe to reference here. Override in env if these ever need to change.
const TO_EMAIL = process.env.BUILD_SUBMISSIONS_TO_EMAIL || "team@asphaltanddirt.com";
const FROM_EMAIL = process.env.BUILD_SUBMISSIONS_FROM_EMAIL || "Asphalt & Dirt <onboarding@resend.dev>";

const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // per-photo safety net (photos are pre-compressed client-side)
const MAX_TOTAL_BYTES = 3.5 * 1024 * 1024; // keeps the base64'd email comfortably under Vercel's ~4.5MB request cap
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];

const REQUIRED_FIELDS = ["name", "email", "rigName", "vehicle", "category", "tagline", "story"] as const;

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

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Build submissions aren't configured yet — check back soon." }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  // Honeypot — a real visitor never fills this hidden field. Accept quietly so bots
  // don't learn anything, and skip sending an email for it.
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

  const social = field(formData, "social");
  const statPower = field(formData, "statPower");
  const statTires = field(formData, "statTires");
  const statLift = field(formData, "statLift");
  const specEngine = field(formData, "specEngine");
  const specSuspension = field(formData, "specSuspension");
  const specWheelsTires = field(formData, "specWheelsTires");
  const specOther = field(formData, "specOther");

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
    return NextResponse.json({ error: "Your photos are too large combined. Try removing one or two." }, { status: 400 });
  }

  const attachments = await Promise.all(
    photos.map(async (photo) => ({
      filename: photo.name || "photo.jpg",
      content: Buffer.from(await photo.arrayBuffer()).toString("base64"),
    })),
  );

  const rows: [string, string][] = [
    ["Submitted By", `${values.name} (${values.email})`],
    ["Social", social || "—"],
    ["Rig Name", values.rigName],
    ["Vehicle", values.vehicle],
    ["Category", values.category],
    ["Tagline", values.tagline],
    ["Horsepower / Engine", statPower || "—"],
    ["Tire Size", statTires || "—"],
    ["Lift Height", statLift || "—"],
    ["Engine Spec", specEngine || "—"],
    ["Suspension / Lift Spec", specSuspension || "—"],
    ["Wheels & Tires Spec", specWheelsTires || "—"],
  ];

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;color:#111;">
      <h2 style="margin-bottom:4px;">New Build Submission: ${escapeHtml(values.rigName)}</h2>
      <p style="color:#555;margin-top:0;">${photos.length} photo${photos.length === 1 ? "" : "s"} attached</p>
      <table cellpadding="6" style="border-collapse:collapse;width:100%;font-size:14px;">
        ${rows
          .map(
            ([label, value]) => `
          <tr>
            <td style="font-weight:bold;vertical-align:top;width:180px;border-bottom:1px solid #eee;">${escapeHtml(label)}</td>
            <td style="border-bottom:1px solid #eee;">${escapeHtml(value)}</td>
          </tr>`,
          )
          .join("")}
      </table>
      ${specOther ? `<h3>Other Mods / Specs</h3><p style="white-space:pre-wrap;">${escapeHtml(specOther)}</p>` : ""}
      <h3>Their Story</h3>
      <p style="white-space:pre-wrap;">${escapeHtml(values.story)}</p>
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
      subject: `Build Submission: ${values.rigName} (${values.vehicle})`,
      html,
      attachments,
    }),
  });

  if (!res.ok) {
    console.error("Resend send error", res.status, await res.text());
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ status: "sent" });
}
