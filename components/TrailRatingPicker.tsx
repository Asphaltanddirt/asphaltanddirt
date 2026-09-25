"use client";

import { useRef, useState } from "react";
import { TrailRatingFacts } from "@/components/TrailRatingBadge";
import type { TrailRating } from "@/lib/trailRating";

/**
 * The Events page explainer (Jose 9/25, option 2): four badges in a row, tap
 * one and its lines show underneath. One level at a time keeps the section
 * short. A tablist, so arrow keys move between levels and screen readers hear
 * which one is showing.
 */
export default function TrailRatingPicker({ ratings }: { ratings: TrailRating[] }) {
  const [active, setActive] = useState(0);
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
      <div role="tablist" aria-label="A&D Trail Rating levels" className="trail-rating-tabs">
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
            <img src={r.image} alt={`${r.name} (${r.plain})`} width={120} height={120} />
          </button>
        ))}
      </div>
      <div role="tabpanel" id="trail-rating-panel" aria-labelledby={`trail-tab-${current.color}`} className="trail-rating-panel"
        style={{ ["--tr" as string]: edge(current) }}
      >
        <p className="trail-rating-panel-name">
          {current.name} <span>{current.plain}</span>
        </p>
        <TrailRatingFacts rating={current} />
      </div>
    </div>
  );
}
