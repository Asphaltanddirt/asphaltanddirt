"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

export interface LockerItem {
  id: string;
  item: string;
  points: number;
  blurb: string;
  image: string;
  experience?: boolean;
}

const EXPERIENCE_PARTS = ["Pick the ride.", "Lead the ride.", "Get featured: photos and video of you on that ride.", "Your story in The Dirt Line newsletter."];

/**
 * The Locker: one big photo beside the list. Hover or tap an item and the
 * photo switches to it. Photos come from the Shelf table (Fourthwall product
 * shots later), so the frame fills whatever shape they are (Jose 10/4).
 */
export default function RallyLocker({ items }: { items: LockerItem[] }) {
  const [active, setActive] = useState(items[0]?.id || "");
  const [open, setOpen] = useState(false);
  const current = items.find((i) => i.id === active) || items[0];
  if (!current) return null;

  return (
    <div className="rally-locker-grid mt-4">
      <div className="rally-locker-frame">
        {items.map((i) =>
          i.image ? (
            <img key={i.id} src={i.image} alt={i.item} className={i.id === current.id ? "is-on" : ""} aria-hidden={i.id !== current.id} />
          ) : null,
        )}
      </div>
      <div className="rally-locker-list">
        {items.map((i) => (
          <div
            key={i.id}
            className={`card rally-locker-item${i.id === current.id ? " is-active" : ""}${i.experience ? " rally-locker-exp" : ""}`}
            onMouseEnter={() => setActive(i.id)}
          >
            <button
              type="button"
              className="rally-locker-btn"
              aria-pressed={i.id === current.id}
              aria-expanded={i.experience ? open && i.id === current.id : undefined}
              onClick={() => {
                setActive(i.id);
                if (i.experience) setOpen((o) => !(o && i.id === current.id));
              }}
            >
              <span className="rally-big">{i.points}</span>
              <span>
                <span className="rally-locker-name">{i.item}</span>
                <span className="rally-locker-blurb">{i.experience ? "All of it, together. Tap to see." : i.blurb}</span>
              </span>
              {i.experience && (
                <svg className="rally-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              )}
            </button>
            {i.experience && open && i.id === current.id && (
              <ol>
                {EXPERIENCE_PARTS.map((p, n) => (
                  <li key={p}>
                    <b>{String(n + 1).padStart(2, "0")}</b> {p}
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
