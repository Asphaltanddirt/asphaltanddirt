"use client";

import { useState } from "react";

const CHOICES = ["Yes", "Maybe", "No"] as const;

/** Two questions, both optional-ish (one of them is enough), name optional. */
export default function EventFeedbackForm({ slug }: { slug: string }) {
  const [name, setName] = useState("");
  const [howWasIt, setHowWasIt] = useState("");
  const [comeAgain, setComeAgain] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${slug}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, howWasIt, comeAgain, website }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "That didn't save.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't save.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="mt-4" role="status">
        <strong>Got it. Thank you.</strong> We read every one.
      </p>
    );
  }

  return (
    <form className="mt-4" onSubmit={submit} style={{ display: "grid", gap: "var(--sp-3, 20px)" }}>
      <div className="form-field">
        <label htmlFor="fb-how">How was it?</label>
        <textarea
          id="fb-how"
          value={howWasIt}
          onChange={(e) => setHowWasIt(e.target.value)}
          rows={5}
          maxLength={4000}
          placeholder="The good, the muddy, and anything we should change."
        />
      </div>

      <fieldset className="form-field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="form-label" style={{ marginBottom: 6 }}>Would you come to another one?</legend>
        <div className="chip-row">
          {CHOICES.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip${comeAgain === c ? " active" : ""}`}
              aria-pressed={comeAgain === c}
              onClick={() => setComeAgain(comeAgain === c ? "" : c)}
            >
              {c}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="form-field">
        <label htmlFor="fb-name">
          Your name <span className="optional">(optional)</span>
        </label>
        <input id="fb-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="name" />
      </div>

      {/* Bots fill every field; people never see this one. */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px" }}
      />

      <button className="btn btn-primary" type="submit" disabled={busy || (!howWasIt.trim() && !comeAgain)}>
        {busy ? "Sending…" : "Send"}
      </button>
      {error && (
        <p role="alert" style={{ color: "var(--accent)", margin: 0 }}>
          {error}
        </p>
      )}
    </form>
  );
}
