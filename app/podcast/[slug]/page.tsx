import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { episodes, getEpisodeBySlug, getRelatedEpisodes } from "@/lib/episodes";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import PlatformLinks from "@/components/PlatformLinks";
import Transcript from "@/components/Transcript";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return episodes.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const episode = getEpisodeBySlug(slug);
  if (!episode) return {};

  const url = `${SITE_URL}/podcast/${episode.slug}`;
  return {
    title: episode.title,
    description: episode.description,
    alternates: { canonical: url },
    openGraph: {
      title: episode.title,
      description: episode.description,
      url,
      type: "article",
      images: [{ url: episode.artwork.src, alt: episode.artwork.alt }],
    },
    twitter: {
      card: "summary_large_image",
      title: episode.title,
      description: episode.description,
      images: [episode.artwork.src],
    },
  };
}

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const episode = getEpisodeBySlug(slug);
  if (!episode) notFound();

  const related = getRelatedEpisodes(episode);
  const publishedDate = new Date(episode.publicationDate);
  const formattedDate = publishedDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    name: episode.title,
    datePublished: episode.publicationDate,
    description: episode.description,
    url: `${SITE_URL}/podcast/${episode.slug}`,
    image: episode.artwork.src,
    ...(episode.youtubeVideoId
      ? {
          associatedMedia: {
            "@type": "VideoObject",
            name: episode.title,
            description: episode.description,
            thumbnailUrl: episode.artwork.src,
            uploadDate: episode.publicationDate,
            embedUrl: `https://www.youtube-nocookie.com/embed/${episode.youtubeVideoId}`,
          },
        }
      : {}),
    partOfSeries: {
      "@type": "PodcastSeries",
      name: "Asphalt & Dirt",
      url: SITE_URL,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section>
        <div className="container">
          <Link href="/podcast" className="back-link mb-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 6-6 6 6 6" />
            </svg>
            Back To Podcast
          </Link>

          <div className="two-col mt-4" style={{ alignItems: "center" }}>
            <div>
              <div className="eyebrow accent">Podcast Episode</div>
              <h1 className="mt-2" style={{ fontSize: "clamp(32px,5vw,52px)" }}>{episode.title}</h1>
              <div className="episode-meta mt-2">
                <span>{formattedDate}</span>
              </div>
              <p className="lead mt-2">{episode.description}</p>

              <div className="episode-actions">
                <a href="#audio-section" className="btn btn-primary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 13a9 9 0 0 1 18 0" /><rect x="3" y="13" width="4" height="7" rx="1.5" /><rect x="17" y="13" width="4" height="7" rx="1.5" />
                  </svg>
                  Listen
                </a>
                <a href="#video-section" className="btn btn-outline">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  Watch
                </a>
              </div>
            </div>
            <div className="build-thumb" style={{ aspectRatio: "16/9", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={episode.artwork.src} alt={episode.artwork.alt} />
            </div>
          </div>
        </div>
      </section>

      <section className="section-alt audio-section" id="audio-section">
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="eyebrow">Listen</div>
          {episode.riversideEmbedUrl ? (
            <iframe
              src={episode.riversideEmbedUrl}
              title={`${episode.title} — audio player`}
              style={{ width: "100%", height: 200, border: 0, borderRadius: "var(--radius-md)", marginTop: 16 }}
              allow="autoplay"
            />
          ) : (
            <div className="audio-placeholder mt-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 13a9 9 0 0 1 18 0" /><rect x="3" y="13" width="4" height="7" rx="1.5" /><rect x="17" y="13" width="4" height="7" rx="1.5" />
              </svg>
              <p>Audio player coming soon. This episode hasn&apos;t been published on Riverside yet &mdash; once it is, the player embeds right here.</p>
            </div>
          )}

          <div className="eyebrow mt-6">Listen On Your Favorite Platform</div>
          <div className="mt-3">
            <PlatformLinks episode={episode} />
          </div>
        </div>
      </section>

      {episode.youtubeVideoId && (
        <section className="video-section" id="video-section">
          <div className="container" style={{ maxWidth: 900 }}>
            <div className="eyebrow">Watch</div>
            <div className="mt-3">
              <YouTubeEmbed
                videoId={episode.youtubeVideoId}
                title={episode.title}
                eventContext={`episode:${episode.slug}`}
              />
            </div>
            <div className="mt-3" style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
              <a
                href={`https://www.youtube.com/watch?v=${episode.youtubeVideoId}`}
                target="_blank"
                rel="noopener"
                className="btn btn-primary"
                style={{ whiteSpace: "normal", textAlign: "center" }}
              >
                Watch, Subscribe &amp; Comment On YouTube
              </a>
              {episode.youtubePlaylistUrl && (
                <a href={episode.youtubePlaylistUrl} target="_blank" rel="noopener" className="view-all">
                  View Full Episode Playlist
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {episode.showNotes && (
        <section className="section-alt">
          <div className="container" style={{ maxWidth: 760 }}>
            <div className="eyebrow">Show Notes</div>
            <p className="mt-3" style={{ whiteSpace: "pre-wrap" }}>{episode.showNotes}</p>
          </div>
        </section>
      )}

      {episode.transcript && (
        <section className={episode.showNotes ? undefined : "section-alt"}>
          <div className="container" style={{ maxWidth: 760 }}>
            <div className="eyebrow">Episode Transcript</div>
            <div className="mt-3">
              <Transcript text={episode.transcript} />
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="container two-col">
          <div>
            <div className="eyebrow">Sponsor This Episode</div>
            <div className="sponsor-block mt-3">
              {episode.sponsors?.length
                ? episode.sponsors.map((s) => (
                    <div key={s.name}>
                      <strong>{s.name}</strong>
                      {s.disclosure && <p className="mt-2 mb-0">{s.disclosure}</p>}
                    </div>
                  ))
                : "Sponsor spot available on this episode. Reach out to advertise here."}
            </div>
          </div>
          <div>
            <div className="eyebrow">More From Asphalt &amp; Dirt</div>
            <div className="event-promo mt-3">
              Shop the merch, submit your build, or catch up on the latest trail rides &mdash; all in the nav above.
            </div>
          </div>
        </div>
      </section>

      <section className="section-alt">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">Related Episodes</div>
            <Link href="/podcast" className="view-all">
              View All Episodes
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
          </div>
          {related.length ? (
            <div className="grid grid-3">
              {related.map((r) => (
                <Link key={r.slug} href={`/podcast/${r.slug}`} className="card">
                  <div className="card-media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.artwork.src} alt={r.artwork.alt} />
                  </div>
                  <div className="card-body">
                    <h3>{r.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mb-0">More episodes drop soon &mdash; check back here or subscribe above so you don&apos;t miss one.</p>
          )}
        </div>
      </section>
    </>
  );
}
