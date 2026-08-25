"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

export default function YouTubeEmbed({
  videoId,
  title,
  eventContext,
}: {
  videoId: string;
  title: string;
  eventContext: string;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="video-frame">
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
    <div className="video-frame">
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
      <img src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`} alt={title} loading="lazy" />
    </div>
  );
}
