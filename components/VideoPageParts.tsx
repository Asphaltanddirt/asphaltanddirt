import Link from "next/link";
import ShareEpisodeButton from "@/components/ShareEpisodeButton";
import { renderTranscriptBlocks } from "@/lib/transcriptRenderer";

/**
 * The parts under the player that every hub video page shares (Jose 10/2:
 * trail & event videos and Garage Takes are the same page, only the content
 * differs). Order on both: Hype → the story panel → Transcript → More.
 */

export function HypeBox({ videoId, url, title }: { videoId: string; url: string; title: string }) {
  return (
    <div className="mt-4">
      <div className="eyebrow">Hype This Video</div>
      <div className="event-promo mt-3" style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
        <p className="mb-0">Loved this one? A like, a comment, or a share on YouTube goes a long way.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener" className="btn btn-primary btn-sm">
            Like &amp; Comment On YouTube
          </a>
          <ShareEpisodeButton url={url} title={title} label="Share This Video" />
        </div>
      </div>
    </div>
  );
}

/** The orange-edged panel. On a Take it's the companion blog post; on a
 *  trail video it's the description: the first paragraph shows, the rest
 *  opens with "Read more" (it's always in the page HTML for search). */
export function DescriptionPanel({ label, text }: { label: string; text: string }) {
  const [first, ...rest] = text.trim().split(/\n\s*\n/);
  return (
    <div className="pair-box mt-3">
      <strong>{label}</strong>
      <p style={{ whiteSpace: "pre-wrap" }}>{first}</p>
      {rest.length > 0 && (
        <details className="video-more-text">
          <summary>Read more</summary>
          {rest.map((para, i) => (
            <p key={i} style={{ whiteSpace: "pre-wrap" }}>{para}</p>
          ))}
        </details>
      )}
    </div>
  );
}

export function BlogPanel({ href, title, excerpt }: { href: string; title: string; excerpt: string }) {
  return (
    <div className="pair-box mt-3">
      <strong>The story behind it:</strong> <Link href={href}>{title} &rarr;</Link>
      <p>{excerpt}</p>
    </div>
  );
}

/** Collapsed. Rides and events rarely have one; talking videos (Takes, the
 *  safety video) do. Without one, the same row says so (Jose 10/2), so
 *  every video page has the same sections. */
export function TranscriptFold({ transcript }: { transcript?: string }) {
  if (!transcript?.trim()) {
    return (
      <div className="legal-full transcript-none mt-3">
        <span>Transcript</span>
        <span>No transcript available for this video.</span>
      </div>
    );
  }
  return (
    <details className="legal-full mt-3">
      <summary>Transcript</summary>
      <div className="transcript-body">{renderTranscriptBlocks(transcript)}</div>
    </details>
  );
}

export interface MoreVideo {
  href: string;
  title: string;
  thumbnail: string;
}

/** The same "More …" strip at the bottom of every hub video page. */
export function MoreVideosSection({ title, href, items }: { title: string; href: string; items: MoreVideo[] }) {
  return (
    <section className="section-alt">
      <div className="container">
        <div className="section-head">
          <h2 className="eyebrow">{title}</h2>
          <Link href={href} className="view-all">
            See All
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
        </div>
        {items.length ? (
          <div className="grid grid-3">
            {items.map((v) => (
              <Link key={v.href} href={`${v.href}?play=1`} className="card">
                <div className="card-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.thumbnail} alt={v.title} loading="lazy" />
                </div>
                <div className="card-body">
                  <h3>{v.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mb-0">More videos drop soon &mdash; check back here so you don&apos;t miss one.</p>
        )}
      </div>
    </section>
  );
}
