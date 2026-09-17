"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Jot an idea down in two fields (replaces the New Video Ideas form). */
export default function GarageQuickIdea() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Give it a working title.");
      return;
    }
    setBusy(true);
    setError("");
    setNote("");
    try {
      const res = await fetch("/api/garage/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "ideas", values: { title, notes } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save that. Try again.");
      setTitle("");
      setNotes("");
      setNote("Idea added.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="garage-form" onSubmit={add}>
      <label htmlFor="qi-title">Working title</label>
      <input id="qi-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Budget lift kits that actually hold up" />
      <label htmlFor="qi-notes">Notes</label>
      <textarea id="qi-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering" />
      {error && <p className="garage-error" role="alert">{error}</p>}
      <button type="submit" className="btn btn-primary garage-block-btn" disabled={busy}>
        {busy ? "Adding…" : "Add idea"}
      </button>
      <p className="garage-form-note" aria-live="polite">{note}</p>
    </form>
  );
}
