import { NextRequest, NextResponse } from "next/server";
import { uploadAttachment } from "@/lib/airtable";
import { MAX_PREVIEW_BYTES, MEDIA_BASE_ID } from "@/lib/eventMedia";
import { getMessageForUpload } from "@/lib/eventComms";
import { verifyMediaPost } from "@/lib/tailgateMedia";

/** The small copy the feed shows: a browser-compressed photo, or a still
 *  frame for a video. Photos also go onto the gallery row, which is what the
 *  public event gallery displays. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid preview." }, { status: 400 });
  }
  const messageId = form.get("messageId");
  if (!verifyMediaPost(messageId, form.get("token"))) {
    return NextResponse.json({ error: "Invalid post." }, { status: 403 });
  }
  const image = form.get("image");
  if (!(image instanceof File) || image.size === 0 || image.size > MAX_PREVIEW_BYTES || !image.type.startsWith("image/")) {
    return NextResponse.json({ error: "Invalid preview." }, { status: 400 });
  }

  try {
    const message = await getMessageForUpload(slug, messageId);
    if (!message || !message.mediaKind) return NextResponse.json({ error: "Post not found." }, { status: 404 });
    const file = {
      filename: image.name || "preview.jpg",
      contentType: image.type,
      base64: Buffer.from(await image.arrayBuffer()).toString("base64"),
    };
    await uploadAttachment(messageId, "Photo", file, { baseId: process.env.AIRTABLE_EVENT_COMMS_BASE_ID });
    if (message.mediaKind === "Photo" && message.mediaSubmissionId) {
      await uploadAttachment(message.mediaSubmissionId, "Photo", file, { baseId: MEDIA_BASE_ID });
    }
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("tailgate media preview failed", err);
    return NextResponse.json({ error: "Preview upload failed." }, { status: 502 });
  }
}
