import type { Metadata } from "next";
import SubscribeButton from "@/components/SubscribeButton";
import TestimonialGrid from "@/components/TestimonialGrid";
import { socialLinks } from "@/lib/social";
import Link from "next/link";
import { fetchLatestFromPlaylist, TRAIL_EVENT_VIDEOS_PLAYLIST_ID } from "@/lib/youtube";
import { getPublishedEvents } from "@/lib/events";
import { getEpisodeByYoutubeId } from "@/lib/episodes";
import { getApprovedTestimonials } from "@/lib/testimonials";
import { getPostBySlug } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Community",
  description: "Real people. Real rides. Real stories from the trail and the street.",
};

// Fallback photo for events that don't have one uploaded in Airtable yet.
const EVENT_FALLBACK_IMAGE = { src: "/img/community/pine-barrens.jpg", alt: "Jeeps on a Pine Barrens trail ride" };

function formatEventDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function excerpt(text: string, maxLength = 140) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, clean.lastIndexOf(" ", maxLength)) + "…";
}

const PLATFORMS = [
  {
    name: "Facebook",
    url: socialLinks.facebook,
    icon: <path d="M14 8.5h2.5V5H14c-2 0-3.5 1.5-3.5 3.5V11H8v3.5h2.5V21h3.5v-6.5h2.5l.5-3.5h-3V9c0-.5.3-.5.5-.5z" />,
  },
  {
    name: "Instagram",
    url: socialLinks.instagram,
    icon: <><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" /></>,
  },
  {
    name: "TikTok",
    url: socialLinks.tiktok,
    icon: <path d="M13 3v11.5a3 3 0 1 1-2.4-2.9M13 3c.4 2.4 2 4 4.5 4.3" />,
  },
  {
    name: "YouTube",
    url: socialLinks.youtube,
    icon: <><rect x="2.5" y="6" width="19" height="12" rx="3" /><path d="M10.5 9.5v5l4.5-2.5z" fill="currentColor" stroke="none" /></>,
  },
  {
    name: "X",
    url: socialLinks.x,
    icon: <path d="M4 4l16 16M20 4 4 20" />,
  },
];

