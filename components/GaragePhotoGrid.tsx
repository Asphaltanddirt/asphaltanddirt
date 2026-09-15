"use client";

import { useState } from "react";

export interface GaragePhoto {
  key: string;
  url: string;
  who: string;
  source: "Tailgate" | "Upload";
  hidden: boolean;
  stars: number;
  starredByMe: boolean;
}

const REASONS = ["Kids / privacy", "Inappropriate", "Poor quality", "Other"] as const;

/** The review grid: star what's good, flag what shouldn't be up. A flag hides
 *  the photo from the site the moment it's tapped. */
export default function GaragePhotoGrid({
  photos,
  eventSlug,
  canRestore,
}: {
  photos: GaragePhoto[];
  eventSlug: string;
  canRestore: boolean;
}) {
  const [state, setState] = useState(photos);
  const [flagging, setFlagging] = useState<string | null>(null);
  const [error, setError] = useState("");

  const patch = (key: string, changes: Partial<GaragePhoto>) =>
    setState((prev) => prev.map((p) => (p.key === key ? { ...p, ...changes } : p)));

  async function send(photo: GaragePhoto, action: string, extra: Record<string, string> = {}) {
    setError("");
    const res = await fetch("/api/garage/photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: photo.key, eventSlug, photoUrl: photo.url, action, ...extra }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Couldn't save that. Try again.");
    return data;
  }

  async function toggleStar(photo: GaragePhoto) {
    const next = !photo.starredByMe;
    patch(photo.key, { starredByMe: next, stars: Math.max(0, photo.stars + (next ? 1 : -1)) });
    try {
      const data = await send(photo, next ? "star" : "unstar");
      patch(photo.key, { stars: data.stars ?? photo.stars });
    } catch (err) {
      patch(photo.key, { starredByMe: photo.starredByMe, stars: photo.stars });
      setError(err instanceof Error ? err.message : "Couldn't save that.");
    }
  }

  async function flag(photo: GaragePhoto, reason: string) {
    setFlagging(null);
    patch(photo.key, { hidden: true });
    try {
      await send(photo, "flag", { reason });
    } catch (err) {
      patch(photo.key, { hidden: false });
      setError(err instanceof Error ? err.message : "Couldn't save that.");
    }
  }

  async function unflag(photo: GaragePhoto) {
    patch(photo.key, { hidden: false });
    try {
      await send(photo, "unflag");
    } catch (err) {
      patch(photo.key, { hidden: true });
      setError(err instanceof Error ? err.message : "Couldn't save that.");
    }
  }

  if (state.length === 0) return <p className="garage-empty">No photos for this event yet.</p>;

  return (
    <>
      {error && <p className="garage-error" role="alert">{error}</p>}
      <div className="garage-photos">
        {state.map((photo) => (
          <figure key={photo.key} className={photo.hidden ? "garage-photo is-hidden" : "garage-photo"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt={`From ${photo.who}`} loading="lazy" />
            <figcaption>
              <span className="garage-photo-who">
                {photo.who} · {photo.source}
              </span>
              {photo.hidden && <span className="garage-photo-flagged">Hidden from the site</span>}
            </figcaption>

            <div className="garage-photo-actions">
              <button
                type="button"
                className={photo.starredByMe ? "garage-star on" : "garage-star"}
                aria-pressed={photo.starredByMe}
                onClick={() => toggleStar(photo)}
                disabled={photo.hidden}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m12 3.5 2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.9l6.1-.8z" />
                </svg>
                <span>{photo.stars || ""}</span>
                <span className="sr-only">{photo.starredByMe ? "Remove favourite" : "Mark as favourite"}</span>
              </button>

              {photo.hidden ? (
                canRestore ? (
                  <button type="button" className="garage-photo-btn" onClick={() => unflag(photo)}>
                    Put it back
                  </button>
                ) : (
                  <span className="garage-photo-note">Only Jose or Anthony can restore</span>
                )
              ) : (
                <button type="button" className="garage-photo-btn" onClick={() => setFlagging(photo.key)}>
                  Flag
                </button>
              )}
            </div>

            {flagging === photo.key && (
              <div className="garage-flag-menu" role="group" aria-label="Why flag this photo?">
                {REASONS.map((reason) => (
                  <button key={reason} type="button" onClick={() => flag(photo, reason)}>
                    {reason}
                  </button>
                ))}
                <button type="button" className="garage-flag-cancel" onClick={() => setFlagging(null)}>
                  Cancel
                </button>
              </div>
            )}
          </figure>
        ))}
      </div>
    </>
  );
}
