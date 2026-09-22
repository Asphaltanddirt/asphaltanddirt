import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getPost } from "@/lib/garageSocial";
import { verifyMediaUrl } from "@/lib/socialMedia";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Serves one posting-board asset to Meta while the auto-poster publishes it.
 * Only signed, unexpired links work (see lib/socialMedia.ts). `f=jpeg`
 * re-encodes the image as JPEG, the only still format Instagram accepts;
 * `f=ig` also fits it to Instagram's aspect-ratio limits.
 */
export async function GET(req: NextRequest) {
  const link = verifyMediaUrl(req.nextUrl.searchParams);
  if (!link) return NextResponse.json({ error: "Link expired or invalid." }, { status: 403 });

  const post = await getPost(link.id);
  const asset = post?.assets[link.index];
  if (!asset) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const upstream = await fetch(asset.url, { cache: "no-store" });
  if (!upstream.ok) return NextResponse.json({ error: "Couldn't load the file." }, { status: 502 });

  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };
  if (link.format !== "raw" && asset.type.startsWith("image/")) {
    let image = sharp(Buffer.from(await upstream.arrayBuffer())).flatten({ background: "#000000" });
    if (link.format === "ig") {
      // Instagram takes 4:5 (tallest) to 1.91:1 (widest), 320–1440 px wide.
      // Our TikTok slides are 9:16, so they're letterboxed onto the brand's
      // black rather than cropped, which would cut off the headline.
      const { width = 1080, height = 1350 } = await image.metadata();
      const ratio = width / height;
      const target = ratio < 0.8 ? 0.8 : ratio > 1.91 ? 1.91 : ratio;
      const outW = 1080;
      const outH = Math.round(outW / target);
      image = sharp(await image.toBuffer()).resize(outW, outH, { fit: "contain", background: "#000000" });
    }
    const jpeg = await image.jpeg({ quality: 92, mozjpeg: true }).toBuffer();
    return new NextResponse(new Uint8Array(jpeg), { headers: { ...headers, "Content-Type": "image/jpeg" } });
  }
  return new NextResponse(upstream.body, {
    headers: {
      ...headers,
      "Content-Type": asset.type || upstream.headers.get("content-type") || "application/octet-stream",
      ...(upstream.headers.get("content-length") ? { "Content-Length": upstream.headers.get("content-length")! } : {}),
    },
  });
}
