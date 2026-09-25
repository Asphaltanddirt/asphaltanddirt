"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WeeklySocialsState } from "@/lib/weeklySocials";

/** The three numbers nothing fetches for us. Last week's value sits beside
 *  each box, so a typo (an extra zero) is obvious before it's saved. */
export default function GarageWeeklySocials({ state }: { state: WeeklySocialsState }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(state.rows.map((r) => [r.key, r.thisWeek === null ? "" : String(r.thisWeek)])),
  );
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/garage/socials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't save.");
      setNote(`Saved ${data.saved} for the week of ${state.monday}.`);
      router.refresh();
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="garage-form" onSubmit={save}>
      {state.rows.map((r) => (
        <div key={r.key}>
          <label htmlFor={`ws-${r.key}`}>{r.label}</label>
          <input
            id={`ws-${r.key}`}
            inputMode="numeric"
            autoComplete="off"
            value={values[r.key]}
            onChange={(e) => setValues((v) => ({ ...v, [r.key]: e.target.value }))}
            placeholder={r.last ? String(r.last.value) : "0"}
            aria-describedby={`ws-${r.key}-help`}
          />
          <p id={`ws-${r.key}-help`} className="garage-form-note">
            {r.where}
            {r.last && ` · last: ${r.last.value.toLocaleString()} on ${r.last.date}`}
            {r.thisWeek !== null && " · saved this week"}
          </p>
        </div>
      ))}
      <div className="card-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Save this week"}
        </button>
      </div>
      {note && (
        <p className="garage-form-note" role="status">
          {note}
        </p>
      )}
    </form>
  );
}
