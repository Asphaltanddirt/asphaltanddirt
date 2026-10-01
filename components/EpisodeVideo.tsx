"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import { track } from "@/lib/analytics";

export interface UpNextVideo {
  href: string;
  title: string;
  thumbnail: string;
}

const COUNTDOWN = 8;

/** An episode/trail video with our own Up Next: when the video ends, a card
 *  covers the player and counts down to the next video ON OUR SITE, in the
 *  order we choose (lib/episodes.ts getUpNext). YouTube's in-player
 *  suggestions can't be chosen, so this keeps the next play here.
 *  Reduce Motion: no countdown, the card waits for a tap. */
export default function EpisodeVideo({
  videoId,
  title,
  eventContext,
  upNext,
}: {
  videoId: string;
  title: string;
  eventContext: string;
  upNext?: UpNextVideo;
}) {
  const router = useRouter();
  const [ended, setEnded] = useState(false);
  const [left, setLeft] = useState<number | null>(null);

  function onEnded() {
    if (!upNext || ended) return;
    setEnded(true);
    track("up_next_shown", { videoId, context: eventContext, next: upNext.href });
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setLeft(calm ? null : COUNTDOWN);
  }

  function go(how: "auto" | "tap") {
    if (!upNext) return;
    track("up_next_play", { videoId, context: eventContext, next: upNext.href, how });
    router.push(`${upNext.href}?play=1`);
  }

  useEffect(() => {
    if (left === null) return;
    if (left <= 0) {
      go("auto");
      return;
    }
    const t = setTimeout(() => setLeft((n) => (n === null ? null : n - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  return (
    <div className="episode-video">
      <YouTubeEmbed videoId={videoId} title={title} eventContext={eventContext} autoPlayFromQuery onEnded={onEnded} />
      {ended && upNext && (
        <div className="up-next-overlay" role="dialog" aria-label="Up next">
          <div className="up-next-card">
            <div className="eyebrow accent">Up Next</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={upNext.thumbnail} alt="" />
            <p className="up-next-title">{upNext.title}</p>
            <p className="up-next-count" aria-live="polite">
              {left !== null ? `Playing in ${left}` : " "}
            </p>
            <div className="up-next-actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => go("tap")} autoFocus>
                Play Now
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  track("up_next_cancel", { videoId, context: eventContext });
                  setLeft(null);
                  setEnded(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
