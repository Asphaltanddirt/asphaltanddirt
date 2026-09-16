"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * One switch in the Control Room. Two taps: the first arms it and says what
 * will happen, the second does it — no browser dialog, which some in-app
 * browsers refuse to show, and no way to flip something live by a thumb
 * brushing the screen.
 */
export default function GarageSwitch({
  label,
  armedLabel,
  warning,
  body,
  danger = false,
}: {
  label: string;
  armedLabel: string;
  warning: string;
  body: Record<string, string>;
  danger?: boolean;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/garage/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "That didn't go through. Try again.");
      setArmed(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't go through. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="garage-switch">
      <div className="garage-switch-row">
        <button
          type="button"
          className={danger ? "btn btn-outline garage-switch-btn is-danger" : "btn btn-outline garage-switch-btn"}
          onClick={run}
          disabled={busy}
        >
          {busy ? "Working…" : armed ? armedLabel : label}
        </button>
        {armed && !busy && (
          <button type="button" className="garage-switch-cancel" onClick={() => setArmed(false)}>
            Cancel
          </button>
        )}
      </div>
      <p className="garage-form-note" role={armed ? "status" : undefined}>
        {armed ? warning : ""}
      </p>
      {error && (
        <p className="garage-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
