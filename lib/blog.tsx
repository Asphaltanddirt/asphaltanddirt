export type BlogCategory = "Builds" | "Trail & Travel" | "Gear" | "Events" | "Culture";

/** A single content block in a post body. Supports the minimum structure a
 *  real article needs — section headings plus paragraphs — with **bold**
 *  inline emphasis parsed at render time (see renderInline in the post page). */
export type BlogBlock = { type: "heading"; text: string } | { type: "paragraph"; text: string };

export interface BlogPost {
  slug: string;
  title: string;
  /** Optional distinct <title>/OG title tuned for search — falls back to `title`. */
  seoTitle?: string;
  excerpt: string;
  /** Optional distinct <meta name="description"> copy — falls back to `excerpt`. */
  metaDescription?: string;
  category: BlogCategory;
  date: string; // ISO 8601
  image: { src: string; alt: string };
  /**
   * Full article body. Undefined until a real article is written for this
   * post — the listing only links to a post page once this exists, rather
   * than pointing "Read More" at nothing.
   */
  body?: BlogBlock[];
  /**
   * Manually curated — there's no analytics provider connected yet, so
   * "Editor's Picks" is editorial judgment rather than real view counts.
   * Revisit once real traffic data exists.
   */
  editorsPick?: boolean;
}

// Real excerpt copy from the original site. Full article bodies haven't
// been written yet for any of these — add `body` here (and the listing
// will start linking to /blog/{slug} automatically) whenever a real post
// is ready to publish.
export const posts: BlogPost[] = [
  {
    slug: "california-tire-rules-what-enthusiasts-need-to-know",
    title: "California Tire Rules: What Enthusiasts Actually Need to Know",
    seoTitle: "California Tire Rules: What Enthusiasts Need to Know",
    excerpt:
      "California didn't ban your 37s—but its new tire rules could still matter to Jeep, off-road and performance owners. Here's what the regulation actually says, what it doesn't, and what enthusiasts should be watching.",
    metaDescription:
      "California tire rules are changing. Here's what the new standards actually mean for off-road tires, performance tires, 35s, 37s and more.",
    category: "Gear",
    date: "2026-08-31",
    image: { src: "/img/blog/california-tire-rules.jpg", alt: "California Tire Rules: What It Really Means — a muddy Jeep Rubicon on 37s next to a crossed-out tire graphic" },
    body: [
      { type: "paragraph", text: "No, California did not just ban your 37s." },
      { type: "paragraph", text: "It didn't outlaw lifted Jeeps. It didn't require everybody to run factory-size tires. And nobody from Sacramento is coming to measure the rubber under your Wrangler." },
      { type: "paragraph", text: "But the **California tire rules** that were approved in August are real, and if you're into Jeeps, off-roading, street builds or track cars, they're worth paying attention to." },
      { type: "paragraph", text: "Because underneath some of the social-media outrage is a legitimate question:" },
      { type: "paragraph", text: "**What happens when tire efficiency regulations meet enthusiast vehicles?**" },
      { type: "paragraph", text: "That part is worth talking about." },

      { type: "heading", text: "What California Actually Approved" },
      { type: "paragraph", text: "On August 17, 2026, the California Energy Commission approved its Replacement Tire Efficiency Program, the first state standards of their kind in the country." },
      { type: "paragraph", text: "The rules apply to replacement tires sold for passenger vehicles and light-duty trucks in California. Phase one begins in **2029**, with stricter requirements taking effect in **2033**." },
      { type: "paragraph", text: "The basic idea is straightforward: replacement tires shouldn't dramatically reduce the efficiency a vehicle had when it left the factory." },
      { type: "paragraph", text: "Tires create rolling resistance. More rolling resistance means the engine—or electric motor—needs more energy to keep the vehicle moving. California wants replacement tires to meet minimum efficiency standards while maintaining requirements for wet grip and other performance characteristics." },
      { type: "paragraph", text: "That's the rule." },
      { type: "paragraph", text: "There is nothing in the regulation saying your Jeep has to stay on the tire size printed on the door jamb." },

      { type: "heading", text: "California Tire Rules Aren't Tire-Size Rules" },
      { type: "paragraph", text: "This is where the internet started getting sideways." },
      { type: "paragraph", text: "Some enthusiast discussions quickly turned the regulation into some version of:" },
      { type: "paragraph", text: "**“California is banning oversized tires.”**" },
      { type: "paragraph", text: "That's not what the adopted program says." },
      { type: "paragraph", text: "The rule establishes efficiency requirements for tires being sold. It does **not** establish a maximum 33-, 35-, 37- or 40-inch tire size for your vehicle." },
      { type: "paragraph", text: "There are also exemptions built into the program, including limited-production tires, high-load-index tires and tires that cannot sustain speeds above 50 mph. The California Energy Commission also says accommodations were made for certain specialty categories, including competition tires and some large off-road tires." },
      { type: "paragraph", text: "So can everyone with a Jeep on 37s stop caring?" },
      { type: "paragraph", text: "Not exactly." },

      { type: "heading", text: "The Real Question for Off-Road Tires" },
      { type: "paragraph", text: "The better question isn't:" },
      { type: "paragraph", text: "**“Are they banning 37s?”**" },
      { type: "paragraph", text: "It's:" },
      { type: "paragraph", text: "**“Which 37s will manufacturers still be willing to sell in California once these standards take effect?”**" },
      { type: "paragraph", text: "That's a much more complicated conversation." },
      { type: "paragraph", text: "A 37-inch all-terrain designed for highway use is a very different product from a competition-specific tire or a massive low-speed rock-crawling tire." },
      { type: "paragraph", text: "And that's where enthusiast concerns become legitimate." },
      { type: "paragraph", text: "The CEC's own public rulemaking docket continued receiving comments after the regulation was adopted asking for additional review of specialty-performance tires and raising concerns about off-road tires, consumer choice and cost." },
      { type: "paragraph", text: "Those comments are opinions and concerns—not proof that specific tires will disappear." },
      { type: "paragraph", text: "That distinction matters." },
      { type: "paragraph", text: "Right now, anyone telling you that a specific BFGoodrich, Nitto, Falken, Toyo or Mickey Thompson tire is definitely going to be banned needs to show the actual classification and compliance data for that tire." },
      { type: "paragraph", text: "Otherwise, they're guessing." },

      { type: "heading", text: "Performance Car Owners Should Be Watching Too" },
      { type: "paragraph", text: "This isn't just a Jeep story." },
      { type: "paragraph", text: "Street cars, autocross cars and track builds often live on specialty rubber where outright grip matters far more than fuel economy." },
      { type: "paragraph", text: "Ultra-high-performance tires, 200-treadwear tires, drag-oriented tires and competition tires are all designed around different priorities." },
      { type: "paragraph", text: "California says its testing found the efficiency standards can be met without sacrificing safety, tire lifespan or other important characteristics, and the regulations include separate treatment for several specialty categories." },
      { type: "paragraph", text: "Manufacturers—including major tire companies—were involved during years of stakeholder discussions." },
      { type: "paragraph", text: "Still, enthusiasts have a fair reason to watch what happens next." },
      { type: "paragraph", text: "Because what works technically isn't always the same thing as what manufacturers decide makes financial sense to keep producing." },

      { type: "heading", text: "Could This Spread Beyond California?" },
      { type: "paragraph", text: "This might be the bigger story." },
      { type: "paragraph", text: "California is often large enough as a market that manufacturers don't simply build completely different product lines for the state." },
      { type: "paragraph", text: "If tire manufacturers redesign products to meet California's requirements, some of those changes could eventually affect what gets sold elsewhere." },
      { type: "paragraph", text: "That's not guaranteed." },
      { type: "paragraph", text: "But it's one reason an off-road owner in New Jersey, Pennsylvania or anywhere else shouldn't dismiss this as somebody else's problem." },
      { type: "paragraph", text: "California may be where the regulation started." },
      { type: "paragraph", text: "The tire industry isn't confined by state lines." },

      { type: "heading", text: "There's Another Side to This" },
      { type: "paragraph", text: "It's also worth acknowledging why these rules exist." },
      { type: "paragraph", text: "According to the California Energy Commission, more efficient replacement tires could eventually save California motorists nearly **$1 billion annually** in gasoline and electricity costs." },
      { type: "paragraph", text: "The agency estimates Phase 1 could add around **$6 to the cost of a set of four tires** while producing roughly $85 in energy savings over their life. Phase 2 estimates put the added tire cost around $26 per set against $179 in projected savings." },
      { type: "paragraph", text: "You can agree with the policy, hate the policy or question those projections." },
      { type: "paragraph", text: "But that's the actual argument." },
      { type: "paragraph", text: "Not government-approved 32s versus illegal 37s." },

      { type: "heading", text: "What Asphalt and Dirt Is Watching" },
      { type: "paragraph", text: "For us, three things matter going forward." },
      { type: "paragraph", text: "**Availability.** Do popular enthusiast tires continue being sold without major changes?" },
      { type: "paragraph", text: "**Performance.** Can manufacturers reduce rolling resistance without sacrificing the traction, durability and sidewall strength off-road owners actually need?" },
      { type: "paragraph", text: "**Cost.** Will specialty tires become noticeably more expensive because manufacturers have to redesign, test or certify additional products?" },
      { type: "paragraph", text: "Those answers probably won't come from Facebook memes." },
      { type: "paragraph", text: "They'll come from manufacturers, published compliance information and what eventually shows up—or disappears—from tire racks." },

      { type: "heading", text: "The Bottom Line" },
      { type: "paragraph", text: "Your 37s aren't suddenly illegal." },
      { type: "paragraph", text: "Your lifted Jeep isn't being forced back onto stock rubber." },
      { type: "paragraph", text: "And California hasn't outlawed performance tires." },
      { type: "paragraph", text: "But dismissing the entire thing because the loudest claims are wrong would be a mistake too." },
      { type: "paragraph", text: "The **California tire rules** represent a real change in how replacement tires will be regulated, and enthusiast applications sit right where efficiency standards, performance requirements and consumer choice collide." },
      { type: "paragraph", text: "That's a conversation worth having without turning it into panic." },
      { type: "paragraph", text: "So here's the question:" },
      { type: "paragraph", text: "**If a new tire delivered the same traction, durability and off-road performance as the tire you're running now—but used less fuel—would you care?**" },
      { type: "paragraph", text: "Or is tire efficiency something that should stay completely out of enthusiast vehicle culture?" },
      { type: "paragraph", text: "Drop your take. This one is going to get interesting." },
    ],
  },
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
    editorsPick: true,
  },
  {
    slug: "tires-101-choosing-traction",
    title: "Tires 101: Choosing Traction",
    excerpt: "Our guide to picking the right rubber for any terrain.",
    category: "Gear",
    date: "2025-05-07",
    image: { src: "/img/community/trail-cleanup.jpg", alt: "Close-up of an off-road tire and wheel" },
    editorsPick: true,
  },
  {
    slug: "why-community-rides-matter",
    title: "Why Community Rides Matter",
    excerpt: "It's more than the trails—it's the people who show up.",
    category: "Culture",
    date: "2025-05-03",
    image: { src: "/img/blog/campfire-culture.jpg", alt: "Friends gathered around a campfire" },
    editorsPick: true,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug && p.body);
}

export function getPublishedPosts(): BlogPost[] {
  return posts.filter((p) => p.body);
}

/** Every post, newest first — the full archive, not just a curated slice. */
export function getAllPostsSorted(): BlogPost[] {
  return [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getEditorsPicks(): BlogPost[] {
  return posts.filter((p) => p.editorsPick);
}
