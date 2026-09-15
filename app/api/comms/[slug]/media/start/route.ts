import { NextRequest, NextResponse } from "next/server";
import { createRecord, isAirtableConfigured } from "@/lib/airtable";
import { getCommsSettings, isCommsOpen, postMessage, resolveCommsCaller, type Channel } from "@/lib/eventComms";
import { getEventBySlug } from "@/lib/events";
import {
  MAX_PHOTO_BYTES,
  MAX_TOTAL_BYTES,
  MAX_VIDEO_BYTES,
  MEDIA_BASE_ID,
  MEDIA_TABLE,
  allowedOrigin,
  resolveMediaType,
} from "@/lib/eventMedia";
import {
  createSubmissionFolder,
  createUploadSession,
  folderUrl,
  getAttendeeSubmissionsFolder,
  isDriveConfigured,
} from "@/lib/googleDrive";
import { MAX_FILES_PER_POST, driveNameFor, signMediaPost } from "@/lib/tailgateMedia";

const MAX_CAPTION = 500;

/** Opens a photo/video post: one Messages row + one gallery submission row
 *  per file, a Drive folder for the post, and a resumable upload URL per file. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isAirtableConfigured(MEDIA_BASE_ID) || !isDriveConfigured()) {
    return NextResponse.json({ error: "Photo posts aren't set up yet." }, { status: 500 });
  }
  const origin = allowedOrigin(req.headers.get("origin"));
  if (!origin) return NextResponse.json({ error: "Posts must come from asphaltanddirt.com." }, { status: 403 });

  const settings = await getCommsSettings(slug);
  if (!settings || !isCommsOpen(settings)) {
    return NextResponse.json({ error: "This chat isn't open." }, { status: 404 });
  }

  let body: {
    token?: string;
    staffCode?: string;
    staffName?: string;
    caption?: string;
    files?: { name?: string; type?: string; size?: number }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const caller = await resolveCommsCaller(settings, { token: body.token, staffCode: body.staffCode });
  if (!caller) {
    return NextResponse.json({ error: "We couldn't verify your link. Try opening it again from your email." }, { status: 403 });
  }
  if (!caller.staff && settings.trailStatus === "On trail") {
    return NextResponse.json({ error: "Posting is paused while we're on the trail. It comes back at Trail over." }, { status: 403 });
  }

  const files = Array.isArray(body.files) ? body.files : [];
  if (files.length === 0) return NextResponse.json({ error: "Add a photo or video." }, { status: 400 });
  if (files.length > MAX_FILES_PER_POST) {
    return NextResponse.json({ error: `Up to ${MAX_FILES_PER_POST} photos or videos at a time.` }, { status: 400 });
  }

  const resolved: { name: string; size: number; mimeType: string; kind: "photo" | "video" }[] = [];
  let total = 0;
  for (const file of files) {
    const name = (file.name || "").trim().slice(0, 200) || "upload";
    const size = Number(file.size);
    const media = resolveMediaType(name, (file.type || "").trim());
    if (!media) return NextResponse.json({ error: `"${name}" isn't a photo or video.` }, { status: 400 });
    if (!Number.isFinite(size) || size <= 0) return NextResponse.json({ error: `"${name}" looks empty.` }, { status: 400 });
    if (size > (media.kind === "video" ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES)) {
      return NextResponse.json(
        { error: `"${name}" is too large (${media.kind === "video" ? "videos up to 4 GB" : "photos up to 50 MB"}).` },
        { status: 400 },
      );
    }
    total += size;
    resolved.push({ name, size, ...media });
  }
  if (total > MAX_TOTAL_BYTES) {
    return NextResponse.json({ error: "That's more than 10 GB in one go. Post it in two batches." }, { status: 400 });
  }

  const event = await getEventBySlug(slug);
  if (!event) return NextResponse.json({ error: "We couldn't find that event." }, { status: 404 });

  // Same routing as a text message: before check-in an attendee's post goes
  // to the staff line only; staff posts go to the group.
  const channel: Channel = caller.staff ? "Chat" : caller.attendee.checkedIn ? "Chat" : "Staff";
  const authorName = caller.staff ? (body.staffName || "").trim().slice(0, 60) || "Staff" : caller.attendee.screenName;
  const vehicleCallsign = caller.staff ? "" : caller.attendee.vehicleCallsign;
  const caption = (body.caption || "").trim().slice(0, MAX_CAPTION);

  try {
    const submissionsFolderId = await getAttendeeSubmissionsFolder(event);
    const folderId = await createSubmissionFolder(submissionsFolderId, `${authorName} (Tailgate)`);

    const uploads = [];
    for (const [index, file] of resolved.entries()) {
      const driveName = driveNameFor(index, file.name);
      // The gallery row. Approved is set at complete, once the photo is
      // actually in Drive and we know it went to the group.
      const submission = await createRecord(
        MEDIA_TABLE,
        {
          Name: authorName,
          ...(caller.attendee?.email ? { Email: caller.attendee.email } : {}),
          Event: [event.id],
          Approved: false,
          "Rights Consent": true,
          "Upload Status": "Uploading",
          "Drive Folder": folderUrl(folderId),
          Source: "Tailgate",
        },
        { baseId: MEDIA_BASE_ID, typecast: true },
      );
      const { id: messageId } = await postMessage({
        eventSlug: slug,
        attendeeId: caller.attendee?.id,
        authorName,
        vehicleCallsign,
        channel,
        body: index === 0 ? caption : "",
        isStaff: caller.staff,
        media: {
          kind: file.kind === "video" ? "Video" : "Photo",
          fileName: driveName,
          size: file.size,
          submissionId: submission.id,
        },
      });
      uploads.push({
        messageId,
        token: signMediaPost(messageId),
        kind: file.kind,
        uploadUrl: await createUploadSession({ folderId, name: driveName, mimeType: file.mimeType, size: file.size, origin }),
      });
    }
    return NextResponse.json({ uploads });
  } catch (err) {
    console.error("tailgate media start failed", err);
    return NextResponse.json({ error: "Couldn't start that post. Try again." }, { status: 502 });
  }
}
