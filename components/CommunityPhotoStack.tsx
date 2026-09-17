"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CommunityPhoto } from "@/lib/events";
import { useCalmMotion } from "@/lib/comfort";

const ADVANCE_MS = 5000;
/** How many cards peek out behind the front one. */
const VISIBLE_DEPTH = 3;

export default function CommunityPhotoStack({ photos }: { photos: CommunityPhoto[] }) {
  const [index, setIndex] = useState(0);
  // Hovering or focusing the deck pauses it for a moment; the Pause button
  // stops it until they press Play (WCAG 2.2.2). Calm motion (Comfort
  // settings or the device's reduce-motion setting) starts it stopped.
  const [hoverPaused, setHoverPaused] = useState(false);
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  const calm = useCalmMotion();
  const stopped = userPaused ?? calm;

  useEffect(() => {
    if (photos.length < 2 || stopped || hoverPaused) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % photos.length), ADVANCE_MS);
    return () => clearInterval(timer);
  }, [photos.length, stopped, hoverPaused]);

  if (photos.length === 0) return null;

  const advance = (delta: number) => setIndex((i) => (i + delta + photos.length) % photos.length);

  return (
    <div className="photo-stack-wrap">
      <div
        className="photo-stack"
        onMouseEnter={() => setHoverPaused(true)}
        onMouseLeave={() => setHoverPaused(false)}
        onFocus={() => setHoverPaused(true)}
        onBlur={() => setHoverPaused(false)}
      >
        {photos.map((photo, i) => {
          // Position relative to the front card, wrapping around the deck.
          const offset = (i - index + photos.length) % photos.length;
          const isBuried = offset > VISIBLE_DEPTH;
          return (
            <Link
              key={`${photo.url}-${i}`}
              href={`/events/${photo.eventSlug}`}
              className="photo-stack-card"
              aria-hidden={offset !== 0}
              tabIndex={offset === 0 ? 0 : -1}
              style={{
                transform: `translateY(${offset * 14}px) scale(${1 - offset * 0.04}) rotate(${offset % 2 === 0 ? offset * 1.4 : offset * -1.4}deg)`,
                opacity: isBuried ? 0 : 1,
                zIndex: photos.length - offset,
                pointerEvents: offset === 0 ? "auto" : "none",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.alt} loading={offset === 0 ? "eager" : "lazy"} />
              {offset === 0 && (
                <span className="photo-stack-caption">
                  {photo.eventTitle}
                  <span className="photo-stack-cta">View recap &rarr;</span>
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {photos.length > 1 && (
        <div className="photo-stack-controls">
          <button type="button" onClick={() => advance(-1)} aria-label="Previous photo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
          </button>
          <span className="photo-stack-count">{index + 1} / {photos.length}</span>
          <button
            type="button"
            onClick={() => setUserPaused(!stopped)}
            aria-label={stopped ? "Play slideshow" : "Pause slideshow"}
          >
            {stopped ? (
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" /></svg>
            )}
          </button>
          <button type="button" onClick={() => advance(1)} aria-label="Next photo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}
