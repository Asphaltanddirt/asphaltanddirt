"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PendingPhoto } from "@/lib/eventMedia";

/**
 * Photos waiting for approval before they reach the public gallery. Approve
 * puts one on the event page and the Community wall; Reject keeps it off
 * (it's still in Drive, and deleted 90 days later). Check that recognizable
 * people agreed to media use before approving.
 */
export default function GaragePhotoReview({ photos }: { photos: PendingPhoto[] }) {
  const router = useRouter();
  const [done, setDone] = useState<Record<string, "approve" | "reject">>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function decide(photo: PendingPhoto, decision: "approve" | "reject") {
    setBusy(photo.submissionId);
    setError("");
    try {
      const res = await fetch("/api/garage/photo-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: photo.submissionId, decision }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "That didn't save.");
      setDone((d) => ({ ...d, [photo.submissionId]: decision }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't save.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="garage-panel">
      <h2>Waiting for approval ({photos.length})</h2>
      <p className="garage-form-note">
        Nothing goes public until it&apos;s approved here. Before approving, check that anyone recognizable said yes to
        media use (and a parent for any child). If you&apos;re not sure, reject it.
      </p>
      {error && <p className="garage-error" role="alert">{error}</p>}
      <div className="garage-review-grid">
        {photos.map((photo) => {
          const decided = done[photo.submissionId];
          return (
            <figure key={`${photo.submissionId}-${photo.index}`} className="garage-review-item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={`Photo from ${photo.name}`} loading="lazy" />
              <figcaption>
                <span>
                  {photo.name} · {photo.source}
                </span>
                {photo.permissionNotes && <span className="garage-form-note">Permissions: {photo.permissionNotes}</span>}
                {decided ? (
                  <strong>{decided === "approve" ? "Approved" : "Rejected"}</strong>
                ) : (
                  <span className="garage-review-actions">
                    <button type="button" className="btn btn-primary btn-sm" disabled={busy === photo.submissionId} onClick={() => decide(photo, "approve")}>
                      Approve
                    </button>
                    <button type="button" className="btn btn-outline btn-sm" disabled={busy === photo.submissionId} onClick={() => decide(photo, "reject")}>
                      Reject
                    </button>
                  </span>
                )}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
