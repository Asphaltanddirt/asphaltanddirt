import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EpisodeVideo from "@/components/EpisodeVideo";
import { renderTranscriptBlocks } from "@/lib/transcriptRenderer";
import { fetchPublicFromPlaylist, GARAGE_TAKES_PLAYLIST_ID } from "@/lib/youtube";
import { garageTakes, getGarageTakeBySlug, publishedGarageTakes, takeCompanionPost, takeSummaryForDisplay, takeTitleLines } from "@/lib/garageTakes";
import { SITE_URL } from "@/lib/site";

export const revalidate = 1800;

export function generateStaticParams() {
  return garageTakes.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const take = getGarageTakeBySlug(slug);
  if (!take) return {};
  return {
    title: take.title,
    description: take.summary,
    alternates: { canonical: `${SITE_URL}/garage-takes/${take.slug}` },
    openGraph: {
      title: take.title,
      description: take.summary,
      url: `${SITE_URL}/garage-takes/${take.slug}`,
      type: "video.other",
      images: [{ url: `https://i.ytimg.com/vi/${take.videoId}/maxresdefault.jpg`, alt: take.title }],
    },
  };
}

const day = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export default async function GarageTakePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const take = getGarageTakeBySlug(slug);
  if (!take) notFound();
  const post = takeCompanionPost(take);
  const all = publishedGarageTakes();
  const others = all.filter((t) => t.slug !== take.slug).slice(0, 2);
  // Up Next (Jose 10/2): the next-older take, wrapping to the newest, so the
  // panel and the end-of-video countdown always have somewhere to go.
  const at = all.findIndex((t) => t.slug === take.slug);
  const upNext = all.length > 1 ? all[(at + 1) % all.length] : undefined;
  const playlistIsPublic = (await fetchPublicFromPlaylist(GARAGE_TAKES_PLAYLIST_ID, 1)).length > 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: take.title,
    description: take.summary,
    uploadDate: take.publishedAt,
    thumbnailUrl: [`https://i.ytimg.com/vi/${take.videoId}/maxresdefault.jpg`],
    embedUrl: `https://www.youtube.com/embed/${take.videoId}`,
    url: `${SITE_URL}/garage-takes/${take.slug}`,
    publisher: { "@type": "Organization", name: "Asphalt & Dirt", url: SITE_URL },
  };

  return (
    <section className="section-pt-tight section-pb-tight">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container">
        {/* Same hub both ways (Jose 10/2): back = every video, right = just the Takes. */}
        <div className="episode-hero-topbar">
          <Link href="/videos" className="back-link mb-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
            Back To All Videos
          </Link>
          <Link href="/videos?type=takes" className="view-all">
            More Garage Takes
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
        </div>

        {/* Same layout as trail videos (Jose 10/2): player left, details and
            Up Next right. */}
        <div className="episode-hero-grid mt-4">
          <div>
            <EpisodeVideo
              videoId={take.videoId}
              title={take.title}
              eventContext="garage_take"
              upNext={
                upNext
                  ? { href: `/garage-takes/${upNext.slug}`, title: upNext.title, thumbnail: `https://i.ytimg.com/vi/${upNext.videoId}/maxresdefault.jpg` }
                  : undefined
              }
            />
          </div>
          <div className="episode-hero-info">
            <div className="eyebrow accent">Garage Take</div>
            <h1 className="mt-2">
              {takeTitleLines(take).map((line, i) => (
                <span className="title-line" key={i}>{line}</span>
              ))}
            </h1>
            <div className="episode-meta mt-2">
              <span>{day(take.publishedAt)}</span>
            </div>
            <p className="lead mt-2">{takeSummaryForDisplay(take)}</p>
            {upNext && (
              <Link href={`/garage-takes/${upNext.slug}?play=1`} className="up-next-link">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://i.ytimg.com/vi/${upNext.videoId}/maxresdefault.jpg`} alt="" loading="lazy" />
                <span>
                  <span className="eyebrow accent">Up Next</span>
                  <strong>{upNext.title}</strong>
                </span>
              </Link>
            )}
            <a
              href={`https://www.youtube.com/watch?v=${take.videoId}`}
              target="_blank"
              rel="noopener"
              className="btn btn-primary btn-sm btn-block mt-3"
              style={{ whiteSpace: "normal", textAlign: "center" }}
            >
              Watch, Subscribe &amp; Comment On YouTube
            </a>
          </div>
        </div>

        {post && (
          <div className="exp-box pair-box mt-3">
            <strong>The story behind it:</strong>{" "}
            <Link href={`/blog/${post.slug}`}>{post.title} &rarr;</Link>
            <p>{post.excerpt}</p>
          </div>
        )}

        <details className="legal-full mt-4">
          <summary>Transcript</summary>
          <div className="transcript-body">{renderTranscriptBlocks(take.transcript)}</div>
        </details>

        {/* "Watch on YouTube" moved up next to the player. */}
        {playlistIsPublic && (
          <p className="garage-links mt-4">
            <a href={`https://www.youtube.com/playlist?list=${GARAGE_TAKES_PLAYLIST_ID}`} target="_blank" rel="noopener">The whole playlist ↗</a>
          </p>
        )}

        {others.length > 0 && (
          <>
            <h2 className="eyebrow mt-6">More Garage Takes</h2>
            <div className="grid grid-2 mt-2">
              {others.map((t) => (
                <Link className="card" href={`/garage-takes/${t.slug}?play=1`} key={t.slug}>
                  <div className="card-media card-media-video">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://i.ytimg.com/vi/${t.videoId}/maxresdefault.jpg`} alt={t.title} loading="lazy" />
                  </div>
                  <div className="card-body">
                    <h3 style={{ fontSize: 18 }}>{t.title}</h3>
                    <p className="meta mb-0">{day(t.publishedAt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
