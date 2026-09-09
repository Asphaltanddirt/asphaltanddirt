import type { BlogPost } from "@/lib/blog";
import { getAllPostsSorted } from "@/lib/blog";
import { builds, type Build } from "@/lib/builds";
import { getCommunityEvents } from "@/lib/calendar";
import {
  fetchLatestFromPlaylist,
  fetchVideoById,
  PODCAST_EPISODES_PLAYLIST_ID,
  youtubeIdFromUrl,
  type YouTubeVideo,
} from "@/lib/youtube";
import { getEpisodeByYoutubeId } from "@/lib/episodes";
import { getFeaturedProducts, getProductsBySlugs, type Product } from "@/lib/fourthwall";
import { socialLinks } from "@/lib/social";
import { SITE_URL } from "@/lib/site";

const BLACK = "#000000";
const CHARCOAL = "#1a1a1a";
const ORANGE = "#f86000";
const OFF_WHITE = "#f4f4f2";
const GRAY = "#bbb1aa";
const BORDER = "#2a2b2e";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function absoluteUrl(path: string) {
  return path.startsWith("http") ? path : `${SITE_URL}${path}`;
}

/** ISO-ish week number, used only to deterministically rotate the weekly
 *  "From The Garage" build spotlight — doesn't need to be calendar-accurate,
 *  just stable and different week to week. */
function weekNumber(date: Date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - start.getTime()) / 86400000);
  return Math.floor(days / 7);
}

/**
 * The provider-agnostic result of building a newsletter: a subject line,
 * inbox-preview text, and the body markup *without* the outer <html> shell
 * or the footer. `wrapNewsletterEmail` turns this into a complete, sendable
 * document with a per-recipient unsubscribe link. Nothing here sends —
 * sending lives in lib/newsletterSend.ts and is gated behind the admin
 * secret plus an explicit `mode=live`.
 */
export interface NewsletterContent {
  subject: string;
  previewText: string;
  innerHtml: string;
}

// ---------------------------------------------------------------------------
// Shared section renderers
// ---------------------------------------------------------------------------

function sectionCard(inner: string) {
  return `
    <div style="background:#ffffff;border:1px solid #e5e5e5;border-radius:8px;padding:24px;margin:0 0 16px;">
      ${inner}
    </div>
  `;
}

function kicker(text: string) {
  return `<p style="font-size:12px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:#666;margin:0 0 8px;">${escapeHtml(text)}</p>`;
}

function ctaLink(text: string, url: string) {
  return `<p style="margin:12px 0 0;"><a href="${url}" style="color:${ORANGE};font-weight:bold;text-decoration:none;font-size:14px;">${escapeHtml(text)} &rarr;</a></p>`;
}

// Same identity as the /blog page — the newsletter is "The Dirt Line" in
// email form, not a separate brand.
function renderMasthead() {
  const logoUrl = absoluteUrl("/images/branding/asphalt-and-dirt-horizontal.png");
  return `
    <div style="background:${BLACK};padding:28px 24px;border-radius:8px 8px 0 0;">
      <table width="100%" style="border-collapse:collapse;">
        <tr>
          <td style="vertical-align:middle;"><img src="${logoUrl}" alt="Asphalt &amp; Dirt" style="height:32px;width:auto;display:block;" /></td>
          <td style="vertical-align:middle;color:${GRAY};font-size:13px;letter-spacing:0.06em;text-transform:uppercase;text-align:right;">The Dirt Line</td>
        </tr>
      </table>
    </div>
    <div style="background:#ffffff;padding:20px 24px;border-bottom:2px solid ${ORANGE};">
      <p style="font-size:13px;font-weight:bold;letter-spacing:0.06em;text-transform:uppercase;color:#666;margin:0 0 6px;">Stories From The Street &amp; The Trail</p>
      <p style="font-size:15px;line-height:1.5;color:#333;margin:0;">Builds, adventures, gear, and the people who keep the culture moving.</p>
    </div>
  `;
}

