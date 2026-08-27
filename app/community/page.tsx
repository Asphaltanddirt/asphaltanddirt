import type { Metadata } from "next";
import EmailCaptureForm from "@/components/EmailCaptureForm";
import { socialLinks } from "@/lib/social";
import { fetchLatestFromPlaylist, TRAIL_EVENT_VIDEOS_PLAYLIST_ID } from "@/lib/youtube";

export const metadata: Metadata = {
  title: "Community | Asphalt & Dirt",
  description: "Real people. Real rides. Real stories from the trail and the street.",
};

const EVENTS = [
  {
    date: "Jun 8, 2025",
    image: { src: "/img/community/pine-barrens.jpg", alt: "Jeeps on a Pine Barrens trail ride" },
    title: "Pine Barrens Community Ride",
    description: "Scenic trails, good people, and unforgettable views through the heart of the Pine Barrens.",
    location: "Pine Barrens, NJ",
  },
  {
    date: "Jun 21, 2025",
    image: { src: "/img/community/summer-night.jpg", alt: "Jeeps gathered under string lights at night" },
    title: "Summer Night Meet-Up",
    description: "Join us for a laid-back evening of rigs, food, music, and good vibes.",
    location: "Lake Hopatcong, NJ",
  },
  {
    date: "Jul 12, 2025",
    image: { src: "/img/community/trail-cleanup.jpg", alt: "Volunteers cleaning up a trail" },
    title: "Trail Cleanup & Ride Day",
    description: "Give back to our trails and enjoy a day of riding with the community.",
    location: "TBD",
  },
];

const PLATFORMS = [
  {
    name: "Facebook",
    color: "#1877F2",
    url: socialLinks.facebook,
    cta: "Follow",
    description: "Events, trails & updates",
    icon: <path d="M14 8.5h2.5V5H14c-2 0-3.5 1.5-3.5 3.5V11H8v3.5h2.5V21h3.5v-6.5h2.5l.5-3.5h-3V9c0-.5.3-.5.5-.5z" />,
  },
  {
    name: "Instagram",
    color: "#E1306C",
    url: socialLinks.instagram,
    cta: "Follow",
    description: "Daily builds & reels",
    icon: <><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" /></>,
  },
  {
    name: "TikTok",
    color: undefined,
    url: socialLinks.tiktok,
    cta: "Follow",
    description: "Shorts & behind the scenes",
    icon: <path d="M13 3v11.5a3 3 0 1 1-2.4-2.9M13 3c.4 2.4 2 4 4.5 4.3" />,
  },
  {
    name: "YouTube",
    color: "#FF0000",
    url: socialLinks.youtube,
    cta: "Subscribe",
    description: "Ride recaps & videos",
    icon: <><rect x="2.5" y="6" width="19" height="12" rx="3" /><path d="M10.5 9.5v5l4.5-2.5z" fill="currentColor" stroke="none" /></>,
  },
  {
    name: "X",
    color: undefined,
    url: socialLinks.x,
    cta: "Follow",
    description: "Updates & conversation",
    icon: <path d="M4 4l16 16M20 4 4 20" />,
  },
];

