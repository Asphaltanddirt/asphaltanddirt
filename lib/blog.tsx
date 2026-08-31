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
    slug: "jeep-gladiator-392-stop-calling-rumors-facts",
    title: "Jeep Gladiator 392: Stop Calling Rumors Facts",
    excerpt:
      "Everyone keeps saying the Jeep Gladiator 392 is confirmed—but the details aren't nearly that simple. We separate what Jeep has actually said from the rumors, assumptions, and enthusiast wish lists.",
    metaDescription:
      "The Jeep Gladiator 392 hype is everywhere. Here's what Jeep has actually confirmed, what remains speculation, and what owners should watch next.",
    category: "Builds",
    date: "2026-09-03",
    image: { src: "/img/blog/gladiator-392-rumors.jpg", alt: "Gladiator 392 — Stop Calling Rumors Facts: a lifted Jeep Gladiator Rubicon on 37s kicking up dust" },
    body: [
      { type: "paragraph", text: "The **Jeep Gladiator 392** is confirmed." },
      { type: "paragraph", text: "Except maybe it isn't." },
      { type: "paragraph", text: "That's the problem." },
      { type: "paragraph", text: "For more than a year, Jeep forums, enthusiast pages, YouTube channels, and social feeds have been repeating some version of the same headline: **“392 Gladiator confirmed.”**" },
      { type: "paragraph", text: "And look—we want one too." },
      { type: "paragraph", text: "A factory V8 Gladiator makes almost too much sense. You get the removable doors, solid axles, truck bed, trail capability, and then you drop a Hemi into the middle of it." },
      { type: "paragraph", text: "That's basically Asphalt and Dirt in vehicle form." },
      { type: "paragraph", text: "But wanting something to be true and having Jeep officially put it on an order sheet are two different things." },
      { type: "paragraph", text: "Right now, enthusiasts need to stop treating those two things like they're the same." },

      { type: "heading", text: "What Jeep Has Actually Said About a V8 Gladiator" },
      { type: "paragraph", text: "The hype really took off after Jeep CEO Bob Broderdorf made comments in 2025 about the future of Hemi power within the Jeep lineup." },
      { type: "paragraph", text: "He made it clear that the 6.4-liter Hemi still had a home at Jeep and specifically reassured Wrangler and Gladiator fans that Hemi wasn't disappearing from the conversation." },
      { type: "paragraph", text: "That was enough to light the fuse." },
      { type: "paragraph", text: "The Jeep Gladiator Forum thread built around those comments has now grown to roughly **140 pages, more than 2,000 posts, and over 120 watchers**. Owners are still dissecting every interview, order guide, production rumor, and Stellantis announcement looking for confirmation." },
      { type: "paragraph", text: "That's not a small amount of interest." },
      { type: "paragraph", text: "But here's the key distinction:" },
      { type: "paragraph", text: "**Jeep signaling that a Hemi-powered Gladiator is coming is not the same as Jeep announcing a Gladiator Rubicon 392 with confirmed specifications, pricing, and production dates.**" },
      { type: "paragraph", text: "Those details matter." },

      { type: "heading", text: "The Jeep Gladiator 392 Has Not Been Fully Defined" },
      { type: "paragraph", text: "When most people hear “Gladiator 392,” they picture something very specific." },
      { type: "paragraph", text: "A 6.4-liter Hemi." },
      { type: "paragraph", text: "Roughly Wrangler 392 levels of power." },
      { type: "paragraph", text: "Probably some version of a Rubicon or Mojave." },
      { type: "paragraph", text: "Heavy-duty axles." },
      { type: "paragraph", text: "Big brakes." },
      { type: "paragraph", text: "Aggressive suspension." },
      { type: "paragraph", text: "And a price tag that hurts just enough to make us complain about it before buying one anyway." },
      { type: "paragraph", text: "The problem is that Jeep has not publicly locked all of that down." },
      { type: "paragraph", text: "Even inside the major Gladiator forum discussion, owners have questioned whether the eventual V8 could actually be a **5.7-liter Hemi instead of the 6.4-liter 392**. Others have pointed out that recent Stellantis presentations and executive comments haven't always used “392” when discussing future Gladiator powertrains." },
      { type: "paragraph", text: "That doesn't mean the 392 isn't coming." },
      { type: "paragraph", text: "It means we don't know enough yet to present it as finished fact." },

      { type: "heading", text: "The 2027 Jeep Gladiator Order Information Matters" },
      { type: "paragraph", text: "This is where things get interesting." },
      { type: "paragraph", text: "As of late August 2026, enthusiasts are already discussing updated **2027 Jeep Gladiator order-guide information**." },
      { type: "paragraph", text: "There are new equipment combinations, trim changes, colors, and ongoing speculation about future models." },
      { type: "paragraph", text: "What isn't sitting there as a normal, clearly orderable production vehicle?" },
      { type: "paragraph", text: "A Gladiator 392." },
      { type: "paragraph", text: "The 2027 order-guide discussions are active right now, and owners are already debating missing trims and packages." },
      { type: "paragraph", text: "At the same time, Jeep's own current Gladiator page is teasing additional upcoming “Classified” models as part of its 2027 lineup campaign. Jeep isn't identifying those vehicles yet." },
      { type: "paragraph", text: "Could one be the V8?" },
      { type: "paragraph", text: "Absolutely." },
      { type: "paragraph", text: "Can we call that confirmation?" },
      { type: "paragraph", text: "No." },
      { type: "paragraph", text: "That's exactly how rumors turn into “facts.”" },
      { type: "paragraph", text: "Someone sees a blank space." },
      { type: "paragraph", text: "Someone connects it to a CEO comment." },
      { type: "paragraph", text: "Another account posts “392 CONFIRMED.”" },
      { type: "paragraph", text: "Ten reposts later, everybody thinks Jeep issued a press release." },

      { type: "heading", text: "Why Jeep Owners Want the V8 So Badly" },
      { type: "paragraph", text: "The obsession isn't hard to understand." },
      { type: "paragraph", text: "The Gladiator has always had the chassis and personality for more power." },
      { type: "paragraph", text: "The 3.6-liter Pentastar gets the job done, but once you start adding 35s, 37s, armor, bumpers, recovery equipment, camping gear, and everything else we bolt onto these trucks, 285 horsepower starts feeling a lot less exciting." },
      { type: "paragraph", text: "And the Hemi solves more than a horsepower problem." },
      { type: "paragraph", text: "It's the sound." },
      { type: "paragraph", text: "The throttle response." },
      { type: "paragraph", text: "The simplicity and familiarity enthusiasts associate with a naturally aspirated V8." },
      { type: "paragraph", text: "The fact that a ridiculous engine in an equally ridiculous removable-roof pickup just feels right." },
      { type: "paragraph", text: "Forum owners are even debating whether they'd rather have a traditional Hemi than a more powerful Hurricane inline-six because horsepower isn't the only part of the ownership equation." },
      { type: "paragraph", text: "That's a real conversation." },

      { type: "heading", text: "Then There's the Price" },
      { type: "paragraph", text: "This might decide whether the Hemi Gladiator becomes a hero or another vehicle everybody loves but few people buy." },
      { type: "paragraph", text: "The Wrangler 392 proved Jeep enthusiasts will spend serious money for V8 power." },
      { type: "paragraph", text: "But the Gladiator market is different." },
      { type: "paragraph", text: "It's already competing against midsize pickups that can tow, haul, and daily-drive extremely well for substantially less money." },
      { type: "paragraph", text: "The forum discussion keeps circling back to the same question:" },
      { type: "paragraph", text: "**How much extra should a V8 really cost?**" },
      { type: "paragraph", text: "Some owners argue that adding tens of thousands of dollars for the engine turns the whole thing into a luxury toy. Others say a factory Hemi, warranty, upgraded drivetrain, and resale value justify the premium." },
      { type: "paragraph", text: "That's probably where the real battle will happen." },
      { type: "paragraph", text: "Not whether people want it." },
      { type: "paragraph", text: "Whether enough people want it **at Jeep's price.**" },

      { type: "heading", text: "What We Know, What We Think, and What We Don't Know" },
      { type: "paragraph", text: "Here's where Asphalt and Dirt stands." },
      { type: "paragraph", text: "**We know:** Jeep leadership has publicly made it clear that Hemi power remains part of Jeep's future and has specifically included Gladiator fans in that conversation." },
      { type: "paragraph", text: "**We have strong reason to believe:** A factory V8 Gladiator is a serious possibility and may be part of upcoming product announcements." },
      { type: "paragraph", text: "**We do not know:**" },
      { type: "paragraph", text: "The final engine displacement." },
      { type: "paragraph", text: "The final trim." },
      { type: "paragraph", text: "Horsepower." },
      { type: "paragraph", text: "Torque." },
      { type: "paragraph", text: "Axle package." },
      { type: "paragraph", text: "Suspension." },
      { type: "paragraph", text: "Towing capacity." },
      { type: "paragraph", text: "Price." },
      { type: "paragraph", text: "Actual order date." },
      { type: "paragraph", text: "Actual production date." },
      { type: "paragraph", text: "Until Jeep publishes those details, they're not facts." },
      { type: "paragraph", text: "They're educated guesses." },

      { type: "heading", text: "Stop Killing the Story by Pretending We Already Know It" },
      { type: "paragraph", text: "Here's the funny part." },
      { type: "paragraph", text: "The actual story is better than the rumor." },
      { type: "paragraph", text: "Jeep has a product enthusiasts have begged for almost since the Gladiator launched." },
      { type: "paragraph", text: "The Hemi is alive again." },
      { type: "paragraph", text: "Jeep is teasing future Gladiator models." },
      { type: "paragraph", text: "The community is watching every move." },
      { type: "paragraph", text: "And we genuinely don't know exactly what Jeep is about to do." },
      { type: "paragraph", text: "That's interesting." },
      { type: "paragraph", text: "We don't need to manufacture certainty where it doesn't exist." },
      { type: "paragraph", text: "If Jeep announces a 470-horsepower Gladiator Rubicon 392 tomorrow, we'll be right there talking about it." },
      { type: "paragraph", text: "But until the build sheet exists, let's call it what it is:" },
      { type: "paragraph", text: "**A V8 Gladiator looks increasingly likely.**" },
      { type: "paragraph", text: "A fully confirmed **Jeep Gladiator 392** with known specs, pricing, and production?" },
      { type: "paragraph", text: "Not yet." },
      { type: "paragraph", text: "And now the important question:" },
      { type: "paragraph", text: "**If Jeep gives us the V8 Gladiator, what would you actually pay for it?**" },
      { type: "paragraph", text: "Would you spend Wrangler 392 money?" },
      { type: "paragraph", text: "Or does Jeep need to keep this thing under control for it to make sense?" },
      { type: "paragraph", text: "Let us know." },
      { type: "paragraph", text: "Because if this truck finally drops, the price might start a bigger fight than the engine ever did." },
    ],
  },
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