function renderFeatureStory(
  post: BlogPost | undefined,
  opts: { teaser?: string; imageUrl?: string } = {},
) {
  if (!post) return "";
  const postUrl = `${SITE_URL}/blog/${post.slug}`;
  const imageUrl = opts.imageUrl || absoluteUrl(post.image.src);
  const teaser = opts.teaser?.trim() || post.excerpt;
  return `
    <div style="background:${CHARCOAL};margin:0 0 16px;">
      <img src="${imageUrl}" alt="${escapeHtml(post.image.alt)}" style="width:100%;max-width:600px;height:auto;display:block;" />
      <div style="padding:32px 24px;">
        <p style="font-size:12px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:${GRAY};margin:0 0 12px;">Feature Story</p>
        <h1 style="font-size:28px;line-height:1.2;color:${OFF_WHITE};margin:0 0 16px;font-family:Arial,sans-serif;">${escapeHtml(post.title)}</h1>
        <div style="width:48px;height:3px;background:${ORANGE};margin:0 0 16px;"></div>
        <p style="font-size:15px;line-height:1.6;color:${GRAY};margin:0 0 20px;">${escapeHtml(teaser)}</p>
        <a href="${postUrl}" style="display:inline-block;background:${ORANGE};color:#000;padding:14px 24px;border-radius:4px;text-decoration:none;font-weight:bold;font-size:14px;">Read The Full Story &rarr;</a>
      </div>
    </div>
  `;
}

function renderGarageBuild(build: Build | undefined) {
  if (!build) return "";
  const buildUrl = `${SITE_URL}/builds/${build.slug}`;
  return sectionCard(`
    ${kicker("From The Garage")}
    <p style="font-size:20px;font-weight:900;margin:0 0 10px;font-family:Arial,sans-serif;">${escapeHtml(build.nameLines.join(" "))}</p>
    <p style="font-size:15px;line-height:1.6;color:#333;margin:0;">${escapeHtml(build.lead)}</p>
    ${ctaLink("See The Build", buildUrl)}
  `);
}

export interface TrailTalkSection {
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
}

export interface RigOfTheWeekSection {
  name: string;
  blurb: string;
  photoUrl: string;
  photoAlt?: string;
  ctaUrl?: string;
}

function renderTrailTalk(section: TrailTalkSection | undefined) {
  if (!section) return "";
  return sectionCard(`
    ${kicker("Trail Talk")}
    <p style="font-size:20px;font-weight:900;margin:0 0 10px;font-family:Arial,sans-serif;">${escapeHtml(section.title)}</p>
    <p style="font-size:15px;line-height:1.6;color:#333;margin:0;">${escapeHtml(section.body)}</p>
    ${section.ctaUrl ? ctaLink(section.ctaText || "Join The Conversation", section.ctaUrl) : ""}
  `);
}

/** The second story of the week — the other side of the asphalt/dirt
 *  split. Auto = the second-newest published post; override any field
 *  from the Newsletters row. */
function renderAlsoThisWeek(
  post: BlogPost | undefined,
  override: { title?: string; body?: string; url?: string } = {},
) {
  const title = override.title?.trim() || post?.title;
  const body = override.body?.trim() || post?.excerpt;
  const url = override.url?.trim() || (post ? `${SITE_URL}/blog/${post.slug}` : "");
  if (!title || !body || !url) return "";
  return sectionCard(`
    ${kicker("Also This Week")}
    <p style="font-size:20px;font-weight:900;margin:0 0 10px;font-family:Arial,sans-serif;">${escapeHtml(title)}</p>
    <p style="font-size:15px;line-height:1.6;color:#333;margin:0;">${escapeHtml(body)}</p>
    ${ctaLink("Read", url)}
  `);
}

export interface EventSection {
  title?: string;
  teaser?: string;
  url?: string;
}

/** Upcoming community event — from the Facebook group (Newsletters row
 *  override), falling back to the next event on the community calendar. */
function renderUpcomingEvent(override: EventSection, calendarLine: string | null) {
  const title = override.title?.trim() || (calendarLine ? "What's Happening" : "");
  const teaser =
    override.teaser?.trim() ||
    (calendarLine ? `Next up: ${calendarLine} — plus whatever else the crew's got planned.` : "");
  if (!title && !teaser) return "";
  const url = override.url?.trim() || `${SITE_URL}/community`;
  return sectionCard(`
    ${kicker("Upcoming Event")}
    ${title ? `<p style="font-size:20px;font-weight:900;margin:0 0 10px;font-family:Arial,sans-serif;">${escapeHtml(title)}</p>` : ""}
    <p style="font-size:15px;line-height:1.6;color:#333;margin:0;">${escapeHtml(teaser)}</p>
    ${ctaLink(override.url ? "Details In The Group" : "See Rides & Events", url)}
  `);
}

