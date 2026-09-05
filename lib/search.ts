import { posts } from "@/lib/blog";
import { episodes } from "@/lib/episodes";
import { builds } from "@/lib/builds";
import { getApprovedCommunityBuilds } from "@/lib/communityBuilds";
import { HOSTS, TRAIL_AMBASSADORS } from "@/lib/team";
import { getFeaturedAmbassadors } from "@/lib/ambassadors";

export type SearchResultType = "Blog" | "Podcast" | "Build" | "Team";

export interface SearchResult {
  type: SearchResultType;
  title: string;
  description: string;
  href: string;
  image?: string;
}

function matches(query: string, ...fields: (string | undefined)[]) {
  return fields.some((f) => f?.toLowerCase().includes(query));
}

/** Searches everything the site actually has static/server-fetchable data
 *  for: blog posts, curated podcast episodes, team + community builds, and
 *  team/ambassador bios. Deliberately leaves out live YouTube videos (not
 *  worth an API call per search) and merch products (already has its own
 *  browsable /merch page with categories) — revisit if that ends up feeling
 *  like a real gap once this ships. */
export async function searchSite(query: string): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResult[] = [];

  for (const post of posts) {
    if (matches(q, post.title, post.excerpt, post.category)) {
      results.push({
        type: "Blog",
        title: post.title,
        description: post.excerpt,
        href: post.body ? `/blog/${post.slug}` : "/blog",
        image: post.image.src,
      });
    }
  }

  for (const ep of episodes) {
    if (matches(q, ep.title, ep.description)) {
      results.push({
        type: "Podcast",
        title: ep.title,
        description: ep.description,
        href: `/podcast/${ep.slug}`,
        image: ep.artwork.src,
      });
    }
  }

  const communityBuilds = await getApprovedCommunityBuilds();
  for (const b of [...builds, ...communityBuilds]) {
    const name = b.nameLines.join(" ");
    if (matches(q, name, b.vehicle, b.kicker)) {
      results.push({
        type: "Build",
        title: name,
        description: b.vehicle,
        href: `/builds/${b.slug}`,
        image: b.listingImage.src,
      });
    }
  }

  for (const m of [...HOSTS, ...TRAIL_AMBASSADORS]) {
    if (matches(q, m.name, m.tagline, m.role)) {
      results.push({
        type: "Team",
        title: m.name,
        description: m.tagline,
        href: `/team/${m.slug}`,
        image: m.photo,
      });
    }
  }

  const ambassadors = await getFeaturedAmbassadors();
  for (const a of ambassadors) {
    if (matches(q, a.name, a.tagline, a.tier)) {
      results.push({
        type: "Team",
        title: a.name,
        description: a.tagline || a.tier,
        href: `/team/${a.slug}`,
        image: a.photo,
      });
    }
  }

  return results;
}
