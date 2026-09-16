import { NextRequest, NextResponse } from "next/server";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { addAsset, getPost } from "@/lib/garageSocial";

export const maxDuration = 60;

// Vercel caps a request body at about 4.5 MB, so this is for images.
// Video clips are posted straight from the phone, not stored on the board.
const MAX_BYTES = 4 * 1024 * 1024;

/** Adds one image to a post's Assets. Owners only. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const post = await getPost(String(form?.get("id") || ""));
  if (!post || !(file instanceof File)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Images only." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That image is over 4 MB." }, { status: 400 });

  try {
    await addAsset(post.id, {
      filename: file.name,
      contentType: file.type,
      base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
    });
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("garage social upload failed", err);
    return NextResponse.json({ error: "Upload failed. Try again." }, { status: 502 });
  }
}