function renderRigOfTheWeek(rig: RigOfTheWeekSection | undefined) {
  if (!rig) return "";
  const buildLink = rig.ctaUrl?.trim();
  return sectionCard(`
    ${kicker("Rig Of The Week")}
    ${rig.photoUrl ? `<img src="${absoluteUrl(rig.photoUrl)}" alt="${escapeHtml(rig.photoAlt || rig.name)}" style="width:100%;height:auto;border-radius:6px;margin:0 0 16px;display:block;" />` : ""}
    <p style="font-size:20px;font-weight:900;margin:0 0 10px;font-family:Arial,sans-serif;">${escapeHtml(rig.name)}</p>
    <p style="font-size:15px;line-height:1.6;color:#333;margin:0;">${escapeHtml(rig.blurb)}</p>
    ${buildLink ? ctaLink("See The Build", buildLink) : ""}
    <p style="margin:12px 0 0;font-size:13px;color:#666;">Want your rig here? <a href="${SITE_URL}/builds/submit" style="color:${ORANGE};font-weight:bold;text-decoration:none;">Submit it &rarr;</a></p>
  `);
}

function renderQuickHits(items: { label: string; ctaText: string; url: string }[]) {
  if (items.length === 0) return "";
  const rows = items
    .map(
      (item, i) => `
        <tr>
          <td style="padding:12px 0;border-top:${i === 0 ? "none" : `1px solid ${BORDER}`};font-size:14px;color:#333;">${escapeHtml(item.label)}</td>
          <td style="padding:12px 0;border-top:${i === 0 ? "none" : `1px solid ${BORDER}`};text-align:right;white-space:nowrap;">
            <a href="${item.url}" style="color:${ORANGE};font-weight:bold;text-decoration:none;font-size:13px;">${escapeHtml(item.ctaText)} &rarr;</a>
          </td>
        </tr>`,
    )
    .join("");
  return sectionCard(`
    ${kicker("Quick Hits")}
    <table width="100%" style="border-collapse:collapse;">${rows}</table>
  `);
}

