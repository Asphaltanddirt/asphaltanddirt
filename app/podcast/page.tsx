import type { Metadata } from "next";
import Link from "next/link";
import PlatformGrid from "@/components/PlatformGrid";
import { getEpisodeByYoutubeId } from "@/lib/episodes";
import {
  fetchLatestFromPlaylist,
  PODCAST_EPISODES_PLAYLIST_ID,
  TRAIL_EVENT_VIDEOS_PLAYLIST_ID,
} from "@/lib/youtube";
import { excerpt } from "@/lib/text";

export const metadata: Metadata = {
  title: "Podcast",
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
                      <p>{excerpt(video.description)}</p>
                      {internal && (
                        <Link href={`/podcast/${internal.slug}`} className="view-all" style={{ fontSize: 12 }}>
                          Read More
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                        </Link>
                      )}
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
            <p className="mb-0">Videos drop soon &mdash; check back here or subscribe below so you don&apos;t miss one.</p>
          )}
        </div>
      </section>

      <section className="section-alt section-pt-tight" id="watch-listen">
        <div className="container">
          <div className="eyebrow">Watch &amp; Listen</div>
          <p className="mt-4">
            Catch Asphalt &amp; Dirt on your favorite platforms &mdash; we go live on YouTube and
            other platforms for live Q&amp;A, real talk, event drops, and more. Follow us and turn
            on notifications so you never miss a drop.
          </p>
          <div className="mt-4">
            <PlatformGrid compact />
          </div>
        </div>
      </section>
    </>
  );
}
