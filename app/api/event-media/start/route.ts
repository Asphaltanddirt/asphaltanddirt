import { NextRequest, NextResponse } from "next/server";
import { PRIVACY_POLICY_VERSION, UPLOAD_TERMS_VERSION } from "@/lib/waivers";
import { createRecord, isAirtableConfigured } from "@/lib/airtable";
import { getEventBySlug, uploadsOpen } from "@/lib/events";
import {
  createSubmissionFolder,
  createUploadSession,
  folderUrl,
  getAttendeeSubmissionsFolder,
  isDriveConfigured,
} from "@/lib/googleDrive";
import {
  MAX_FILES,
  MAX_PHOTO_BYTES,
  MAX_TOTAL_BYTES,
  MAX_VIDEO_BYTES,
  MEDIA_BASE_ID,
  MEDIA_TABLE,
  allowedOrigin,
  resolveMediaType,
  signSubmission,
} from "@/lib/eventMedia";

interface StartBody {
  eventSlug?: string;
  name?: string;
  email?: string;
  consent?: boolean;
  ageConfirmed?: boolean;
  signature?: string;
  esign?: boolean;
  privacyAck?: boolean;
  permissionNotes?: string;
  company?: string;
  files?: { name?: string; type?: string; size?: number }[];
}

export async function POST(req: NextRequest) {
  if (!isAirtableConfigured(MEDIA_BASE_ID) || !isDriveConfigured()) {
    return NextResponse.json({ error: "Uploads aren't set up yet. Check back soon." }, { status: 500 });
  }

  const origin = allowedOrigin(req.headers.get("origin"));
  if (!origin) return NextResponse.json({ error: "Uploads must come from asphaltanddirt.com." }, { status: 403 });

  let body: StartBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  // Honeypot — a real visitor never fills this hidden field.
  if (body.company) return NextResponse.json({ error: "Invalid submission." }, { status: 400 });

  const name = (body.name || "").trim().slice(0, 120);
  const email = (body.email || "").trim().slice(0, 200);
  if (!name || !email) return NextResponse.json({ error: "Please fill out your name and email." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  // Upload terms UPLOAD-1.1: every acknowledgment is part of the terms.
  if (body.consent !== true || body.ageConfirmed !== true) {
    return NextResponse.json({ error: "Please confirm the upload acknowledgment." }, { status: 400 });
  }
  const signature = (body.signature || "").trim().slice(0, 120);
  if (!signature || body.esign !== true) {
    return NextResponse.json({ error: "Please type your full legal name as your signature." }, { status: 400 });
  }
  if (body.privacyAck !== true) {
    return NextResponse.json({ error: "Please acknowledge the privacy policy." }, { status: 400 });
  }
  const permissionNotes = (body.permissionNotes || "").trim().slice(0, 2000);

  const files = Array.isArray(body.files) ? body.files : [];
  if (files.length === 0) return NextResponse.json({ error: "Add at least one photo or video." }, { status: 400 });
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `You can send up to ${MAX_FILES} files at a time.` }, { status: 400 });
  }

  const resolved: { name: string; size: number; mimeType: string; kind: "photo" | "video" }[] = [];
  let total = 0;
  for (const file of files) {
    const fileName = (file.name || "").trim().slice(0, 200) || "upload";
    const size = Number(file.size);
    const media = resolveMediaType(fileName, (file.type || "").trim());
    if (!media) return NextResponse.json({ error: `"${fileName}" isn't a photo or video.` }, { status: 400 });
    if (!Number.isFinite(size) || size <= 0) {
      return NextResponse.json({ error: `"${fileName}" looks empty.` }, { status: 400 });
    }
    const limit = media.kind === "video" ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES;
    if (size > limit) {
      return NextResponse.json(
        { error: `"${fileName}" is too large (${media.kind === "video" ? "videos up to 4 GB" : "photos up to 50 MB"}).` },
        { status: 400 },
      );
    }
    total += size;
    resolved.push({ name: fileName, size, ...media });
  }
  if (total > MAX_TOTAL_BYTES) {
    return NextResponse.json({ error: "That's more than 10 GB in one go. Send it in two batches." }, { status: 400 });
  }

  const event = body.eventSlug ? await getEventBySlug(body.eventSlug) : null;
  if (!event) return NextResponse.json({ error: "We couldn't find that event." }, { status: 404 });
  if (!uploadsOpen(event.date)) {
    return NextResponse.json({ error: "Photo sharing opens on the day of the event." }, { status: 400 });
  }

  try {
    const submissionsFolderId = await getAttendeeSubmissionsFolder(event);
    const folderId = await createSubmissionFolder(submissionsFolderId, name);

    const record = await createRecord(
      MEDIA_TABLE,
      {
        Name: name,
        Email: email,
        Event: [event.id],
        Approved: false,
        "Rights Consent": true,
        "Age Confirmed": true,
        Signature: signature,
        "Terms Version": UPLOAD_TERMS_VERSION,
        "Privacy Notice Acknowledged": PRIVACY_POLICY_VERSION,
        ...(permissionNotes ? { "Permission Notes": permissionNotes } : {}),
        "Upload Status": "Uploading",
        "Drive Folder": folderUrl(folderId),
        Source: "Event page",
      },
      { baseId: MEDIA_BASE_ID, typecast: true },
    );

    const uploads = [];
    for (const file of resolved) {
      uploads.push({
        uploadUrl: await createUploadSession({ folderId, name: file.name, mimeType: file.mimeType, size: file.size, origin }),
        kind: file.kind,
      });
    }

    return NextResponse.json({ submissionId: record.id, token: signSubmission(record.id), uploads });
  } catch (err) {
    console.error("event-media start failed", err);
    return NextResponse.json({ error: "Something went wrong starting your upload. Please try again." }, { status: 502 });
  }
}