function renderFooter() {
  const link = (label: string, url: string) =>
    `<a href="${url}" style="color:${GRAY};text-decoration:none;font-weight:bold;">${label}</a>`;
  const socials = [
    link("Facebook", socialLinks.facebook),
    link("Instagram", socialLinks.instagram),
    link("TikTok", socialLinks.tiktok),
    link("YouTube", socialLinks.youtube),
    link("X", socialLinks.x),
  ].join('<span style="color:#555;"> &middot; </span>');
  return `
    <div style="background:${BLACK};padding:40px 24px;border-radius:8px;text-align:center;">
      <p style="font-size:12px;font-weight:bold;letter-spacing:0.1em;text-transform:uppercase;color:${GRAY};margin:0 0 12px;">Don't Just Read About It.</p>
      <p style="font-size:22px;font-weight:900;color:${OFF_WHITE};margin:0 0 16px;font-family:Arial,sans-serif;">Join The Asphalt &amp; Dirt Community</p>
      <p style="font-size:15px;line-height:1.6;color:${GRAY};margin:0 0 24px;">Rides, events, meetups, member rigs, and the conversations behind the content.</p>
      <a href="${socialLinks.facebookGroup}" style="display:inline-block;background:${ORANGE};color:#000;padding:14px 28px;border-radius:4px;text-decoration:none;font-weight:bold;font-size:14px;">Join The Private Group &rarr;</a>
      <p style="font-size:13px;color:${GRAY};margin:28px 0 0;">${socials}</p>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Single blog-post announcement
// ---------------------------------------------------------------------------

/** A quick "we just published this" email for one post — distinct from the
 *  weekly digest. Pure formatting, no AI pass: the newsletter should be an
 *  exact reflection of what's live on the site, not a re-generated
 *  approximation. */
export function buildBlogAnnouncement(post: BlogPost): NewsletterContent {
  const postUrl = `${SITE_URL}/blog/${post.slug}`;
  const imageUrl = absoluteUrl(post.image.src);

  const innerHtml = `
    ${renderMasthead()}
    <div style="background:#ffffff;padding:0 24px 24px;">
      <p><img src="${imageUrl}" alt="${escapeHtml(post.image.alt)}" style="width:100%;max-width:600px;height:auto;border-radius:8px;" /></p>
      <p style="font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:${ORANGE};font-weight:bold;margin:16px 0 4px;">${escapeHtml(post.category)}</p>
      <h1 style="font-size:26px;margin:0 0 12px;">${escapeHtml(post.title)}</h1>
      <p style="font-size:16px;line-height:1.5;color:#333;">${escapeHtml(post.excerpt)}</p>
      <p style="margin-top:20px;">
        <a href="${postUrl}" style="display:inline-block;background:${ORANGE};color:#000;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold;">Read The Full Story &rarr;</a>
      </p>
    </div>
  `.trim();

  return { subject: post.title, previewText: post.excerpt, innerHtml };
}

// ---------------------------------------------------------------------------
// Weekly digest
// ---------------------------------------------------------------------------

export interface WeeklyDigestOptions {
  /** Pick which post is the feature (URL or slug). Blank -> newest post. */
  featureStory?: { url?: string; teaser?: string; imageUrl?: string };
  /** Build slug to spotlight in "From the Garage". Blank -> rotates. */
  garageBuildSlug?: string;
  /** Discussion prompt — no data source, you fill it weekly. Omit -> no block. */
  trailTalk?: TrailTalkSection;
  /** The other story of the week. Blank fields -> the second-newest post. */
  alsoThisWeek?: { title?: string; body?: string; url?: string };
  /** Upcoming community event. Blank -> next event on the calendar. */
  event?: EventSection;
  /** Member rig spotlight — editorial pick, no feed. Omit -> no block. */
  rigOfTheWeek?: RigOfTheWeekSection;
  /** Anthony's short vlog on this week's story — first Quick Hits line. */
  vlogUrl?: string;
  /** The video to feature in Quick Hits (any YouTube URL). Blank -> the
   *  latest podcast episode. */
  videoUrl?: string;
  /** Merch item to push in Quick Hits (a /merch/<slug> URL). Blank -> the
   *  newest published product. */
  merchUrl?: string;
}

function slugFromUrl(value?: string): string {
  const m = (value || "").match(/\/blog\/([a-z0-9-]+)/i);
  return m ? m[1] : (value || "").trim();
}

function merchSlugFromUrl(value?: string): string {
  const m = (value || "").match(/\/merch\/([a-z0-9-]+)/i);
  return m ? m[1] : (value || "").trim();
}

/**
 * Assembles the weekly digest in the standing section order: feature story,
 * From the Garage, Trail Talk, Also This Week, Upcoming Event, Rig of the
 * Week, Quick Hits, footer. Every section auto-fills from the site;
 * anything in `options` (from the Newsletters row) overrides.
 */
export async function buildWeeklyDigest(options: WeeklyDigestOptions = {}): Promise<NewsletterContent> {
  const publishedPosts = getAllPostsSorted().filter((p) => p.body);

  const featureOverrideSlug = slugFromUrl(options.featureStory?.url);
  const featureStory =
    (featureOverrideSlug && publishedPosts.find((p) => p.slug === featureOverrideSlug)) ||
    publishedPosts[0];

  // Also This Week = the newest published post that isn't the feature.
  const secondStory = publishedPosts.find((p) => p.slug !== featureStory?.slug);

  const garageSlug = options.garageBuildSlug?.trim();
  const garageBuild =
    (garageSlug && builds.find((b) => b.slug === garageSlug)) ||
    (builds.length > 0 ? builds[weekNumber(new Date()) % builds.length] : undefined);

  const merchSlug = merchSlugFromUrl(options.merchUrl);
  const videoOverrideId = options.videoUrl ? youtubeIdFromUrl(options.videoUrl) : "";
  const [{ upcoming }, latestVideos, merch, overrideVideo] = await Promise.all([
    getCommunityEvents(),
    fetchLatestFromPlaylist(PODCAST_EPISODES_PLAYLIST_ID, 1),
    merchSlug ? getProductsBySlugs([merchSlug]) : getFeaturedProducts("all", 1),
    videoOverrideId ? fetchVideoById(videoOverrideId) : Promise.resolve(undefined),
  ]);
  const nextEvent = upcoming[0];
  const nextEventLine = nextEvent
    ? `${nextEvent.title} on ${nextEvent.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : null;

  const latestVideo: YouTubeVideo | undefined = latestVideos[0];
  const newestMerch: Product | undefined = merch[0];

  // A hand-picked video links straight to YouTube; the auto pick (latest
  // podcast episode) links to the episode's own page — keeps the click
  // on-property and stops Gmail unfurling a big video card.
  let videoHit: { label: string; ctaText: string; url: string } | undefined;
  if (overrideVideo) {
    videoHit = { label: `Watch: ${overrideVideo.title}`, ctaText: "Watch", url: overrideVideo.url };
  } else if (latestVideo) {
    const episode = getEpisodeByYoutubeId(latestVideo.videoId);
    videoHit = {
      label: `Latest episode: ${latestVideo.title}`,
      ctaText: "Watch",
      url: episode ? `${SITE_URL}/podcast/${episode.slug}` : `${SITE_URL}/podcast`,
    };
  }

  const vlogUrl = options.vlogUrl?.trim();

  const quickHitItems = [
    vlogUrl && {
      label: "Anthony breaks down this week's story",
      ctaText: "Watch",
      url: vlogUrl,
    },
    videoHit,
    newestMerch && {
      label: `New in merch: ${newestMerch.name}`,
      ctaText: "Shop",
      url: `${SITE_URL}/merch/${newestMerch.slug}`,
    },
  ].filter((x): x is { label: string; ctaText: string; url: string } => Boolean(x));

  const innerHtml = [
    renderMasthead(),
    renderFeatureStory(featureStory, {
      teaser: options.featureStory?.teaser,
      imageUrl: options.featureStory?.imageUrl,
    }),
    renderGarageBuild(garageBuild),
    renderTrailTalk(options.trailTalk),
    renderAlsoThisWeek(secondStory, options.alsoThisWeek || {}),
    renderUpcomingEvent(options.event || {}, nextEventLine),
    renderRigOfTheWeek(options.rigOfTheWeek),
    renderQuickHits(quickHitItems),
    renderFooter(),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: featureStory ? `This Week: ${featureStory.title}` : "This Week In Asphalt & Dirt",
    previewText: featureStory?.excerpt || "Builds, trails, gear, and community — this week's roundup.",
    innerHtml,
  };
}

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

/**
 * Wraps built content into a complete, sendable HTML document: inbox
 * preview text, a max-width container around the body, and a CAN-SPAM
 * footer (why-you-got-this line, unsubscribe link, physical address).
 * `unsubscribeUrl` is per-recipient — the send loop calls this once per
 * subscriber with their own token.
 */
export function wrapNewsletterEmail(
  content: NewsletterContent,
  opts: { unsubscribeUrl: string; mailingAddress: string },
): string {
  const footer = `
    <div style="max-width:600px;margin:24px auto 0;padding:0 24px 32px;text-align:center;font-family:Arial,sans-serif;">
      <p style="font-size:12px;line-height:1.7;color:#999;margin:0 0 6px;">You're getting this because you subscribed to The Dirt Line at <a href="${SITE_URL}" style="color:#999;">asphaltanddirt.com</a>.</p>
      <p style="font-size:12px;line-height:1.7;color:#999;margin:0 0 6px;"><a href="${opts.unsubscribeUrl}" style="color:#999;text-decoration:underline;">Unsubscribe</a></p>
      <p style="font-size:12px;line-height:1.7;color:#999;margin:0;">${escapeHtml(opts.mailingAddress)}</p>
    </div>
  `;

  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(content.subject)}</title>
</head>
<body style="margin:0;padding:24px 0;background:#e5e5e5;-webkit-text-size-adjust:100%;">
<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${escapeHtml(content.previewText)}</span>
<div style="max-width:600px;margin:0 auto;">
${content.innerHtml}
</div>
${footer}
</body></html>`;
}
