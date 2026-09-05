import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { episodes, getEpisodeBySlug, getRelatedEpisodes } from "@/lib/episodes";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import PlatformLinks from "@/components/PlatformLinks";
import Transcript from "@/components/Transcript";
import ExpandableSection from "@/components/ExpandableSection";
import BuzzsproutPlayer from "@/components/BuzzsproutPlayer";
import GuestRow from "@/components/GuestRow";
import ShareEpisodeButton from "@/components/ShareEpisodeButton";
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

  const guests = episode.guests ?? [];
  const hasGuests = guests.length > 0;
  const episodeUrl = `${SITE_URL}/podcast/${episode.slug}`;

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

          <div className="episode-hero-grid mt-4">
            <div>
              {episode.youtubeVideoId ? (
                <YouTubeEmbed
                  videoId={episode.youtubeVideoId}
                  title={episode.title}
                  eventContext={`episode:${episode.slug}`}
                />
              ) : (
                <div className="video-frame">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={episode.artwork.src} alt={episode.artwork.alt} />
                </div>
              )}
              {episode.youtubeVideoId && (
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
              )}
            </div>

            <div className="episode-hero-info">
              <div className="eyebrow accent">Podcast Episode</div>
              <h1 className="mt-2">{episode.title}</h1>
              <div className="episode-meta mt-2">
                <span>{formattedDate}</span>
              </div>
              <p className="lead mt-2">{episode.description}</p>
              <PlatformLinks episode={episode} variant="icons" />
            </div>
          </div>

          <div className="episode-audio-strip mt-4">
            {episode.buzzsproutEpisodeId ? (
              <BuzzsproutPlayer episodeId={episode.buzzsproutEpisodeId} />
            ) : episode.riversideEmbedUrl ? (
              <iframe
                src={episode.riversideEmbedUrl}
                title={`${episode.title} — audio player`}
                style={{ width: "100%", height: 200, border: 0, borderRadius: "var(--radius-md)" }}
                allow="autoplay"
              />
            ) : (
              <div className="audio-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 13a9 9 0 0 1 18 0" /><rect x="3" y="13" width="4" height="7" rx="1.5" /><rect x="17" y="13" width="4" height="7" rx="1.5" />
                </svg>
                <p>Audio player coming soon. This episode hasn&apos;t been published on Buzzsprout yet &mdash; once it is, the player embeds right here.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {(episode.showNotes || episode.transcript) && (
        <section className="section-alt">
          <div className="container" style={{ maxWidth: 760 }}>
            {episode.showNotes && (
              <ExpandableSection summary="Read Full Description">
                <p style={{ whiteSpace: "pre-wrap" }}>{episode.showNotes}</p>
              </ExpandableSection>
            )}
            {episode.transcript && (
              <div className={episode.showNotes ? "mt-4" : undefined}>
                <Transcript text={episode.transcript} />
              </div>
            )}
          </div>
        </section>
      )}

      {hasGuests && (
        <section>
          <div className="container">
            <div className="eyebrow">{guests.length > 1 ? "Featured Guests" : "Featured Guest"}</div>
            <div className="mt-3" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {guests.map((g) => (
                <GuestRow key={g.name} guest={g} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className={hasGuests ? "section-alt" : undefined}>
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
            <div className="eyebrow">Hype This Episode</div>
            <div className="event-promo mt-3" style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
              <p className="mb-0">Loved this one? A like, a comment, or a share on YouTube goes a long way.</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {episode.youtubeVideoId && (
                  <a
                    href={`https://www.youtube.com/watch?v=${episode.youtubeVideoId}`}
                    target="_blank"
                    rel="noopener"
                    className="btn btn-primary btn-sm"
                  >
                    Like &amp; Comment On YouTube
                  </a>
                )}
                <ShareEpisodeButton url={episodeUrl} title={episode.title} />
              </div>
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