export default async function CommunityPage() {
  const recaps = await fetchLatestFromPlaylist(TRAIL_EVENT_VIDEOS_PLAYLIST_ID, 3);

  return (
    <>
      <section className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/community/hero.jpg"
          className="hero-bg"
          alt="Community gathered around a campfire beside their Jeeps at sunset"
        />
        <div className="hero-scrim" />
        <div className="container hero-inner">
          <div className="hero-content">
            <h1>
              <span className="line">Join The</span>
              <span className="line accent-text">Movement</span>
            </h1>
            <p className="lead">Real people. Real rides. Real stories from the trail and the street.</p>
            <p>
              From community rides and event coverage to member stories, recaps, and behind-the-scenes
              moments, this is where Asphalt &amp; Dirt comes together.
            </p>
            <div style={{ maxWidth: 440 }}>
              <EmailCaptureForm
                source="community_hero"
                buttonText="I Want In"
                placeholder="Your email gets you in."
                className="capture-form"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="feature-strip">
          <div className="feature-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16V11l2.2-4.4A2 2 0 0 1 8 5.5h8a2 2 0 0 1 1.8 1.1L20 11v5" /><path d="M4 16h16v3H4z" /><circle cx="8" cy="19" r="1.4" /><circle cx="16" cy="19" r="1.4" /></svg>
            <span>Community<br />Rides</span>
          </div>
          <div className="feature-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-2h6l2 2h3v11H4z" /><circle cx="12" cy="13.5" r="3.3" /></svg>
            <span>Event<br />Coverage</span>
          </div>
          <div className="feature-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 2.7 5.9 6.3.6-4.8 4.3 1.4 6.2L12 16.9 6.4 20l1.4-6.2L3 9.5l6.3-.6z" /></svg>
            <span>Member<br />Spotlights</span>
          </div>
          <div className="feature-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 19 9 8l4 6.5L15 11l6 8z" /></svg>
            <span>Trail<br />Stories</span>
          </div>
          <div className="feature-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="9" width="18" height="4" rx=".5" /><rect x="5" y="13" width="14" height="8" /><path d="M12 9v12M12 9C10 5 6 5 6 7.5S9 9 12 9zM12 9c2-4 6-4 6-1.5S15 9 12 9z" /></svg>
            <span>Giveaways<br />&amp; Perks</span>
          </div>
        </div>
      </div>

      <section className="section-pb-tight">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">Latest Events &amp; Rides</div>
          </div>
          <div className="grid grid-3">
            {EVENTS.map((event) => (
              <div className="card" key={event.title}>
                <div className="card-media">
                  <span className="badge">{event.date}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={event.image.src} alt={event.image.alt} />
                </div>
                <div className="card-body">
                  <h3>{event.title}</h3>
                  <p>{event.description}</p>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-dim)" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s7-6.3 7-12a7 7 0 0 0-14 0c0 5.7 7 12 7 12z" /><circle cx="12" cy="10" r="2.4" /></svg>
                    {event.location}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-alt section-pt-tight section-pb-tight">
        <div className="container">
          <div className="section-head"><div className="eyebrow">What Our Community Says</div></div>
          <div className="grid grid-3">
            <div className="testimonial">
              <span className="quote-mark">&ldquo;</span>
              <div className="stars">★★★★★</div>
              <p>The rides, the people, the memories&mdash;this community is second to none. I&apos;ve made lifelong friends through Asphalt &amp; Dirt.</p>
              <div className="testimonial-foot">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="avatar" src="/img/home/avatar-community.jpg" alt="Mike R." />
                <div>
                  <div className="testimonial-name">Mike R.</div>
                  <div className="testimonial-role">Community Member</div>
                </div>
              </div>
            </div>
            <div className="testimonial">
              <span className="quote-mark">&ldquo;</span>
              <div className="stars">★★★★★</div>
              <p>Asphalt &amp; Dirt isn&apos;t just about the rigs, it&apos;s about the people. Every event is top-notch and feels like family.</p>
              <div className="testimonial-foot">
                <div className="avatar-initial">S</div>
                <div>
                  <div className="testimonial-name">Sarah T.</div>
                  <div className="testimonial-role">Event Attendee</div>
                </div>
              </div>
            </div>
            <div className="testimonial">
              <span className="quote-mark">&ldquo;</span>
              <div className="stars">★★★★★</div>
              <p>From trail cleanups to weekend runs, this community shows up and makes a difference. Proud to be part of it.</p>
              <div className="testimonial-foot">
                <div className="avatar-initial">C</div>
                <div>
                  <div className="testimonial-name">Chris M.</div>
                  <div className="testimonial-role">Trail Leader</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pt-tight section-pb-tight">
        <div className="container">
          <div className="eyebrow">Where To Connect</div>
          <div className="grid grid-5 mt-4">
            {PLATFORMS.map((platform) => (
              <div
                className="card"
                style={{ alignItems: "center", textAlign: "center", padding: 20, gap: 12, background: "var(--bg)", border: "none" }}
                key={platform.name}
              >
                <a
                  href={platform.url}
                  target="_blank"
                  rel="noopener"
                  aria-label={`${platform.cta} on ${platform.name}`}
                  style={{ color: platform.color ?? "var(--text)" }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ width: 72, height: 72 }}>{platform.icon}</svg>
                </a>
                <span style={{ width: 40, height: 3, background: "var(--accent)", borderRadius: 2 }} />
                <p className="mb-0" style={{ fontSize: 13 }}>{platform.description}</p>
              </div>
            ))}
          </div>
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
              {recaps.map((video) => (
                <a className="card" key={video.videoId} href={video.url} target="_blank" rel="noopener">
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
                    <p>{video.description.split("\n")[0]}</p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="mb-0">Recaps drop soon &mdash; check back here or subscribe above so you don&apos;t miss one.</p>
          )}
        </div>
      </section>

      <section className="section-pt-tight">
        <div className="container">
          <div className="eyebrow">Friends Of The Channel</div>
          <div className="logo-strip mt-4">
            <div className="plate">Low Gear Co.</div>
            <div className="plate">MetalCloak</div>
            <div className="plate">Bilstein</div>
            <div className="plate">Rock Krawler</div>
            <div className="plate">AEV</div>
            <div className="plate">Mickey Thompson</div>
          </div>
        </div>
      </section>
    </>
  );
}
