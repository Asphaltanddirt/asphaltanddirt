"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
// One site-wide captions preference — turn captions on for one video (or in
// Comfort settings) and every video on the site starts with them on, until
// switched off again.
import { useCaptionsPref, writeCaptionsPref } from "@/lib/comfort";

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
  const captions = useCaptionsPref();
  // Where to resume when the player reloads to apply a captions change.
  const [startAt, setStartAt] = useState(0);
  const currentTime = useRef(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const frameClassName = vertical ? "video-frame video-frame-vertical" : "video-frame";

  // While playing, the player reports its position (enablejsapi=1), so a
  // captions change mid-video reloads at the same spot instead of 0:00.
  useEffect(() => {
    if (!playing) return;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow || typeof e.data !== "string") return;
      try {
        const data = JSON.parse(e.data);
        if (typeof data?.info?.currentTime === "number") currentTime.current = data.info.currentTime;
      } catch {
        // Not a player message.
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [playing]);

  function toggleCaptions() {
    const next = !captions;
    if (playing) setStartAt(Math.floor(currentTime.current));
    writeCaptionsPref(next);
    track("youtube_captions_toggle", { videoId, context: eventContext, captions: next ? "on" : "off" });
  }

  const params = new URLSearchParams({ autoplay: "1", enablejsapi: "1", rel: "0" });
  if (captions) {
    params.set("cc_load_policy", "1");
    params.set("cc_lang_pref", "en");
  }
  if (startAt > 0) params.set("start", String(startAt));

  const captionsToggle = (
    <div className="video-toolbar">
      <button
        type="button"
        className={`cc-toggle${captions ? " on" : ""}`}
        aria-pressed={captions}
        onClick={toggleCaptions}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="M10.5 10.2a2.2 2.2 0 1 0 0 3.6M17 10.2a2.2 2.2 0 1 0 0 3.6" />
        </svg>
        Captions {captions ? "On" : "Off"}
      </button>
    </div>
  );

  if (playing) {
    return (
      <div>
        <div className={frameClassName}>
          <iframe
            // Remounts when captions change — that's how the new setting applies.
            key={captions ? "cc-on" : "cc-off"}
            ref={iframeRef}
            src={`https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={() => {
              iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: videoId }), "*");
            }}
          />
        </div>
        {captionsToggle}
      </div>
    );
  }

  return (
    <div>
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
      {captionsToggle}
    </div>
  );
}
