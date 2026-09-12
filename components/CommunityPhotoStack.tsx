"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CommunityPhoto } from "@/lib/events";

const ADVANCE_MS = 5000;
/** How many cards peek out behind the front one. */
const VISIBLE_DEPTH = 3;

export default function CommunityPhotoStack({ photos }: { photos: CommunityPhoto[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Auto-advance, unless the visitor has asked for reduced motion or is
  // hovering (reading a caption / about to click through).
  useEffect(() => {
    if (photos.length < 2) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || paused) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % photos.length), ADVANCE_MS);
    return () => clearInterval(timer);
  }, [photos.length, paused]);

  if (photos.length === 0) return null;

  const advance = (delta: number) => setIndex((i) => (i + delta + photos.length) % photos.length);

  return (
    <div className="photo-stack-wrap">
      <div
        className="photo-stack"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
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
          <button type="button" onClick={() => advance(1)} aria-label="Next photo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}
