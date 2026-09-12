import { listRecords, isAirtableConfigured } from "@/lib/airtable";

/**
 * Fan/customer social posts that tagged Asphalt & Dirt (inspired by Rachel
 * posting a video of her mug and tagging us) — shown on the Community page.
 * Short-term: the plan is to replace this section with real Road & Trail
 * Crew ambassador content once that's generating enough of it, so this
 * stays a thin, data-driven read rather than anything more built-out.
 *
 * Rendered as a static thumbnail card (not TikTok's live widget) — the
 * live widget's height varies post to post (sometimes the full interactive
 * player, sometimes a plainer fallback card), which looked visually
 * inconsistent in a grid. A static thumbnail + caption, pulled from
 * TikTok's own public oEmbed API, gives every card the same fixed size as
 * every other video card on the site; clicking through opens the real post.
 */

const BASE_ID = process.env.AIRTABLE_TESTIMONIALS_BASE_ID;
const TABLE = "Social Proof";

export interface SocialProofPost {
  id: string;
  posterName: string;
  platform: "Instagram" | "TikTok";
  postUrl: string;
  thumbnailUrl: string | null;
  caption: string;
}

interface TikTokOEmbed {
  title?: string;
  thumbnail_url?: string;
}

/** TikTok's oEmbed endpoint is public — no API key or app review needed.
 *  Returns null on any failure so one bad/deleted post doesn't break the
 *  whole section. */
async function fetchTikTokOEmbed(postUrl: string): Promise<TikTokOEmbed | null> {
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(postUrl)}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    console.error("TikTok oEmbed fetch error", err);
    return null;
  }
}

export async function getApprovedSocialProof(limit = 8): Promise<SocialProofPost[]> {
  if (!isAirtableConfigured(BASE_ID)) return [];

  try {
    const records = await listRecords(TABLE, "{Approved}=1", { revalidate: 900, baseId: BASE_ID });

    const posts = records
      .map((r) => ({
        id: r.id,
        posterName: (r.fields["Poster Name"] as string) || "",
        platform: (r.fields.Platform as "Instagram" | "TikTok") || "Instagram",
        postUrl: (r.fields["Post URL"] as string) || "",
        displayOrder: r.fields["Display Order"] as number | undefined,
        createdTime: r.createdTime,
      }))
      .filter((p) => p.postUrl)
      .sort((a, b) => {
        // Explicit Display Order wins (ascending, left-to-right); records
        // without one fall to the end, newest-first among themselves.
        if (a.displayOrder != null && b.displayOrder != null) return a.displayOrder - b.displayOrder;
        if (a.displayOrder != null) return -1;
        if (b.displayOrder != null) return 1;
        return a.createdTime < b.createdTime ? 1 : -1;
      })
      .slice(0, limit);

    return await Promise.all(
      posts.map(async ({ id, posterName, platform, postUrl }) => {
        // Instagram's oEmbed now requires a Meta app + access token (not
        // public like TikTok's) — until that's set up, Instagram posts have
        // no thumbnail source here. TikTok is the only platform in use so far.
        const oembed = platform === "TikTok" ? await fetchTikTokOEmbed(postUrl) : null;
        return {
          id,
          posterName,
          platform,
          postUrl,
          thumbnailUrl: oembed?.thumbnail_url || null,
          caption: oembed?.title || "",
        };
      }),
    );
  } catch (err) {
    console.error("Social proof fetch error", err);
    return [];
  }
}
