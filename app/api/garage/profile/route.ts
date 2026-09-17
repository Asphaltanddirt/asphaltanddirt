import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/garageAuth";
import { getCrewProfile, saveCrewProfile } from "@/lib/garageCrew";
import { SOCIAL_PLATFORMS, dedupeSocials, socialUrl, type SocialPlatformName } from "@/lib/socialLinks";

/** Saves the signed-in crew member's own public profile. The record is found
 *  from their session email, so nobody can edit anyone else's. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const profile = await getCrewProfile(session.email);
  if (!profile) return NextResponse.json({ error: "No crew record for your account." }, { status: 404 });

  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const socials = dedupeSocials(
    (Array.isArray(body.socials) ? body.socials : []).slice(0, 20).map((raw) => {
      const item = (raw || {}) as { platform?: unknown; url?: unknown };
      const platform = (SOCIAL_PLATFORMS as readonly string[]).includes(text(item.platform))
        ? (text(item.platform) as SocialPlatformName)
        : "Other";
      return { platform, url: socialUrl(platform, text(item.url).slice(0, 500)) };
    }).filter((l) => l.url),
  );

  try {
    await saveCrewProfile(profile.id, {
      tagline: text(body.tagline),
      bio: text(body.bio),
      vehicle: text(body.vehicle),
      socials,
    });
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("garage profile save failed", err);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 502 });
  }
}
