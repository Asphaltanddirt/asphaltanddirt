import type { SocialPost } from "@/lib/garageSocial";

/* What a posting-board card copies. Kept apart from lib/garageSocial.ts
 * (which talks to Airtable) so the client card can import it. */

/** Where the blog link goes for a post, and the text to paste there, so a
 *  card holds everything and only the live post link is left to add.
 *  Facebook: first comment. X: reply. Instagram: link in bio. Others: none. */
export function linkPlan(post: Pick<SocialPost, "platform" | "blogUrl" | "firstComment">): {
  kind: "comment" | "reply" | "bio" | "none";
  text: string;
} {
  const text = post.firstComment || (post.blogUrl ? `Full breakdown on the blog: ${post.blogUrl}` : "");
  if (post.platform.startsWith("Facebook")) return { kind: text ? "comment" : "none", text };
  if (post.platform === "X") return { kind: text ? "reply" : "none", text };
  if (post.platform === "Instagram") return { kind: post.blogUrl ? "bio" : "none", text: post.blogUrl };
  return { kind: "none", text: "" };
}

/** Caption and hashtags as they're pasted: hashtags on their own line below. */
export function fullCaption(post: Pick<SocialPost, "caption" | "hashtags">): string {
  return [post.caption.trim(), post.hashtags].filter(Boolean).join("\n\n");
}
