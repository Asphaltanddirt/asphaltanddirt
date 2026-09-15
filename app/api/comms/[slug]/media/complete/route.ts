import { NextRequest, NextResponse } from "next/server";
import { findFileInFolder } from "@/lib/googleDrive";
import { folderIdFromUrl, getSubmission, updateSubmission } from "@/lib/eventMedia";
import { getMessageForUpload, updateMessage } from "@/lib/eventComms";
import { verifyMediaPost } from "@/lib/tailgateMedia";

/**
 * Finishes one file of a post. Checks Drive for the file rather than trusting
 * the phone, then shows the post in the feed. A photo posted to the group goes
 * straight into the public gallery (staff Hide takes it back out); staff-line
 * photos and all videos stay out of it.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let body: { messageId?: string; token?: string; failed?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!verifyMediaPost(body.messageId, body.token)) {
    return NextResponse.json({ error: "Invalid post." }, { status: 403 });
  }
  const messageId = body.messageId;

  try {
    const message = await getMessageForUpload(slug, messageId);
    if (!message || !message.mediaKind) return NextResponse.json({ error: "Post not found." }, { status: 404 });
    if (message.mediaStatus === "Ready") return NextResponse.json({ status: "Ready" });

    const submission = message.mediaSubmissionId ? await getSubmission(message.mediaSubmissionId) : null;
    const folderId = folderIdFromUrl(submission?.fields["Drive Folder"]);
    const file = !body.failed && folderId ? await findFileInFolder(folderId, message.driveFileName) : null;

    if (!file) {
      await updateMessage(slug, messageId, { "Media Status": "Failed" });
      if (submission) await updateSubmission(submission.id, { "Upload Status": "Partial", "Photo Count": 0, "Video Count": 0 });
      return NextResponse.json({ status: "Failed" });
    }

    await updateMessage(slug, messageId, { "Drive File Id": file.id, "Media Status": "Ready" });
    if (submission) {
      const isPhoto = message.mediaKind === "Photo";
      const link = `${file.name} (${Math.max(1, Math.round(Number(file.size || 0) / 1024 / 1024))} MB): https://drive.google.com/file/d/${file.id}/view`;
      await updateSubmission(submission.id, {
        "Upload Status": "Complete",
        "Photo Count": isPhoto ? 1 : 0,
        "Video Count": isPhoto ? 0 : 1,
        [isPhoto ? "Photo Links" : "Video Links"]: link,
        Approved: isPhoto && message.channel === "Chat" && !message.hidden,
      });
    }
    return NextResponse.json({ status: "Ready" });
  } catch (err) {
    console.error("tailgate media complete failed", err);
    return NextResponse.json({ error: "Couldn't finish that post." }, { status: 502 });
  }
}
