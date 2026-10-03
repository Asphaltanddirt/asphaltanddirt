"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EngageTarget } from "@/lib/engage";

const fmt = (n: number | null) => (n === null ? "" : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n));
const since = (iso: string) => {
  if (!iso) return "never";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};

/**
 * One account to comment on, as A&D, by hand in the app. Less friction (Jose
 * 10/3): tapping Open marks it done in the same tap, since leaving for the app
 * means coming back is optional. Undo covers an Open without a comment.
 */
export default function GarageEngageItem({ target, done = false }: { target: EngageTarget; done?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [opened, setOpened] = useState(false);

  // Fire-and-forget: the page is about to hand off to the app, so keepalive
  // lets the request finish after the tab goes to the background.
  function openAndMark() {
    setOpened(true);
    fetch("/api/garage/engage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: target.id, action: "done" }),
      keepalive: true,
    }).catch(() => setError("Couldn't mark it done. Tap Undo, then Open again."));
  }

  async function act(action: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/garage/engage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: target.id, action }),
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

  return (
    <article className={done ? "garage-social-card is-posted" : "garage-social-card"}>
      <header className="garage-social-head">
        <span className="garage-social-platform">{target.platform}</span>
        <span className="garage-tag">{target.tier}</span>
        {target.followers !== null && <span className="garage-social-when">{fmt(target.followers)}</span>}
      </header>
      <h3 className="garage-engage-name">{target.name}</h3>
      {target.why && <p className="garage-social-what">{target.why}</p>}
      <p className="garage-form-note">
        Last engaged: {since(target.lastEngaged)}
        {target.timesEngaged > 0 ? ` · ${target.timesEngaged}× so far` : ""}
      </p>
      {done || opened ? (
        <div className="garage-social-done">
          <p>
            <strong>Done</strong>
            {" "}·{" "}
            <a href={target.url} target="_blank" rel="noopener">
              open again ↗
            </a>
          </p>
          <button
            type="button"
            className="garage-social-link"
            disabled={busy}
            onClick={async () => {
              await act("undo");
              setOpened(false);
            }}
          >
            Undo
          </button>
        </div>
      ) : (
        <div className="garage-social-post">
          <a className="btn btn-primary btn-block" href={target.url} target="_blank" rel="noopener" onClick={openAndMark}>
            Open {target.platform === "Facebook Page" ? "Page" : target.platform} and comment
          </a>
          <p className="garage-form-note">
            <button type="button" className="garage-social-link" disabled={busy} onClick={() => act("skip")}>
              Skip today
            </button>
            {" · "}
            <button type="button" className="garage-social-link" disabled={busy} onClick={() => act("pause")}>
              Take off the list
            </button>
          </p>
        </div>
      )}
      {error && <p className="garage-error" role="alert">{error}</p>}
    </article>
  );
}
