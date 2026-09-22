"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { QueueItem } from "@/lib/replyQueue";

const ago = (iso: string) => {
  if (!iso) return "";
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000);
  return h < 1 ? "just now" : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};

/** One post to reply to. The reply is written in the X app, by hand. */
export default function GarageReplyItem({ item }: { item: QueueItem }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");

  async function act(action: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/garage/replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, action, url }),
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
        <span className="garage-social-platform">{item.author || "X"}</span>
        <span className="garage-tag">{item.run}</span>
        <span className="garage-social-when">{ago(item.postedAt)}</span>
      </header>
      <p className="garage-social-what">
        {item.likes} likes · {item.replies} replies · {item.reposts} reposts
      </p>
      <div className="garage-social-caption">
        <p>{item.text}</p>
      </div>
      {done ? (
        <div className="garage-social-done">
          <p>
            <strong>{item.status}</strong>
            {item.replyUrl && (
              <>
                {" "}· <a href={item.replyUrl} target="_blank" rel="noopener">Our reply ↗</a>
              </>
            )}
          </p>
          <button type="button" className="garage-social-link" disabled={busy} onClick={() => act("undo")}>
            Undo
          </button>
        </div>
      ) : (
        <div className="garage-social-post">
          <div className="garage-social-row">
            <a className="btn btn-primary btn-sm" href={item.url} target="_blank" rel="noopener">
              Open in X
            </a>
          </div>
          <input
            type="url"
            inputMode="url"
            placeholder="Paste your reply's link (optional)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={busy}
            aria-label="Link to our reply"
          />
          <div className="garage-social-row">
            <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => act("replied")}>
              Replied
            </button>
            <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => act("skip")}>
              Skip
            </button>
          </div>
        </div>
      )}
      {error && <p className="garage-error" role="alert">{error}</p>}
    </article>
  );
}
