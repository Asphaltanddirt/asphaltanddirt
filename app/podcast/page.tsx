import type { Metadata } from "next";
import Link from "next/link";
import PlatformGrid from "@/components/PlatformGrid";
import { getEpisodeByYoutubeId } from "@/lib/episodes";
import {
  fetchLatestFromPlaylist,
  PODCAST_EPISODES_PLAYLIST_ID,
  TRAIL_EVENT_VIDEOS_PLAYLIST_ID,
} from "@/lib/youtube";

export const metadata: Metadata = {
  title: "Podcast | Asphalt & Dirt",
  description: "Built street rides. Trail culture. Real events. Real talk.",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function PodcastIndexPage() {
  const [latestEpisodes, latestVideos] = await Promise.all([
    fetchLatestFromPlaylist(PODCAST_EPISODES_PLAYLIST_ID, 3),
    fetchLatestFromPlaylist(TRAIL_EVENT_VIDEOS_PLAYLIST_ID, 3),
  ]);

  return (
    <>
      <section className="hero">
        <video className="hero-bg" poster="/img/podcast/hero.jpg" autoPlay muted loop playsInline>
          <source src="/video/intro.mp4" type="video/mp4" />
        </video>
        <div className="hero-scrim" />
        <div className="container hero-inner">
          <div className="hero-content">
            <div className="eyebrow accent">Intro Video</div>
            <h1 className="mt-2">
              <span className="line">This Is</span>
              <span className="line accent-text">Asphalt</span>
              <span className="line">&amp; Dirt</span>
            </h1>
            <p className="lead mt-2">
              Built street rides. Trail culture.
              <br />
              Real events. Real talk.
            </p>
          </div>
        </div>
      </section>

      <section className="section-alt">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">Latest Podcast Episodes</div>
          </div>
          {latestEpisodes.length ? (
            <div className="grid grid-3">
              {latestEpisodes.map((video) => {
                const internal = getEpisodeByYoutubeId(video.videoId);
                return (
                  <div className="card" key={video.videoId}>
                    <div className="card-media">
                      <span className="badge">{formatDate(video.publishedAt)}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={video.thumbnail} alt={video.title} />
                    </div>
                    <div className="card-body">
                      <h3>{video.title}</h3>
                      <p>{video.description.split("\n")[0]}</p>
                      <div className="card-actions">
                        {internal ? (
                          <Link href={`/podcast/${internal.slug}`} className="btn btn-primary btn-sm">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg> Watch Now
                          </Link>
                        ) : (
                          <a href={video.url} target="_blank" rel="noopener" className="btn btn-primary btn-sm">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg> Watch Now
                          </a>
                        )}
                        <a href="#watch-listen" className="btn btn-outline btn-sm">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13a9 9 0 0 1 18 0" /><rect x="3" y="13" width="4" height="7" rx="1.5" /><rect x="17" y="13" width="4" height="7" rx="1.5" /></svg> Listen
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mb-0">Episodes drop soon &mdash; check back here or subscribe below so you don&apos;t miss one.</p>
          )}
        </div>
      </section>

      <section>
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
                    <p>{video.description.split("\n")[0]}</p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="mb-0">Videos drop soon &mdash; check back here or subscribe below so you don&apos;t miss one.</p>
          )}
        </div>
      </section>

      <section className="section-alt" id="watch-listen">
        <div className="container">
          <div className="eyebrow">Watch &amp; Listen</div>
          <p className="mt-3" style={{ maxWidth: "60ch" }}>
            Catch Asphalt &amp; Dirt on your favorite platforms. We go live on YouTube and other
            platforms. Follow us so you never miss a drop.
          </p>
          <div className="mt-4">
            <PlatformGrid compact />
          </div>
        </div>
        <div className="container mt-4">
          <div className="card" style={{ borderColor: "var(--accent)", flexDirection: "row", alignItems: "center", gap: 16, padding: "18px 24px" }}>
            <span className="badge-outline" style={{ fontSize: 14 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></svg> We Go Live On YouTube &amp; Other Platforms
            </span>
            <p className="mb-0" style={{ marginLeft: "auto" }}>
              Live Q&amp;A, Real Talk, Event Drops, and More. Turn on notifications so you never miss it.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
