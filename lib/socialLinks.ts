/**
 * An ambassador's social links, on any platform. One list, stored on the
 * Ambassador record's "Social Links" field as "Platform: url" lines, carried
 * from the application through the agreement to the Garage profile and the
 * /team page. (Jose, 2026-09-17: every social they give us carries through,
 * not just Instagram/TikTok.) Safe to import on the client.
 */

export const SOCIAL_PLATFORMS = ["Instagram", "TikTok", "YouTube", "Facebook", "X", "Website", "Other"] as const;
export type SocialPlatformName = (typeof SOCIAL_PLATFORMS)[number];

export interface SocialLink {
  platform: SocialPlatformName;
  url: string;
}

function platformFromLabel(label: string): SocialPlatformName | null {
  const l = label.trim().toLowerCase();
  if (!l) return null;
  if (l.includes("insta")) return "Instagram";
  if (l.includes("tiktok") || l.includes("tik tok")) return "TikTok";
  if (l.includes("youtube") || l.includes("you tube")) return "YouTube";
  if (l.includes("facebook")) return "Facebook";
  if (l === "x" || l.includes("twitter")) return "X";
  if (l.includes("site") || l.includes("web")) return "Website";
  if (l === "other") return "Other";
  return null;
}

function platformFromUrl(url: string): SocialPlatformName {
  if (/instagram\.com/i.test(url)) return "Instagram";
  if (/tiktok\.com/i.test(url)) return "TikTok";
  if (/youtube\.com|youtu\.be/i.test(url)) return "YouTube";
  if (/facebook\.com|fb\.com/i.test(url)) return "Facebook";
  if (/(^|\/\/|\.)(x|twitter)\.com/i.test(url)) return "X";
  return "Website";
}

/** A handle or link -> a full URL for that platform ("" if empty). */
export function socialUrl(platform: SocialPlatformName, value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (/^(www\.)?[a-z0-9-]+\.[a-z]{2,}(\/|$)/i.test(v)) return `https://${v}`;
  const handle = v.replace(/^@/, "").replace(/\s+/g, "");
  if (!handle) return "";
  switch (platform) {
    case "Instagram":
      return `https://instagram.com/${handle}`;
    case "TikTok":
      return `https://www.tiktok.com/@${handle}`;
    case "YouTube":
      return `https://www.youtube.com/@${handle}`;
    case "Facebook":
      return `https://www.facebook.com/${handle}`;
    case "X":
      return `https://x.com/${handle}`;
    default:
      // Website / Other without a domain: keep what they typed so nothing is
      // lost. Pages only turn http(s) links into buttons.
      return v;
  }
}

/** Reads "Platform: handle-or-url" lines and bare URLs, in any mix. */
export function parseSocialLines(text: string | null | undefined): SocialLink[] {
  const out: SocialLink[] = [];
  for (const raw of (text || "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const colon = line.match(/^([A-Za-z][A-Za-z ]{0,20}):\s*(.+)$/);
    const labelled = colon && !/^https?$/i.test(colon[1]) ? colon : null;
    let platform: SocialPlatformName | null = labelled ? platformFromLabel(labelled[1]) : null;
    const value = labelled ? labelled[2] : line;
    const url = /^https?:\/\//i.test(value.trim()) ? value.trim() : null;
    if (!platform) platform = url ? platformFromUrl(url) : "Other";
    const full = socialUrl(platform, value);
    if (full) out.push({ platform, url: full });
  }
  return dedupeSocials(out);
}

export function dedupeSocials(links: SocialLink[]): SocialLink[] {
  const seen = new Set<string>();
  return links.filter((l) => {
    const key = l.url.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function formatSocialLines(links: SocialLink[]): string {
  return dedupeSocials(links)
    .map((l) => `${l.platform}: ${l.url}`)
    .join("\n");
}

/** The first link for a platform, for the older single-platform URL fields. */
export function firstSocial(links: SocialLink[], platform: SocialPlatformName): string {
  return links.find((l) => l.platform === platform)?.url || "";
}

/** An Ambassador record's links: the Social Links list plus the per-platform
 *  URL fields (older records, or a URL typed straight into Airtable). */
export function ambassadorSocials(fields: Record<string, unknown>): SocialLink[] {
  const text = (key: string) => (typeof fields[key] === "string" ? (fields[key] as string).trim() : "");
  return parseSocialLines(
    [text("Instagram URL"), text("TikTok URL"), text("YouTube URL"), text("Social Links")].join("\n"),
  );
}
