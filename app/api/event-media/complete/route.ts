import { NextRequest, NextResponse } from "next/server";
import { listSubmissionFiles } from "@/lib/googleDrive";
import { sendEmail } from "@/lib/resendEmail";
import {
  escapeHtml,
  folderIdFromUrl,
  getSubmission,
  updateSubmission,
  verifySubmission,
} from "@/lib/eventMedia";

const TO_EMAIL = process.env.REVIEW_SUBMISSIONS_TO_EMAIL || "team@asphaltanddirt.com";
const FROM_EMAIL = process.env.REVIEW_SUBMISSIONS_FROM_EMAIL || "Asphalt & Dirt <notifications@asphaltanddirt.com>";

/**
 * Closes out a submission. Counts what actually landed in its Drive folder —
 * never trusting the browser's own tally — marks the row Complete or Partial,
 * and emails the team once.
 */
export async function POST(req: NextRequest) {
  let body: { submissionId?: string; token?: string; expected?: number; eventTitle?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!verifySubmission(body.submissionId, body.token)) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 403 });
  }
  const submissionId = body.submissionId;

  try {
    const record = await getSubmission(submissionId);
    if (!record) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    const folderId = folderIdFromUrl(record.fields["Drive Folder"]);
    if (!folderId) return NextResponse.json({ error: "Submission has no folder." }, { status: 500 });

    const files = await listSubmissionFiles(folderId);
    const photos = files.filter((f) => f.mimeType.startsWith("image/")).length;
    const videos = files.filter((f) => f.mimeType.startsWith("video/")).length;
    const expected = Number(body.expected) || 0;
    const status = photos + videos >= expected && expected > 0 ? "Complete" : "Partial";
    const alreadyClosed = record.fields["Upload Status"] === "Complete" || record.fields["Upload Status"] === "Partial";

    await updateSubmission(submissionId, { "Photo Count": photos, "Video Count": videos, "Upload Status": status });

    if (!alreadyClosed) {
      const name = (record.fields.Name as string) || "Someone";
      const email = (record.fields.Email as string) || "";
      const folderLink = record.fields["Drive Folder"] as string;
      const eventTitle = (body.eventTitle || "").slice(0, 200);
      try {
        await sendEmail({
          from: FROM_EMAIL,
          to: TO_EMAIL,
          replyTo: email || undefined,
          subject: `Event media from ${name}: ${photos} photo${photos === 1 ? "" : "s"}, ${videos} video${videos === 1 ? "" : "s"}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;color:#111;">
              <h2 style="margin-bottom:4px;">New event media: ${escapeHtml(name)}</h2>
              <p style="color:#555;margin-top:0;">For ${escapeHtml(eventTitle || "an event")} &mdash; ${status === "Complete" ? "everything arrived" : `<strong>partial</strong>: ${photos + videos} of ${expected} files arrived`}</p>
              <p><strong>${photos}</strong> photo${photos === 1 ? "" : "s"} &middot; <strong>${videos}</strong> video${videos === 1 ? "" : "s"}</p>
              <p><a href="${escapeHtml(folderLink)}">Open the Drive folder</a> to review the originals. Photo previews are on the Airtable row &mdash; tick Approved to show them in the event gallery.</p>
              ${email ? `<p style="color:#555;">Reply to reach ${escapeHtml(email)}.</p>` : ""}
            </div>`,
        });
      } catch (err) {
        console.error("event-media notify email failed", err);
      }
    }

    return NextResponse.json({ status, photos, videos });
  } catch (err) {
    console.error("event-media complete failed", err);
    return NextResponse.json({ error: "Couldn't finish the upload." }, { status: 502 });
  }
}
