"use client";

import { useRef, useState } from "react";
import { TrailRatingFacts } from "@/components/TrailRatingBadge";
import type { TrailRating } from "@/lib/trailRating";

/**
 * The Events page explainer (Jose 9/25, reworked 10/2): the badges run the
 * full width of the panel; tap one and its Asphalt lines show on the left and
 * its Dirt lines on the right (stacked on phones). Park It reads the same on
 * both sides, so it shows one set. A tablist, so arrow keys move between
 * levels and screen readers hear which one is showing.
 */
export default function TrailRatingPicker({ ratings, start = 0 }: { ratings: TrailRating[]; start?: number }) {
  const [active, setActive] = useState(start);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = ratings[active];
  // Black on a black page disappears, so the Black edge is the muted grey.
  const edge = (r: TrailRating) => (r.color === "Black" ? "var(--text-muted)" : r.hex);

  function onKey(e: React.KeyboardEvent, i: number) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + ratings.length) % ratings.length;
    setActive(next);
    tabs.current[next]?.focus();
  }

  return (
    <div className="trail-rating-picker">
      <div role="tablist" aria-label="A&D Ride Rating levels" className="trail-rating-tabs">
        {ratings.map((r, i) => (
          <button
            key={r.color}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`trail-tab-${r.color}`}
            aria-selected={i === active}
            aria-controls="trail-rating-panel"
            tabIndex={i === active ? 0 : -1}
            className={`trail-rating-tab${i === active ? " is-active" : ""}`}
            style={{ ["--tr" as string]: edge(r) }}
            onClick={() => setActive(i)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r.image} alt={`${r.name} (${r.plain})`} width={240} height={240} />
          </button>
        ))}
      </div>
      <div role="tabpanel" id="trail-rating-panel" aria-labelledby={`trail-tab-${current.color}`} className="trail-rating-panel"
        style={{ ["--tr" as string]: edge(current) }}
      >
        <p className="trail-rating-panel-name">
          {current.name} <span>{current.plain}</span>
        </p>
        {current.sameBothSides ? (
          <TrailRatingFacts lines={current.dirt} />
        ) : (
          <div className="trail-rating-sides">
            <TrailRatingFacts lines={current.asphalt} heading="Asphalt" />
            <TrailRatingFacts lines={current.dirt} heading="Dirt" />
          </div>
        )}
      </div>
    </div>
  );
}
