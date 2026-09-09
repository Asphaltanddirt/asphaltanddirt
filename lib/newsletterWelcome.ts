import type { NewsletterContent } from "@/lib/newsletter";
import { SITE_URL } from "@/lib/site";
import { socialLinks } from "@/lib/social";

/**
 * The 5-email welcome sequence for new newsletter subscribers, ported from
 * the Kit "Welcome" sequence (id 2873722). Email N goes out `WELCOME_SCHEDULE[N-1]`
 * days after Subscribed Date; email 1 is sent immediately on signup.
 *
 * A&D-specific content. A sibling brand gets its own module + schedule and
 * plugs into the same cron (lib/newsletterWelcomeSend.ts).
 */

const ORANGE = "#f86000";

/** Day offset from Subscribed Date for each step (1-indexed: [0] = step 1). */
export const WELCOME_SCHEDULE = [0, 2, 5, 8, 11] as const;
export const WELCOME_STEPS = WELCOME_SCHEDULE.length;

function p(text: string) {
  return `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333;">${text}</p>`;
}
function h(text: string) {
  return `<h1 style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:900;color:#1a1712;">${text}</h1>`;
}
function button(label: string, href: string) {
  return `<p style="margin:8px 0 24px;"><a href="${href}" style="display:inline-block;background:${ORANGE};color:#000;padding:13px 26px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;font-family:Arial,Helvetica,sans-serif;letter-spacing:0.3px;">${label} &rarr;</a></p>`;
}
function linkRow(label: string, href: string, note: string) {
  return `<p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#333;"><a href="${href}" style="color:${ORANGE};font-weight:bold;text-decoration:none;">${label} &rarr;</a><br><span style="color:#666;font-size:14px;">${note}</span></p>`;
}
function open() {
  return `<div style="background:#000;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
    <img src="${SITE_URL}/images/branding/asphalt-and-dirt-horizontal.png" width="200" alt="Asphalt &amp; Dirt" style="width:200px;max-width:100%;height:auto;border:0;">
  </div>
  <div style="background:#ffffff;padding:32px 28px 8px;">`;
}
function close() {
  return `<p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1a1712;">&mdash; <strong>Asphalt &amp; Dirt</strong></p></div>`;
}

const EMAILS: Record<number, NewsletterContent> = {
  1: {
    subject: "You're in — welcome to Asphalt & Dirt",
    previewText: "Builds, trails, gear, stories, and the stuff that happens in between.",
    innerHtml:
      open() +
      h("Welcome to Asphalt &amp; Dirt.") +
      p("You're officially in.") +
      p("We built Asphalt &amp; Dirt for people who would rather take the long way, turn down the dirt road, build something different, and find out what's over the next ridge.") +
      p("Expect real builds, trail stories, gear we actually use, videos, trips, mistakes, lessons, and plenty of ideas that probably sounded smarter in the garage.") +
      p("This isn't just another newsletter. It's your way into everything we're building.") +
      button("Explore Asphalt & Dirt", SITE_URL) +
      p("Take a look around. You'll hear from us again soon.") +
      close(),
  },
  2: {
    subject: "Meet the rigs behind Asphalt & Dirt",
    previewText: "They're not show pieces. They're projects.",
    innerHtml:
      open() +
      h("Every build has a story.") +
      p("Some start with a plan. Others start with: &ldquo;What if we tried this?&rdquo;") +
      p("Our rigs are constantly evolving — suspension, tires, armor, lighting, recovery gear, performance, mistakes, upgrades, and the occasional part we swear we're never buying again.") +
      p("You'll see the finished shots on social. But on the site, we're documenting how they actually got there.") +
      button("Meet the Builds", `${SITE_URL}/builds`) +
      p("Follow the rigs from idea to trail and see what changes along the way.") +
      close(),
  },
  3: {
    subject: "What are you here for?",
    previewText: "Builds, trails, gear, SxS, overlanding — pick your lane.",
    innerHtml:
      open() +
      h("There's more than one way to get dirty.") +
      p("Maybe you're here for the builds. Maybe you're looking for trail ideas. Maybe you spend way too much time researching gear you absolutely don't need. We understand.") +
      p("Here's where to start, depending on your lane:") +
      linkRow("Builds", `${SITE_URL}/builds`, "The rigs, from idea to trail.") +
      linkRow("Trail &amp; travel", `${SITE_URL}/blog`, "Routes, trips, and what it takes to run them.") +
      linkRow("Gear &amp; reviews", `${SITE_URL}/blog`, "The stuff we actually use — and what we'd skip.") +
      linkRow("Podcast", `${SITE_URL}/podcast`, "Where horsepower meets mud.") +
      linkRow("Merch", `${SITE_URL}/merch`, "Shirts, patches, and drops.") +
      p("The more we know about what the Asphalt &amp; Dirt community actually cares about, the better we can decide what to build, test, ride, write about, and cover next.") +
      p("Don't see your thing? Just reply and tell us what you're into. We actually want to know.") +
      close(),
  },
  4: {
    subject: "The newsletter is only half of it",
    previewText: "This is where the Asphalt & Dirt community actually hangs out.",
    innerHtml:
      open() +
      h("Reading about it is good. Doing it with other people is better.") +
      p("That's why we created the private Asphalt &amp; Dirt Facebook group. It isn't another page where we repost the same stuff you've already seen — it's where the community gets involved.") +
      p("Inside you'll find member rigs, build questions, trail photos, ride planning, upcoming events, meetups, polls and debates, behind-the-scenes updates, gear recommendations, and giveaways.") +
      p("And sometimes we'll ask the group what we should do next. 37s or 40s? Which trail should we run? Is that new piece of gear actually worth the money? Some of those conversations become videos, articles, and podcast topics.") +
      button("Join the Private Group", socialLinks.facebookGroup) +
      p("Post your rig. Stock, built, half-built, or broken in the driveway — we want to see it.") +
      close(),
  },
  5: {
    subject: "You're officially part of Asphalt & Dirt",
    previewText: "You know the builds. You know the crew. Now go explore.",
    innerHtml:
      open() +
      h("Now you know what we're about.") +
      p("From here, there's no required path. Follow whatever interests you — build something, find a trail, discover new gear, watch a build come together, join a conversation, or lose an hour reading about modifications you definitely weren't planning to buy.") +
      p("Here's where everything lives:") +
      linkRow("See the builds", `${SITE_URL}/builds`, "Follow the rigs from idea to trail.") +
      linkRow("Read the latest", `${SITE_URL}/blog`, "Stories, trail content, gear, destinations, and opinions.") +
      linkRow("Watch", `${SITE_URL}/podcast`, "Videos, trail footage, builds, and podcast clips.") +
      linkRow("Join the private group", socialLinks.facebookGroup, "Upcoming rides, events, meetups, and community discussion.") +
      p("From here on out, you'll get <strong>Asphalt &amp; Dirt Weekly</strong> — one email bringing together the best of what happened that week and pointing you toward anything worth seeing, reading, watching, or joining.") +
      button("Start Exploring", SITE_URL) +
      p("Thanks for coming along. The trail starts here.") +
      close(),
  },
};

export function buildWelcomeEmail(step: number): NewsletterContent {
  const email = EMAILS[step];
  if (!email) throw new Error(`No welcome email defined for step ${step}`);
  return email;
}