export default async function CommunityPage() {
  const [recaps, { upcoming: upcomingEvents }, testimonials] = await Promise.all([
    fetchLatestFromPlaylist(TRAIL_EVENT_VIDEOS_PLAYLIST_ID, 3),
    getPublishedEvents(),
    getApprovedTestimonials(3, "community"),
  ]);
  const nextEvent = upcomingEvents[0];
  const featuredPost = getPostBySlug("why-community-rides-matter");

  return (
    <>
      <section className="hero hero-with-quote">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/community/hero.jpg"
          className="hero-bg"
          alt="Community gathered around a campfire beside their Jeeps at sunset"
        />
        <div className="hero-scrim" />
        <div className="container hero-inner">
          <div className="hero-content hero-quote-shift">
            <h1>
              <span className="line">Join The <span className="accent-text">Movement</span></span>
            </h1>
            <h3 className="subhead-line mt-2">No Egos. No Clubs. A Culture Around Community.</h3>
            <p className="lead mt-4">
              What started as funny videos and talking smack about builds turned into a real
              community — real people, real rides, real stories from the trail and the street.
            </p>
            <div style={{ maxWidth: 440 }}>
              <SubscribeButton source="community_hero" label="I Want In" returnTo="/community" />
            </div>
          </div>
        </div>

        {/* Desktop: positioned independently of hero-content so its size/
         *  placement isn't tied to the left column's height — sits in the
         *  open area of the hero image, bottom-center. Mobile: falls back to
         *  a normal stacked block (see .hero-quote-overlay media query). */}
        <div className="container hero-quote-overlay">
          <blockquote className="hero-quote-card">
            &ldquo;This community is the entire reason Asphalt &amp; Dirt is a thing at all.
            Not the podcast, not the builds, not us.{" "}
            <span style={{ color: "var(--accent)" }}>YOU!</span>&rdquo;
          </blockquote>
        </div>
      </section>

      <div className="container">
        <div className="feature-strip">
          {PLATFORMS.map((platform) => (
            <a
              key={platform.name}
              href={platform.url}
              target="_blank"
              rel="noopener"
              className="feature-item"
              aria-label={platform.name}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{platform.icon}</svg>
              <span>{platform.name}</span>
            </a>
          ))}
        </div>
      </div>

      <section className="section-pt-tight section-pb-tight">
        <div className="container">
          <div className="eyebrow accent">How This Started</div>
          <h2 className="mt-2">Two Guys, Some Jeeps, No Real Plan</h2>
          <p className="mt-4" style={{ fontSize: 17, maxWidth: "none" }}>
            The plan — and we use that term loosely — was to film some funny TikToks, talk smack
            about each other&apos;s builds, and not take any of it too seriously. That was the
            whole pitch. In under 6 weeks, this turned into almost 100 of you: people who didn&apos;t
            know each other a month ago, now showing up to meetups, trading numbers, helping
            strangers fix their rigs in the middle of nowhere, becoming actual friends.
          </p>
          <p>
            We built a group chat to talk crap in and it turned into a community we genuinely
            love. None of it happens without the crew putting in the work behind the scenes
            either — Dan, Jack, and Christina&apos;s hours are the reason any of this exists, same
            as every one of you who showed up.
          </p>
        </div>
      </section>

      <section className="section-pb-tight">
        <div className="container">
          <div className="grid grid-2">
            {featuredPost && (
              <div>
                <div className="eyebrow">From The Blog</div>
                <Link href={`/blog/${featuredPost.slug}`} className="card mt-2" style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 16, alignItems: "center", padding: 16 }}>
                  <div className="card-media" style={{ borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={featuredPost.image.src} alt={featuredPost.image.alt} />
                  </div>
                  <div>
                    <h3 className="mb-2" style={{ fontSize: 18 }}>{featuredPost.title}</h3>
                    <p className="mb-0" style={{ fontSize: 13 }}>
                      Placeholder — a piece on our own journey is coming.
                    </p>
                  </div>
                </Link>
                <p className="mt-2 mb-0">
                  <Link href="/blog/all" className="view-all">
                    See All Posts
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </Link>
                </p>
              </div>
            )}

            <div>
              <div className="eyebrow">Next Up</div>
              {nextEvent ? (
                <div className="card mt-2" style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 16, alignItems: "center", padding: 16 }}>
                  <div className="card-media" style={{ borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                    <span className="badge">{formatEventDate(nextEvent.date)}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={nextEvent.photoUrl || EVENT_FALLBACK_IMAGE.src}
                      alt={nextEvent.photoUrl ? nextEvent.title : EVENT_FALLBACK_IMAGE.alt}
                    />
                  </div>
                  <div>
                    <h3 className="mb-2" style={{ fontSize: 18 }}>{nextEvent.title}</h3>
                    <Link href={`/events/${nextEvent.slug}`} className="btn btn-primary btn-sm">
                      Details &amp; RSVP
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="mt-2 mb-0">
                  No events on the books right now &mdash; check back here, or{" "}
                  <a href={socialLinks.facebook} target="_blank" rel="noopener">join the FB group</a>.
                </p>
              )}
              <p className="mt-2 mb-0">
                <Link href="/events" className="view-all">
                  See All Events &amp; RSVP
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {testimonials.length > 0 && (
        <section className="section-alt section-pt-tight section-pb-tight">
          <div className="container">
            <div className="section-head"><div className="eyebrow">What Our Community Says</div></div>
            <TestimonialGrid testimonials={testimonials} />
          </div>
        </section>
      )}

      <section className="section-pt-tight section-pb-tight">
        <div className="container" style={{ textAlign: "center", maxWidth: 560, marginInline: "auto" }}>
          <div className="eyebrow accent">Been Part Of It?</div>
          <h2 className="mt-2">Leave A Review</h2>
          <p className="lead mt-2">
            The podcast, an event, or just being in the community &mdash; if Asphalt &amp; Dirt&apos;s
            been good to you, tell us. Approved reviews get featured on the site.
          </p>
          <a href="/reviews/submit" className="btn btn-primary btn-sm mt-3">Leave A Review</a>
        </div>
      </section>

      <section className="section-alt section-pt-tight">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">Ride Recaps &amp; Highlights</div>
            <a href={`https://www.youtube.com/playlist?list=${TRAIL_EVENT_VIDEOS_PLAYLIST_ID}`} target="_blank" rel="noopener" className="view-all">
              View All Recaps
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </a>
          </div>
          {recaps.length ? (
            <div className="grid grid-3">
              {recaps.map((video) => {
                const internal = getEpisodeByYoutubeId(video.videoId);
                const cardBody = (
                  <>
                    <div className="card-media">
                      <div className="play-overlay">
                        <div className="play-circle">
                          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                        </div>
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={video.thumbnail} alt={video.title} />
                    </div>
                    <div className="card-body">
                      <h3>{video.title}</h3>
                      <p>{excerpt(video.description)}</p>
                    </div>
                  </>
                );
                return internal ? (
                  <Link className="card" key={video.videoId} href={`/podcast/${internal.slug}`}>
                    {cardBody}
                  </Link>
                ) : (
                  <a className="card" key={video.videoId} href={video.url} target="_blank" rel="noopener">
                    {cardBody}
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="mb-0">Recaps drop soon &mdash; check back here or subscribe above so you don&apos;t miss one.</p>
          )}
        </div>
      </section>

      {/* "Friends Of The Channel" logo strip removed 2026-09-09 — placeholder
       *  brand names, no real partnership. A "Sponsors" section lands here
       *  once there's something real to show. */}
    </>
  );
}
