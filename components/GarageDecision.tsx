"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const CHOICES = [
  { value: "Hold / Second Review", label: "Hold" },
  { value: "Exceptional Candidate / Crew Review", label: "Crew review" },
  { value: "Decline", label: "Decline" },
  { value: "Accept — Road & Trail Member", label: "Accept" },
] as const;

/**
 * The decision buttons on one application. Accept takes two taps because it
 * creates the Ambassador record (an Airtable automation), which can't be
 * undone from here.
 */
export default function GarageDecision({ id, current }: { id: string; current: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(decision: string | null) {
    if (decision === "Accept — Road & Trail Member" && !armed) {
      setArmed(true);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/garage/application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, decision }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "That didn't save. Try again.");
      setArmed(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const accepted = current === "Accept — Road & Trail Member";

  return (
    <div className="garage-decision">
      <div className="garage-decision-row" role="group" aria-label="Decision">
        {CHOICES.map((c) => (
          <button
            key={c.value}
            type="button"
            className={current === c.value ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"}
            aria-pressed={current === c.value}
            disabled={busy || accepted}
            onClick={() => save(c.value)}
          >
            {c.value === "Accept — Road & Trail Member" && armed ? "Tap again to accept" : c.label}
          </button>
        ))}
        {current && !accepted && (
          <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => save(null)}>
            Clear
          </button>
        )}
      </div>
      {armed && (
        <p className="garage-form-note">
          Accepting creates their Ambassador record. It doesn&apos;t email them yet: send welcome email 1 from
          Onboarding below when you&apos;re ready.
        </p>
      )}
      {accepted && (
        <p className="garage-form-note">
          Accepted. Onboarding steps are below. To undo the decision, change it in Airtable.
        </p>
      )}
      {error && <p className="garage-error" role="alert">{error}</p>}
    </div>
  );
}
