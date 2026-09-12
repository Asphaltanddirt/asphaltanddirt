import type { Metadata } from "next";
import HeroCTAGroup from "@/components/HeroCTAGroup";
import TestimonialGrid from "@/components/TestimonialGrid";
import SocialProofGrid from "@/components/SocialProofGrid";
import { socialLinks } from "@/lib/social";
import { getApprovedTestimonials } from "@/lib/testimonials";
import { getApprovedSocialProof } from "@/lib/socialProof";
import { getCommunityPhotos } from "@/lib/events";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Community",
  description: "Real people. Real rides. Real stories from the trail and the street.",
};

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
  const [testimonials, socialProof, communityPhotos] = await Promise.all([
    getApprovedTestimonials(3, "community"),
    getApprovedSocialProof(8),
    getCommunityPhotos(12),
  ]);

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
            <HeroCTAGroup source="community_hero" returnTo="/community" />
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

      {communityPhotos.length > 0 && (
        <section className="section-pb-tight">
          <div className="container">
            <div className="section-head">
              <div className="eyebrow">Real People, Real Rides</div>
              <Link href="/events/all" className="view-all">
                See All Events
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>
            </div>
            <div className="community-gallery">
              {communityPhotos.map((photo, i) => (
                <Link
                  key={`${photo.url}-${i}`}
                  href={`/events/${photo.eventSlug}`}
                  className="community-gallery-item"
                  title={photo.eventTitle}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={photo.alt} loading="lazy" />
                  <span className="community-gallery-caption">{photo.eventTitle}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {testimonials.length > 0 && (
        <section className="section-alt section-pt-tight section-pb-tight">
          <div className="container">
            <div className="section-head"><div className="eyebrow">What Our Community Says</div></div>
            <TestimonialGrid testimonials={testimonials} />
          </div>
        </section>
      )}

      {socialProof.length > 0 && (
        <section className="section-pt-tight section-pb-tight">
          <div className="container">
            <div className="section-head">
              <div className="eyebrow">Tag Us On TikTok To Be Featured</div>
            </div>
            <SocialProofGrid posts={socialProof} />
          </div>
        </section>
      )}

      {/* "Friends Of The Channel" logo strip removed 2026-09-09 — placeholder
       *  brand names, no real partnership. A "Sponsors" section lands here
       *  once there's something real to show. */}
    </>
  );
}
