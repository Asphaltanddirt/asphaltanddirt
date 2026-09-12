import type { Metadata } from "next";
import Link from "next/link";
import PlatformGrid from "@/components/PlatformGrid";
import SubscribeButton from "@/components/SubscribeButton";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import { fetchLatestFromPlaylist } from "@/lib/youtube";

export const metadata: Metadata = {
  title: "Podcast",
  description: "Built street rides. Trail culture. Real events. Real talk. The Asphalt & Dirt podcast — launching soon.",
};

// Anthony's vlog series playlist. Labeled "YT Shorts" on the page for now —
// filled with Shorts until there are 3 real vlogs worth showing, at which
// point flip the section copy ("YT Shorts" -> "VLOG", "See All Shorts" ->
// "See All Vlogs") below. Same playlist ID either way, nothing else changes.
const VLOG_PLAYLIST_ID = "PLKHAREsF7JDw";

export default async function PodcastIndexPage() {
  const vlogVideos = await fetchLatestFromPlaylist(VLOG_PLAYLIST_ID, 3);

  return (
    <>
      <section className="hero hero-podcast">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/podcast/hero-bg.jpg"
          className="hero-bg"
          alt="Recording setup with a mic and mixer in a garage doorway, a Jeep and Mustang parked outside"
        />
        <div className="hero-scrim hero-scrim-podcast" />
        <div className="container hero-inner">
          <div className="hero-content">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/podcast/logo.png"
              alt="Asphalt &amp; Dirt Podcast"
              className="podcast-hero-logo"
            />
            <h1 className="podcast-hero-tagline">
              <span className="line">Built Street Rides.</span>
              <span className="line">Trail Culture.</span>
              <span className="line accent-text">Real Events. Real Talk.</span>
            </h1>
          </div>
        </div>
      </section>

      <section className="section-alt section-pb-tight">
        <div className="container" style={{ maxWidth: 620, marginInline: "auto", textAlign: "center" }}>
          <div className="eyebrow accent">The Podcast</div>
          <h2 className="mt-2">First Episodes Coming Soon</h2>
          <p className="lead mt-3">
            The show&apos;s in production right now. First episodes drop this September &mdash; join
            the newsletter and we&apos;ll tell you the moment they&apos;re live.
          </p>
          <div className="mt-4" style={{ display: "flex", justifyContent: "center" }}>
            <SubscribeButton source="podcast" label="Notify Me" returnTo="/podcast" />
          </div>
          <p className="mt-4" style={{ fontSize: 13, marginBottom: 0 }}>
            <Link
              href="/podcast/asphalt-and-dirt-official-trailer"
              className="view-all"
              style={{ justifyContent: "center" }}
            >
              Watch the official trailer
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
          </p>
        </div>
      </section>

      <section className="section-alt section-pt-tight section-pb-tight" id="watch-listen">
        <div className="container">
          <div className="eyebrow">Watch &amp; Listen</div>
          <p className="mt-4">
            Catch Asphalt &amp; Dirt on your favorite platforms &mdash; we go live on YouTube and
            other platforms for live Q&amp;A, real talk, event drops, and more. Follow us and
            turn&nbsp;on&nbsp;notifications so you never miss a drop.
          </p>
          <div className="mt-4">
            <PlatformGrid compact />
          </div>
        </div>
      </section>

      <section className="section-pt-tight section-pb-tight">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">YT Shorts</div>
            <a href={`https://www.youtube.com/playlist?list=${VLOG_PLAYLIST_ID}`} target="_blank" rel="noopener" className="view-all">
              See All Shorts
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </a>
          </div>
          {vlogVideos.length ? (
            <div className="grid grid-3">
              {vlogVideos.map((video) => (
                <div className="card" key={video.videoId}>
                  <YouTubeEmbed
                    videoId={video.videoId}
                    title={video.title}
                    thumbnail={video.thumbnail}
                    eventContext="podcast_shorts"
                    vertical
                  />
                  <div className="card-body" style={{ padding: "var(--sp-2)" }}>
                    <h3 style={{ fontSize: 14 }}>{video.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mb-0">Shorts drop soon &mdash; check back here or subscribe above so you don&apos;t miss one.</p>
          )}
        </div>
      </section>
    </>
  );
}
