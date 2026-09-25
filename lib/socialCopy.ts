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

/** Caption as it's pasted: the caption, the blog link when it belongs in the
 *  caption (Facebook Page), then hashtags on their own line. */
export function fullCaption(
  post: Pick<SocialPost, "caption" | "hashtags" | "platform" | "blogUrl" | "firstComment" | "linkPlacement" | "asset"> & { takeUrl?: string },
): string {
  const link = linkPlan(post);
  return [post.caption.trim(), link.kind === "caption" ? link.text : "", post.hashtags].filter(Boolean).join("\n\n");
}

/** Platforms the auto-poster handles. TikTok is scheduled in TikTok Studio, Meta
 *  has no API for posting to Groups, and YouTube is the podcast's own pipeline. */
export const AUTO_PLATFORMS = ["X", "Facebook Page", "Instagram", "Threads"] as const;
export type AutoPlatform = (typeof AUTO_PLATFORMS)[number];

export function isAutoPlatform(platform: string): platform is AutoPlatform {
  return (AUTO_PLATFORMS as readonly string[]).includes(platform);
}

/** Length as X counts it: every link is 23 characters, however long. */
export function xLength(text: string): number {
  return text.replace(/https?:\/\/\S+/g, "x".repeat(23)).length;
}
