import { NextRequest, NextResponse } from "next/server";
import { getUploadOffset } from "@/lib/googleDrive";
import { verifyMediaPost } from "@/lib/tailgateMedia";

/** Where to resume a Tailgate upload whose chunk was interrupted. */
export async function POST(req: NextRequest) {
  let body: { messageId?: string; token?: string; uploadUrl?: string; size?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!verifyMediaPost(body.messageId, body.token)) {
    return NextResponse.json({ error: "Invalid post." }, { status: 403 });
  }
  const size = Number(body.size);
  if (typeof body.uploadUrl !== "string" || !Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    return NextResponse.json(await getUploadOffset(body.uploadUrl, size));
  } catch (err) {
    console.error("tailgate media status failed", err);
    return NextResponse.json({ error: "Couldn't check the upload." }, { status: 502 });
  }
}
