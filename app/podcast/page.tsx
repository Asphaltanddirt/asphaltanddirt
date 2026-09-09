import type { Metadata } from "next";
import Link from "next/link";
import PlatformGrid from "@/components/PlatformGrid";
import EmailCaptureForm from "@/components/EmailCaptureForm";
import { fetchLatestFromPlaylist, TRAIL_EVENT_VIDEOS_PLAYLIST_ID } from "@/lib/youtube";
import { excerpt } from "@/lib/text";

export const metadata: Metadata = {
  title: "Podcast",
  description: "Built street rides. Trail culture. Real events. Real talk. The Asphalt & Dirt podcast — launching soon.",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function PodcastIndexPage() {
  const latestVideos = await fetchLatestFromPlaylist(TRAIL_EVENT_VIDEOS_PLAYLIST_ID, 3);

  return (
    <>
      <section className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/podcast/hero-bg.jpg"
          className="hero-bg"
          alt="Recording setup with a mic and mixer in a garage doorway, a Jeep and Mustang parked outside"
        />
        <div className="hero-scrim" />
        <div className="container hero-inner">
          <div className="hero-content">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/podcast/logo.png"
              alt="Asphalt &amp; Dirt Podcast"
              style={{ width: "100%", maxWidth: 400, height: "auto", marginBottom: "var(--sp-3)" }}
            />
            <h3 className="subhead-line">Built Street Rides. Trail Culture. Real Events. Real Talk.</h3>
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
            <EmailCaptureForm source="podcast" buttonText="Notify Me" />
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

      <section className="section-pt-tight section-pb-tight">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">Latest Trail &amp; Event Videos</div>
          </div>
          {latestVideos.length ? (
            <div className="grid grid-3">
              {latestVideos.map((video) => (
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
                    <div className="badge-outline">{formatDate(video.publishedAt)}</div>
                    <h3>{video.title}</h3>
                    <p>{excerpt(video.description)}</p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="mb-0">Videos drop soon &mdash; check back here or subscribe above so you don&apos;t miss one.</p>
          )}
        </div>
      </section>

      <section className="section-alt section-pt-tight" id="watch-listen">
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
    </>
  );
}
