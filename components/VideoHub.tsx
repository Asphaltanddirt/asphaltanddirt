import Link from "next/link";
import EpisodeVideo from "@/components/EpisodeVideo";
import { HUB_FILTERS, type HubKind, type HubVideo } from "@/lib/videoHub";

const KIND_LABEL: Record<HubKind, string> = { trail: "Trail & Event Video", takes: "Garage Take" };

const day = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });

/**
 * The Videos hub body (Jose 10/2): filter chips, then the newest video as a
 * hero laid out like an episode page (player left, details right), a
 * divider, and every other video below. The filter lives in the URL
 * (?type=trail / ?type=takes) so the old list pages can redirect straight
 * to the right view; the page reads it on the server, so search engines
 * see every card.
 */
export default function VideoHub({ videos, filter }: { videos: HubVideo[]; filter: HubKind | "all" }) {
  const shown = filter === "all" ? videos : videos.filter((v) => v.kind === filter);
  const [hero, ...rest] = shown;
  const next = rest[0];

  return (
    <>
      <div className="video-hub-chips" role="group" aria-label="Show videos">
        {HUB_FILTERS.map((f) => {
          const count = f.key === "all" ? videos.length : videos.filter((v) => v.kind === f.key).length;
          return (
            <Link
              key={f.key}
              href={f.key === "all" ? "/videos" : `/videos?type=${f.key}`}
              scroll={false}
              className={`video-hub-chip${filter === f.key ? " is-on" : ""}`}
              aria-current={filter === f.key ? "page" : undefined}
            >
              {f.label} <span>{count}</span>
            </Link>
          );
        })}
      </div>

      {hero ? (
        <div className="episode-hero-grid mt-3" key={hero.href}>
          <div>
            <EpisodeVideo
              videoId={hero.videoId}
              title={hero.title}
              eventContext={`videos-hub:${hero.href}`}
              upNext={next ? { href: next.href, title: next.title, thumbnail: next.thumbnail } : undefined}
            />
          </div>
          <div className="episode-hero-info">
            <div className="eyebrow accent">Latest {KIND_LABEL[hero.kind]}</div>
            <h2 className="mt-2 video-hub-hero-title">
              <Link href={hero.href}>{hero.title}</Link>
            </h2>
            <div className="episode-meta mt-2">
              <span>{day(hero.date)}</span>
            </div>
            <p className="lead mt-2">{hero.description}</p>
            {next && (
              <Link href={`${next.href}?play=1`} className="up-next-link">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={next.thumbnail} alt="" loading="lazy" />
                <span>
                  <span className="eyebrow accent">Up Next</span>
                  <strong>{next.title}</strong>
                </span>
              </Link>
            )}
            {/* Not "open the video page": people are already on a video page
                (Jose 10/2). Say what's there instead. */}
            <Link href={hero.href} className="btn btn-primary btn-sm btn-block mt-3" style={{ whiteSpace: "normal", textAlign: "center" }}>
              Expanded View, Transcript &amp; More
            </Link>
            <a
              href={`https://www.youtube.com/watch?v=${hero.videoId}`}
              target="_blank"
              rel="noopener"
              className="btn btn-outline btn-sm btn-block mt-2"
              style={{ whiteSpace: "normal", textAlign: "center" }}
            >
              Watch, Subscribe &amp; Comment On YouTube
            </a>
          </div>
        </div>
      ) : (
        <p className="mt-4 mb-0">Videos drop soon &mdash; check back here so you don&apos;t miss one.</p>
      )}

      {rest.length ? (
        <>
          <div className="video-hub-divider">
            <span className="eyebrow">More Videos</span>
          </div>
          <div className="grid grid-3">
            {rest.map((v) => (
              <Link className="card" href={`${v.href}?play=1`} key={v.href}>
                <div className="card-media">
                  <div className="play-overlay">
                    <div className="play-circle">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.thumbnail} alt={v.title} loading="lazy" />
                </div>
                <div className="card-body">
                  <span className="part-tag">
                    {v.kind === "takes" ? "Garage Take" : "Trail & Event"}
                    {v.part ? ` · Part ${v.part}` : ""}
                  </span>
                  <h3>{v.title}</h3>
                  <p className="meta mb-0">{day(v.date)}</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
