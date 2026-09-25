import { NextRequest, NextResponse } from "next/server";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { getDriveFileInfo } from "@/lib/googleDrive";
import { DOWNLOAD_LIMIT_BYTES } from "@/lib/mediaKinds";
import { signedMediaUrl } from "@/lib/mediaLink";
import { findMediaByFileId } from "@/lib/mediaLibrary";
import { addAssetFromUrl, getPost, getWeekPosts, saveText, setApproved, type SocialPost } from "@/lib/garageSocial";
import { isAutoPlatform } from "@/lib/socialCopy";
import { todayNY, weekOf } from "@/lib/garageTasks";

export const maxDuration = 30;

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayOf = (iso: string) => DAY[new Date(`${iso}T12:00:00Z`).getUTCDay()];

/** Every open clip card that shares this one's day and topic: the same clip
 *  going to TikTok, YouTube and Instagram is one slot, not three. */
function siblings(all: SocialPost[], card: SocialPost): SocialPost[] {
  return all.filter((p) => p.status === "Planned" && p.asset === "Vertical clip" && p.due === card.due && p.topic === card.topic);
}

/**
 * Garage → Library → Add to a posting card (Jose, 2026-09-24). Puts a library
 * clip on the posting cards so the auto-poster can post it, without anyone
 * dragging files around in Airtable. Owners only, like the posting board.
 *
 * ONE CLIP, EVERY PLATFORM (Jose, 2026-09-25, "option c"): a slot is picked
 * once and the clip lands on every card in it: TikTok, YouTube, Instagram,
 * whatever the day has. Wednesday 9/23's Instagram trail clip never went out
 * because the clip was posted by hand to TikTok and YouTube and nobody put it
 * on the Instagram card. Now there's no separate card to forget.
 *
 * GET  → the open clip slots this week and next, one entry per slot.
 * POST → { fileId, cardId, caption?, approve? }: attaches the clip (signed
 *        15-minute link) to every card in the slot, fills the caption on any
 *        card that has none, and, if asked, approves the auto-post cards.
 */
export async function GET() {
  const session = await getSession();
  if (!session || !canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });
  const today = todayNY();
  const monday = weekOf(today);
  const weeks = await Promise.all([getWeekPosts(monday), getWeekPosts(addDays(monday, 7))]);
  const open = weeks.flat().filter((p) => p.status === "Planned" && p.asset === "Vertical clip" && p.due >= today);
  const slots = new Map<string, SocialPost[]>();
  for (const p of open) slots.set(`${p.due}|${p.topic}`, [...(slots.get(`${p.due}|${p.topic}`) || []), p]);
  const cards = [...slots.values()].map((group) => ({
    id: group[0].id,
    name: `${dayOf(group[0].due)} · ${group[0].topic}${group[0].topic.endsWith("clip") ? "" : " clip"}`,
    due: group[0].due,
    platform: group.map((p) => p.platform).join(", "),
    clips: Math.max(...group.map((p) => p.assets.length)),
    needsCaption: group.some((p) => isAutoPlatform(p.platform) && !p.caption.trim()),
  }));
  return NextResponse.json({ cards });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { fileId?: string; cardId?: string; caption?: string; approve?: boolean };
  const [row, card] = await Promise.all([
    findMediaByFileId(String(body.fileId || "")).catch(() => null),
    getPost(String(body.cardId || "")),
  ]);
  if (!row) return NextResponse.json({ error: "That clip isn't in the library." }, { status: 404 });
  if (!card || card.status !== "Planned") return NextResponse.json({ error: "That card isn't open any more." }, { status: 409 });
  const info = await getDriveFileInfo(row.fileId);
  if (!info) return NextResponse.json({ error: "That file isn't in Drive any more." }, { status: 404 });
  if (info.size > DOWNLOAD_LIMIT_BYTES) return NextResponse.json({ error: "Too big to attach (over 200 MB)." }, { status: 413 });

  const group = siblings(await getWeekPosts(weekOf(card.due)), card);
  const cards = group.length ? group : [card];
  const caption = String(body.caption || "").trim().slice(0, 2200);
  const by = session.name || session.email;
  try {
    const approved: string[] = [];
    const noCaption: string[] = [];
    for (const p of cards) {
      await addAssetFromUrl(p.id, { url: signedMediaUrl(row.fileId), filename: info.name || row.fileName });
      const hasCaption = Boolean(p.caption.trim() || caption);
      if (!p.caption.trim() && caption) await saveText(p.id, { caption });
      if (!isAutoPlatform(p.platform)) continue;
      if (!hasCaption) noCaption.push(p.platform);
      // Approving is the person's call, made here by ticking the box. The
      // auto-poster still checks the card at post time and fails loudly.
      else if (body.approve && !p.approved) {
        await setApproved(p.id, true, by);
        approved.push(p.platform);
      }
    }
    return NextResponse.json({
      status: "ok",
      card: `${dayOf(card.due)} · ${card.topic}`,
      platforms: cards.map((p) => p.platform),
      approved,
      noCaption,
    });
  } catch (err) {
    console.error("library attach failed", err);
    return NextResponse.json({ error: "Couldn't attach it. Try again." }, { status: 502 });
  }
}
