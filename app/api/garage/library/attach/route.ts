import { NextRequest, NextResponse } from "next/server";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { getDriveFileInfo } from "@/lib/googleDrive";
import { DOWNLOAD_LIMIT_BYTES } from "@/lib/mediaKinds";
import { signedMediaUrl } from "@/lib/mediaLink";
import { findMediaByFileId } from "@/lib/mediaLibrary";
import { addAssetFromUrl, getPost, getWeekPosts } from "@/lib/garageSocial";
import { todayNY, weekOf } from "@/lib/garageTasks";

export const maxDuration = 30;

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * Garage → Library → Add to a posting card (Jose, 2026-09-24). Puts a library
 * clip on a posting card so the auto-poster can post it, without anyone
 * dragging files around in Airtable. Owners only, like the posting board.
 *
 * GET  → the open vertical-clip cards this week and next.
 * POST → { fileId, cardId }: attaches the clip by a signed 15-minute link.
 */
export async function GET() {
  const session = await getSession();
  if (!session || !canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });
  const today = todayNY();
  const monday = weekOf(today);
  const weeks = await Promise.all([getWeekPosts(monday), getWeekPosts(addDays(monday, 7))]);
  const cards = weeks
    .flat()
    .filter((p) => p.status === "Planned" && p.asset === "Vertical clip" && p.due >= today)
    .map((p) => ({ id: p.id, name: p.name, due: p.due, platform: p.platform, clips: p.assets.length }));
  return NextResponse.json({ cards });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { fileId?: string; cardId?: string };
  const [row, card] = await Promise.all([
    findMediaByFileId(String(body.fileId || "")).catch(() => null),
    getPost(String(body.cardId || "")),
  ]);
  if (!row) return NextResponse.json({ error: "That clip isn't in the library." }, { status: 404 });
  if (!card || card.status !== "Planned") return NextResponse.json({ error: "That card isn't open any more." }, { status: 409 });
  const info = await getDriveFileInfo(row.fileId);
  if (!info) return NextResponse.json({ error: "That file isn't in Drive any more." }, { status: 404 });
  if (info.size > DOWNLOAD_LIMIT_BYTES) return NextResponse.json({ error: "Too big to attach (over 200 MB)." }, { status: 413 });
  try {
    await addAssetFromUrl(card.id, { url: signedMediaUrl(row.fileId), filename: info.name || row.fileName });
    return NextResponse.json({ status: "ok", card: card.name });
  } catch (err) {
    console.error("library attach failed", err);
    return NextResponse.json({ error: "Couldn't attach it. Try again." }, { status: 502 });
  }
}
