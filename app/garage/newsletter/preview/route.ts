import { NextResponse } from "next/server";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { NoDraftIssueError, renderDraftPreview } from "@/lib/weeklyDigestSend";

export const dynamic = "force-dynamic";

/** The newest Draft issue exactly as it will land in an inbox. Owners only. */
export async function GET() {
  const session = await getSession();
  if (!session || !canSeeOwnerOnly(session)) return new NextResponse("Sign in to the Garage as an owner.", { status: 401 });
  try {
    const { html } = await renderDraftPreview();
    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" } });
  } catch (err) {
    if (err instanceof NoDraftIssueError) return new NextResponse(err.message, { status: 404 });
    console.error("garage newsletter preview failed", err);
    return new NextResponse("Couldn't build the preview. Try again.", { status: 502 });
  }
}
