"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

export default function YouTubeEmbed({
  videoId,
  title,
  eventContext,
  thumbnail,
  vertical = false,
}: {
  videoId: string;
  title: string;
  eventContext: string;
  /** Overrides the default i.ytimg.com maxresdefault lookup — useful when a
   *  thumbnail URL was already fetched server-side (e.g. via the YouTube
   *  Data API), since maxresdefault isn't reliably generated for every
   *  video (Shorts especially). */
  thumbnail?: string;
  /** Shorts/vertical video — renders the frame at 9:16 instead of 16:9. */
  vertical?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const frameClassName = vertical ? "video-frame video-frame-vertical" : "video-frame";

  if (playing) {
    return (
      <div className={frameClassName}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className={frameClassName}>
      <button
        type="button"
        className="play-overlay"
        aria-label={`Play video: ${title}`}
        onClick={() => {
          track("youtube_embed_play", { videoId, context: eventContext });
          setPlaying(true);
        }}
      >
        <span className="play-circle">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        </span>
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={thumbnail || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`} alt={title} loading="lazy" />
    </div>
  );
}
