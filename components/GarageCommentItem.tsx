"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BUCKETS, type Bucket, type HarvestedComment } from "@/lib/commentHarvest";

const ago = (iso: string) => {
  if (!iso) return "";
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d < 1 ? "today" : d === 1 ? "yesterday" : d < 30 ? `${d}d ago` : `${Math.round(d / 30)}mo ago`;
};

/** One harvested comment. The reply itself is written on YouTube, by hand. */
export default function GarageCommentItem({ item }: { item: HarvestedComment }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(patch: { status?: string; bucket?: Bucket }) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/garage/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, ...patch }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "That didn't save.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't save.");
    } finally {
      setBusy(false);
    }
  }

  const done = item.status !== "New";
  return (
    <article className={done ? "garage-social-card is-posted" : "garage-social-card"}>
      <header className="garage-social-head">
        <span className="garage-social-platform">{item.author || "YouTube"}</span>
        <span className="garage-tag">{item.bucket}</span>
        <span className="garage-social-when">{ago(item.publishedAt)}</span>
      </header>
      <p className="garage-social-what">
        {item.videoTitle || item.videoId || "—"}
        {item.likes > 0 && ` · ${item.likes} likes`}
        {item.replies > 0 && ` · ${item.replies} replies`}
      </p>
      <div className="garage-social-caption">
        <p>{item.text}</p>
      </div>

      {done ? (
        <div className="garage-social-done">
          <p>
            <strong>{item.status}</strong>
          </p>
          <button type="button" className="garage-social-link" disabled={busy} onClick={() => save({ status: "New" })}>
            Undo
          </button>
        </div>
      ) : (
        <div className="garage-social-post">
          <div className="garage-social-row">
            {item.url && (
              <a className="btn btn-primary btn-sm" href={item.url} target="_blank" rel="noopener">
                Open on YouTube
              </a>
            )}
          </div>
          <div className="garage-social-row">
            <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => save({ status: "Q&A episode" })}>
              Q&amp;A episode
            </button>
            <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => save({ status: "Garage Take" })}>
              Garage Take
            </button>
          </div>
          <div className="garage-social-row">
            <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => save({ status: "Answered" })}>
              Answered
            </button>
            <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => save({ status: "Ignore" })}>
              Ignore
            </button>
          </div>
          <div className="garage-social-row">
            {BUCKETS.filter((b) => b !== item.bucket).map((b) => (
              <button key={b} type="button" className="garage-social-link" disabled={busy} onClick={() => save({ bucket: b })}>
                → {b}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && (
        <p className="garage-error" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}
