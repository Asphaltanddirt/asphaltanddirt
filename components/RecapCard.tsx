import Link from "next/link";
import type { YouTubeVideo } from "@/lib/youtube";
import { findEpisodeByYoutubeId } from "@/lib/episodes";
import { excerpt } from "@/lib/text";

/** A trail/event video card. Opens the on-site video page when one exists
 *  (lib/episodes.ts, type "trail-event"), otherwise YouTube in a new tab. */
export default async function RecapCard({ video }: { video: YouTubeVideo }) {
  const internal = await findEpisodeByYoutubeId(video.videoId);
  const cardBody = (
    <>
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
        <h3>{video.title}</h3>
        <p>{excerpt(video.description)}</p>
      </div>
    </>
  );
  return internal ? (
    <Link className="card" href={`/podcast/${internal.slug}`}>
      {cardBody}
    </Link>
  ) : (
    <a className="card" href={video.url} target="_blank" rel="noopener">
      {cardBody}
    </a>
  );
}
