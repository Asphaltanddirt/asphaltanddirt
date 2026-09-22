import { NextRequest, NextResponse } from "next/server";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import sharp from "sharp";
import { getPost } from "@/lib/garageSocial";

export const dynamic = "force-dynamic";

/**
 * Streams one of a post's asset files from our own origin, so the phone's
 * share sheet ("Save to Photos") can take it. Airtable's attachment URLs are
 * on another domain, which the browser won't hand to navigator.share.
 * Images are handed over as JPEG: TikTok photo posts reject PNG, and every
 * other platform takes JPEG too.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id") || "";
  const index = Number(req.nextUrl.searchParams.get("i") || "0");
  const post = await getPost(id);
  const asset = post?.assets[index];
  if (!asset) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const upstream = await fetch(asset.url, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) return NextResponse.json({ error: "Couldn't load the file." }, { status: 502 });
  if (asset.type.startsWith("image/") && asset.type !== "image/jpeg") {
    const jpeg = await sharp(Buffer.from(await upstream.arrayBuffer())).flatten({ background: "#000000" }).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
    const name = asset.filename.replace(/\.[a-z0-9]+$/i, "") + ".jpg";
    return new NextResponse(new Uint8Array(jpeg), {
      headers: { "Content-Type": "image/jpeg", "Content-Disposition": `inline; filename="${name.replace(/"/g, "")}"`, "Cache-Control": "private, no-store" },
    });
  }
  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": asset.type || upstream.headers.get("content-type") || "application/octet-stream",
      "Content-Disposition": `inline; filename="${asset.filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
