export type BlogCategory = "Builds" | "Trail & Travel" | "Gear" | "Events" | "Culture";

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  date: string; // ISO 8601
  image: { src: string; alt: string };
  /**
   * Full article body, one paragraph per entry. Undefined until a real
   * article is written for this post — the listing only links to a post
   * page once this exists, rather than pointing "Read More" at nothing.
   */
  body?: string[];
}

// Real excerpt copy from the original site. Full article bodies haven't
// been written yet for any of these — add `body` here (and the listing
// will start linking to /blog/{slug} automatically) whenever a real post
// is ready to publish.
export const posts: BlogPost[] = [
  {
    slug: "what-makes-a-daily-driver-trail-ready",
    title: "What Makes A Daily Driver Trail Ready",
    excerpt: "Highlights, laughs, and lessons from an epic weekend on red clay and good vibes.",
    category: "Builds",
    date: "2025-05-30",
    image: { src: "/img/builds/rock-rhino.jpg", alt: "Jeep built as a daily driver on a trail" },
  },
  {
    slug: "the-gear-we-actually-use",
    title: "The Gear We Actually Use",
    excerpt: "Our favorite upgrades and gear that actually hold up when the trail gets tough.",
    category: "Gear",
    date: "2025-05-27",
    image: { src: "/img/blog/gear-flatlay.jpg", alt: "Flatlay of off-road recovery gear" },
  },
  {
    slug: "red-clay-run-community-ride-recap",
    title: "Red Clay Run: Community Ride Recap",
    excerpt: "Highlights, laughs, and lessons from an epic weekend on red clay and good vibes.",
    category: "Events",
    date: "2025-05-24",
    image: { src: "/img/blog/trail-convoy.jpg", alt: "Aerial view of a Jeep convoy on a trail" },
  },
  {
    slug: "overland-setup-essentials",
    title: "Overland Setup Essentials",
    excerpt: "The gear, mods, and systems that make long trips smoother.",
    category: "Trail & Travel",
    date: "2025-05-11",
    image: { src: "/img/podcast/ep-convoy.jpg", alt: "Overland-equipped Jeep convoy on a forest road" },
  },
  {
    slug: "tires-101-choosing-traction",
    title: "Tires 101: Choosing Traction",
    excerpt: "Our guide to picking the right rubber for any terrain.",
    category: "Gear",
    date: "2025-05-07",
    image: { src: "/img/community/trail-cleanup.jpg", alt: "Close-up of an off-road tire and wheel" },
  },
  {
    slug: "why-community-rides-matter",
    title: "Why Community Rides Matter",
    excerpt: "It's more than the trails—it's the people who show up.",
    category: "Culture",
    date: "2025-05-03",
    image: { src: "/img/blog/campfire-culture.jpg", alt: "Friends gathered around a campfire" },
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug && p.body);
}

export function getPublishedPosts(): BlogPost[] {
  return posts.filter((p) => p.body);
}
