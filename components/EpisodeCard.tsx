import Link from "next/link";
import { episodePath, seriesOf, type Episode } from "@/lib/episodes";
import { excerpt } from "@/lib/text";

/** A video card that always opens our own page (never YouTube) and starts
 *  the video there (?play=1). */
export default function EpisodeCard({ episode, showPart = false }: { episode: Episode; showPart?: boolean }) {
  const part = showPart ? seriesOf(episode)?.part : undefined;
  return (
    <Link className="card" href={`${episodePath(episode)}?play=1`}>
      <div className="card-media">
        <div className="play-overlay">
          <div className="play-circle">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={episode.artwork.src} alt={episode.artwork.alt} loading="lazy" />
      </div>
      <div className="card-body">
        {part ? <span className="part-tag">Part {part}</span> : null}
        <h3>{episode.title}</h3>
        <p>{excerpt(episode.description)}</p>
      </div>
    </Link>
  );
}
