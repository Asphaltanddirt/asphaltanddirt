"use client";

import { useState } from "react";

/** One button to release a spot, and one to take it back. No form. */
export default function RsvpReleaseButton({
  id,
  slug,
  date,
  token,
  initialReleased,
}: {
  id: string;
  slug: string;
  date: string;
  token: string;
  initialReleased: boolean;
}) {
  const [released, setReleased] = useState(initialReleased);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(value: boolean) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${slug}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, date, token, released: value }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "That didn't save.");
      setReleased(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      {released ? (
        <>
          <p role="status">
            <strong>Done. Your spot is released.</strong> Thanks for letting us know.
          </p>
          <button className="btn btn-outline mt-3" onClick={() => save(false)} disabled={busy}>
            Actually, I can make it
          </button>
        </>
      ) : (
        <button className="btn btn-primary" onClick={() => save(true)} disabled={busy}>
          Release my spot
        </button>
      )}
      {error && (
        <p className="mt-3" role="alert" style={{ color: "var(--accent)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
