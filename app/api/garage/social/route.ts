import { NextRequest, NextResponse } from "next/server";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { generateSocialWeek, getPost, markPosted, saveStats, saveText, setStatus } from "@/lib/garageSocial";

/** Posting board actions. Owners only. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    if (body.action === "generate") {
      const week = typeof body.week === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.week) ? body.week : undefined;
      const made = await generateSocialWeek(week);
      return NextResponse.json({ status: "ok", created: made.length });
    }

    const post = await getPost(String(body.id || ""));
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

    switch (body.action) {
      case "posted": {
        const url = String(body.url || "").trim();
        if (url && !/^https?:\/\//i.test(url)) return NextResponse.json({ error: "That link doesn't look right." }, { status: 400 });
        await markPosted(post, { url, by: session.name || session.email, draftIndex: Number(body.draftIndex) || 0 });
        break;
      }
      case "skip":
        await setStatus(post.id, "Skipped");
        break;
      case "undo":
        await setStatus(post.id, "Planned");
        break;
      case "stats": {
        const clean = (v: unknown) => (v === "" || v === null || v === undefined ? null : Number.isFinite(Number(v)) ? Number(v) : null);
        await saveStats(post.id, {
          views: clean(body.stats?.views),
          forYou: clean(body.stats?.forYou),
          shares: clean(body.stats?.shares),
          saves: clean(body.stats?.saves),
          follows: clean(body.stats?.follows),
        });
        break;
      }
      case "text":
        await saveText(post.id, {
          caption: typeof body.caption === "string" ? body.caption : undefined,
          drafts: typeof body.drafts === "string" ? body.drafts : undefined,
          blogUrl: typeof body.blogUrl === "string" ? body.blogUrl : undefined,
        });
        break;
      default:
        return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("garage social action failed", err);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 502 });
  }
}
