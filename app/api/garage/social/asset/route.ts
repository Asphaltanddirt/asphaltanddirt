import { NextRequest, NextResponse } from "next/server";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { getPost } from "@/lib/garageSocial";

export const dynamic = "force-dynamic";

/**
 * Streams one of a post's asset files from our own origin, so the phone's
 * share sheet ("Save to Photos") can take it. Airtable's attachment URLs are
 * on another domain, which the browser won't hand to navigator.share.
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
  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": asset.type || upstream.headers.get("content-type") || "application/octet-stream",
      "Content-Disposition": `inline; filename="${asset.filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
