import { NextRequest, NextResponse } from "next/server";
import { createRecord, uploadAttachment } from "@/lib/airtable";

// Not secrets — safe to reference here. Override in env if these ever need to change.
const TO_EMAIL = process.env.AMBASSADOR_APPLICATIONS_TO_EMAIL || "team@asphaltanddirt.com";
const FROM_EMAIL = process.env.AMBASSADOR_APPLICATIONS_FROM_EMAIL || "Asphalt & Dirt <notifications@asphaltanddirt.com>";

// Airtable is optional — if it's not configured yet, the application still emails through.
// See lib/airtable.ts for the exact base/table field names this expects.
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_APPLICATIONS_TABLE = process.env.AIRTABLE_APPLICATIONS_TABLE || "Applications";

// Two separate uploaders: photos of the applicant (identity check before the
// video interview) and photos of their build (so reviewers can see the rig).
const MAX_SELF_PHOTOS = 3;
const MAX_BUILD_PHOTOS = 5;
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];

type PhotoData = { filename: string; contentType: string; base64: string };

const REQUIRED_FIELDS = [
  "name",
  "email",
  "location",
  "socialHandle",
  "vehicle",
  "contentFrequency",
  "audienceSize",
  "why",
  "contribution",
  "contentCommitment",
  "mediaCommitment",
  "eventInterest",
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

async function writeToAirtable(
  values: Record<string, string>,
  contentTypes: string[],
  cultureAreas: string[],
  interestAreas: string[],
  selfPhotos: PhotoData[],
  buildPhotos: PhotoData[],
) {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) return;

  try {
    const record = await createRecord(
      AIRTABLE_APPLICATIONS_TABLE,
      {
        Name: values.name,
        Email: values.email,
        Phone: values.phone || undefined,
        Location: values.location,
        "Age Confirmed": true,
        "Primary Social Handle": values.socialHandle,
        "Social Links": values.socialLinks || "",
        "Primary Vehicle / Build": values.vehicle,
        "Build Description": values.buildDescription || "",
        "Culture Areas": cultureAreas,
        "Clubs / Events / Communities": values.clubs || "",
        "Content Types": contentTypes.join(", "),
        "Content Portfolio Links": values.contentLinks || "",
        "Content Frequency": values.contentFrequency,
        "Audience Size": values.audienceSize,
        "Engagement / Audience Info": values.audience || "",
        "Meaningful Engagement": values.meaningfulEngagement || "",
        "Why A&D": values.why,
        "Non-Sales Contribution": values.contribution,
        "Culture Vision": values.cultureVision || "",
        "Monthly Content Commitment": values.contentCommitment,
        "Monthly Media Commitment": values.mediaCommitment,
        "Commitment Notes": values.commitmentNotes || "",
        "Event Representation": values.eventInterest,
        "Interest Areas": interestAreas,
        "Other Brand Relationships": values.otherBrands || "None",
        "Additional Info": values.additionalInfo || "",
        "Conduct Standards Accepted": true,
        Status: "Needs Review",
      },
      { typecast: true },
    );

    // Attachments upload to the now-existing record one at a time — don't block
    // record creation on them, and a failed photo shouldn't lose the application.
    for (const photo of selfPhotos) {
      await uploadAttachment(record.id, "Ambassador Photo", photo);
    }
    for (const photo of buildPhotos) {
      await uploadAttachment(record.id, "Build Photo(s)", photo);
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

  const ageConfirmed = field(formData, "ageConfirmed") === "on";
  if (!ageConfirmed) {
    return NextResponse.json({ error: "You must confirm you're 18 or older to apply." }, { status: 400 });
  }

  const conductAccepted = field(formData, "conductAccepted") === "on";
  if (!conductAccepted) {
    return NextResponse.json({ error: "Please confirm every Road & Trail Crew standard." }, { status: 400 });
  }

  const phone = field(formData, "phone");
  const buildDescription = field(formData, "buildDescription");
  const socialLinks = field(formData, "socialLinks");
  const clubs = field(formData, "clubs");
  const contentLinks = field(formData, "contentLinks");
  const audience = field(formData, "audience");
  const meaningfulEngagement = field(formData, "meaningfulEngagement");
  const cultureVision = field(formData, "cultureVision");
  const commitmentNotes = field(formData, "commitmentNotes");
  const otherBrands = field(formData, "otherBrands");
  const additionalInfo = field(formData, "additionalInfo");
  const contentTypes = formData.getAll("contentTypes").map((v) => String(v)).filter(Boolean);
  const cultureAreas = formData.getAll("cultureAreas").map((v) => String(v)).filter(Boolean);
  const interestAreas = formData.getAll("interestAreas").map((v) => String(v)).filter(Boolean);

  const selfPhotoFiles = formData.getAll("selfPhotos").filter((p): p is File => p instanceof File && p.size > 0);
  const buildPhotoFiles = formData.getAll("buildPhotos").filter((p): p is File => p instanceof File && p.size > 0);
  if (selfPhotoFiles.length > MAX_SELF_PHOTOS) {
    return NextResponse.json({ error: `Please upload at most ${MAX_SELF_PHOTOS} photos of yourself.` }, { status: 400 });
  }
  if (buildPhotoFiles.length > MAX_BUILD_PHOTOS) {
    return NextResponse.json({ error: `Please upload at most ${MAX_BUILD_PHOTOS} build photos.` }, { status: 400 });
  }
  const allPhotoFiles = [...selfPhotoFiles, ...buildPhotoFiles];
  for (const photo of allPhotoFiles) {
    if (photo.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "One of those photos is too large. Try removing it and re-adding a smaller one." }, { status: 400 });
    }
    if (photo.type && !ALLOWED_TYPES.includes(photo.type)) {
      return NextResponse.json({ error: "Photos must be JPG, PNG, WEBP, or HEIC." }, { status: 400 });
    }
  }
  const totalBytes = allPhotoFiles.reduce((sum, p) => sum + p.size, 0);
  if (totalBytes > MAX_TOTAL_BYTES) {
    return NextResponse.json({ error: "Your photos are too large combined. Try removing one." }, { status: 400 });
  }

  const toPhotoData = (files: File[]): Promise<PhotoData[]> =>
    Promise.all(
      files.map(async (photo) => ({
        filename: photo.name || "photo.jpg",
        contentType: photo.type || "image/jpeg",
        base64: Buffer.from(await photo.arrayBuffer()).toString("base64"),
      })),
    );
  const selfPhotoData = await toPhotoData(selfPhotoFiles);
  const buildPhotoData = await toPhotoData(buildPhotoFiles);
  const attachments = [...selfPhotoData, ...buildPhotoData].map(({ filename, base64 }) => ({ filename, content: base64 }));

  const rows: [string, string][] = [
    ["Applicant", `${values.name} (${values.email})`],
    ["Phone", phone || "—"],
    ["Location", values.location],
    ["Primary Social Handle", values.socialHandle],
    ["Other Social Links", socialLinks || "—"],
    ["Primary Vehicle / Rig", values.vehicle],
    ["Build Description", buildDescription || "—"],
    ["Culture Areas", cultureAreas.length ? cultureAreas.join(", ") : "—"],
    ["Clubs / Events / Communities", clubs || "—"],
    ["Can Create", contentTypes.length ? contentTypes.join(", ") : "—"],
    ["Content Portfolio Links", contentLinks || "—"],
    ["Content Frequency", values.contentFrequency],
    ["Audience Size", values.audienceSize],
    ["Audience Description", audience || "—"],
    ["Meaningful Engagement", meaningfulEngagement || "—"],
    ["Culture Vision", cultureVision || "—"],
    ["Monthly Content Commitment", values.contentCommitment],
    ["Monthly Media Commitment", values.mediaCommitment],
    ["Commitment Notes", commitmentNotes || "—"],
    ["Event Representation", values.eventInterest],
    ["Interest Areas", interestAreas.length ? interestAreas.join(", ") : "—"],
    ["Other Brand Relationships", otherBrands || "None"],
    ["Age Confirmed (18+)", "Yes"],
    ["Conduct Standards Accepted", "Yes (all 9 confirmed)"],
  ];

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;color:#111;">
      <h2 style="margin-bottom:4px;">New Road &amp; Trail Crew Application: ${escapeHtml(values.name)}</h2>
      <p style="color:#555;margin-top:0;">${attachments.length} photo${attachments.length === 1 ? "" : "s"} attached — ${selfPhotoData.length} of the applicant, ${buildPhotoData.length} of the build</p>
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
      <h3>Why They Want To Join The Crew</h3>
      <p style="white-space:pre-wrap;">${escapeHtml(values.why)}</p>
      <h3>What They Could Contribute Beyond Sales</h3>
      <p style="white-space:pre-wrap;">${escapeHtml(values.contribution)}</p>
      ${additionalInfo ? `<h3>Anything Else</h3><p style="white-space:pre-wrap;">${escapeHtml(additionalInfo)}</p>` : ""}
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
  await writeToAirtable(
    { ...values, phone, buildDescription, socialLinks, clubs, contentLinks, audience, meaningfulEngagement, cultureVision, commitmentNotes, otherBrands, additionalInfo },
    contentTypes,
    cultureAreas,
    interestAreas,
    selfPhotoData,
    buildPhotoData,
  );

  return NextResponse.json({ status: "sent" });
}
