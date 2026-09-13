import { NextRequest, NextResponse } from "next/server";
import { uploadAttachment } from "@/lib/airtable";
import { MAX_PREVIEW_BYTES, MEDIA_BASE_ID, verifySubmission } from "@/lib/eventMedia";

/** A small, browser-compressed copy of one submitted photo, attached to the
 *  Airtable row so staff can review it there and approved photos show in the
 *  event gallery exactly as before. The full-size original is in Drive. */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid preview." }, { status: 400 });
  }

  const submissionId = form.get("submissionId");
  if (!verifySubmission(submissionId, form.get("token"))) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 403 });
  }

  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size === 0 || photo.size > MAX_PREVIEW_BYTES || !photo.type.startsWith("image/")) {
    return NextResponse.json({ error: "Invalid preview." }, { status: 400 });
  }

  try {
    await uploadAttachment(
      submissionId,
      "Photo",
      {
        filename: photo.name || "photo.jpg",
        contentType: photo.type,
        base64: Buffer.from(await photo.arrayBuffer()).toString("base64"),
      },
      { baseId: MEDIA_BASE_ID },
    );
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("event-media preview failed", err);
    return NextResponse.json({ error: "Preview upload failed." }, { status: 502 });
  }
}
