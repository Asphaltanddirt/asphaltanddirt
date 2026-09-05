import type { ReactNode } from "react";

export type SocialPlatform = "instagram" | "facebook" | "x" | "tiktok" | "youtube" | "website" | "other";

/** Maps a free-text platform label (as typed into the Guest Intake form,
 *  or stored in Airtable) to one of our known icon buckets. Anything
 *  unrecognized falls back to a generic link icon rather than guessing. */
export function normalizePlatform(label: string): SocialPlatform {
  const l = label.trim().toLowerCase();
  if (l.includes("insta")) return "instagram";
  if (l.includes("tiktok")) return "tiktok";
  if (l.includes("facebook")) return "facebook";
  if (l === "x" || l.includes("twitter")) return "x";
  if (l.includes("youtube")) return "youtube";
  if (l.includes("site") || l.includes("web")) return "website";
  return "other";
}

export const SOCIAL_ICON_PATHS: Record<SocialPlatform, ReactNode> = {
  instagram: <><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" /></>,
  facebook: <path d="M14 8.5h2.5V5H14c-2 0-3.5 1.5-3.5 3.5V11H8v3.5h2.5V21h3.5v-6.5h2.5l.5-3.5h-3V9c0-.5.3-.5.5-.5z" />,
  x: <path d="M4 4l16 16M20 4 4 20" />,
  tiktok: <><path d="M14.5 3v11.3a3.7 3.7 0 1 1-3.7-3.7c.35 0 .7.04 1 .13" /><path d="M14.5 3a5 5 0 0 0 5 5" /></>,
  youtube: <><rect x="2.5" y="6" width="19" height="12" rx="4" /><path d="M10.3 9.3v5.4l5-2.7z" fill="currentColor" stroke="none" /></>,
  website: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
  other: <><path d="M9 15 15 9" /><path d="M11 6.5 12.3 5.2a3.5 3.5 0 1 1 5 5L16 11.5" /><path d="M13 17.5 11.7 18.8a3.5 3.5 0 1 1-5-5L8 12.5" /></>,
};

export function SocialIcon({ platform }: { platform: string }) {
  const key = normalizePlatform(platform);
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {SOCIAL_ICON_PATHS[key]}
    </svg>
  );
}
