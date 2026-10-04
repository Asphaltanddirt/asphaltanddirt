import type { SocialPost } from "@/lib/garageSocial";

/* What a posting-board card copies. Kept apart from lib/garageSocial.ts
 * (which talks to Airtable) so the client card can import it. */

/** Where the blog link goes for a post, and the text to paste there, so a
 *  card holds everything and only the live post link is left to add.
 *  Facebook Page: end of the caption (Jose 2026-09-22 — the app can't get the
 *  permission to post a first comment). Facebook Group: first comment.
 *  X: reply. Instagram: link in bio. Others: none. */
export function linkPlan(
  post: Pick<SocialPost, "platform" | "blogUrl" | "firstComment" | "linkPlacement" | "asset"> & { takeUrl?: string },
): {
  kind: "caption" | "comment" | "reply" | "bio" | "none";
  text: string;
} {
  // A vertical clip cut from a Garage Take links back to that Take's page (Jose
  // 2026-09-25: "link them back to garage talks"). The page carries the full
  // video and the blog link, so the blog isn't lost.
  const fromTake = post.asset === "Vertical clip" && post.takeUrl ? post.takeUrl : "";
  const text = post.firstComment || (fromTake ? `Anthony's full take: ${fromTake}` : post.blogUrl ? `Full breakdown on the blog: ${post.blogUrl}` : "");
  if (post.platform === "Facebook Page") return { kind: text ? "caption" : "none", text };
  if (post.platform.startsWith("Facebook")) return { kind: text ? "comment" : "none", text };
  // X: only the blog-image posts carry the link (a $0.20 post). The Trail Talk
  // and Sunday questions and the clips stand alone, with no link.
  if (post.platform === "X" && post.asset !== "X image") return { kind: "none", text: "" };
  // X link test: some weeks the link rides in the post itself.
  if (post.platform === "X") return { kind: text ? (post.linkPlacement === "In post" ? "caption" : "reply") : "none", text };
  if (post.platform === "Instagram") return { kind: fromTake || post.blogUrl ? "bio" : "none", text: fromTake || post.blogUrl };
  // Threads (approved 9/22): no evidence links cost reach, so the blog link goes
  // in the post itself — but only on the blog-image posts, like X.
  // A Garage Take clip is the exception: it links back to its Take.
  if (post.platform === "Threads") {
    if (fromTake) return { kind: "caption", text };
    return post.asset === "Text post" || post.asset === "Vertical clip" || !text ? { kind: "none", text: "" } : { kind: "caption", text };
  }
  return { kind: "none", text: "" };
}

/** Fallback subject tags for a card whose Hashtags field is blank. Every post
 *  gets 5 on every platform (Jose 9/30); hand-made and event-promo cards were
 *  going out with none. Subject tags, never the brand alone. */
const DEFAULT_TAGS = {
  Asphalt: "#CarCulture #CarCommunity #TrackDay #Motorsport #CarMeet",
  Dirt: "#Offroad #4x4 #TrailRiding #Overlanding #4WD",
  Both: "#CarCulture #Offroad #4x4 #CarCommunity #Overlanding",
} as const;

/** The card's own hashtags, or its side's 5 defaults when it has none (and has
 *  a caption to hang them on). YouTube is left alone: exactly 3, by hand. */
export function hashtagsFor(post: Pick<SocialPost, "caption" | "hashtags" | "platform" | "topic" | "weekOf">): {
  tags: string;
  isDefault: boolean;
} {
  if (post.hashtags.trim() || !post.caption.trim() || post.platform.startsWith("YouTube")) return { tags: post.hashtags.trim(), isDefault: false };
  const side = topicLabel(post.topic, post.weekOf);
  const key = side === "Asphalt" ? "Asphalt" : side === "Dirt" || post.topic === "Trail clip" ? "Dirt" : "Both";
  return { tags: DEFAULT_TAGS[key], isDefault: true };
}

/** Caption as it's pasted: the caption, the blog link when it belongs in the
 *  caption (Facebook Page), then hashtags on their own line. */
export function fullCaption(
  post: Pick<SocialPost, "caption" | "hashtags" | "platform" | "blogUrl" | "firstComment" | "linkPlacement" | "asset" | "topic" | "weekOf"> & {
    takeUrl?: string;
  },
): string {
  const link = linkPlan(post);
  return [post.caption.trim(), link.kind === "caption" ? link.text : "", hashtagsFor(post).tags].filter(Boolean).join("\n\n");
}

/** Platforms the auto-poster handles. TikTok is scheduled in TikTok Studio, Meta
 *  has no API for posting to Groups, and YouTube is the podcast's own pipeline. */
export const AUTO_PLATFORMS = ["X", "Facebook Page", "Instagram", "Threads"] as const;
export type AutoPlatform = (typeof AUTO_PLATFORMS)[number];

export function isAutoPlatform(platform: string): platform is AutoPlatform {
  return (AUTO_PLATFORMS as readonly string[]).includes(platform);
}

/** Platforms with Stories. Every post on these gets shared to Story (Jose
 *  10/3: Stories let people discover us without committing to the page).
 *  X, Threads and Groups have none; YouTube retired Stories in 2023. The
 *  Facebook Page shares its own Reels to Story (Page setting, seen 10/4), so
 *  it's left out: no alert for something that already happened. */
export const STORY_PLATFORMS = ["Instagram", "TikTok"] as const;

/** Whether a post on this platform has a link anyone can copy. The Facebook
 *  Group is private, so its posts give none (Jose 10/4); a scheduled Group
 *  card closes itself at its slot without one. */
export function hasPostLink(platform: string): boolean {
  return platform !== "Facebook Group";
}

export function hasStories(platform: string): boolean {
  return (STORY_PLATFORMS as readonly string[]).includes(platform);
}

/** Length as X counts it: every link is 23 characters, however long. */
export function xLength(text: string): number {
  return text.replace(/https?:\/\/\S+/g, "x".repeat(23)).length;
}

/** The Feature alternates sides weekly (Jose 9/22): the week of 9/14 led with
 *  asphalt, 9/21 dirt, 9/28 asphalt… So a Feature or Alternate card's badge
 *  shows its side instead (Jose 9/26); other topics keep their own name. */
export function topicLabel(topic: string, weekOf: string): string {
  if ((topic !== "Feature" && topic !== "Alternate") || !weekOf) return topic;
  const weeks = Math.round((Date.parse(`${weekOf}T12:00:00Z`) - Date.parse("2026-09-14T12:00:00Z")) / (7 * 86400000));
  const featureIsAsphalt = weeks % 2 === 0;
  return (topic === "Feature") === featureIsAsphalt ? "Asphalt" : "Dirt";
}
