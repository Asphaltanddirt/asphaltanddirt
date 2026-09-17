"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type State = "waiting" | "approved" | "declined";

/**
 * Approve / decline for one build submission or review. Approving publishes
 * it on the site and declining hides it for good, so both take two taps.
 * `toggle` is the extra switch for approved items (Ambassador badge on a
 * build, Homepage for a review).
 */
export default function GarageReviewActions({
  kind,
  id,
  state: initialState,
  toggle,
}: {
  kind: "build" | "review";
  id: string;
  state: State;
  toggle?: { field: "ambassador" | "homepage"; label: string; help: string; value: boolean };
}) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [toggleOn, setToggleOn] = useState(toggle?.value ?? false);
  const [armed, setArmed] = useState<State | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(patch: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/garage/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id, ...patch }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save that. Try again.");
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that. Try again.");
      return false;
    } finally {
      setBusy(false);
      setArmed("");
    }
  }

  async function move(next: State, confirm: boolean) {
    if (confirm && armed !== next) {
      setArmed(next);
      return;
    }
    if (await send({ state: next })) {
      setState(next);
      if (next !== "approved" && toggle?.field === "homepage") setToggleOn(false);
    }
  }

  return (
    <div className="garage-review-actions">
      {state === "waiting" && (
        <div className="garage-decision-row">
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => move("approved", true)}>
            {armed === "approved" ? "Tap again: publish it" : "Approve"}
          </button>
          <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => move("declined", true)}>
            {armed === "declined" ? "Tap again to decline" : "Decline"}
          </button>
        </div>
      )}
      {state === "approved" && (
        <>
          <p className="garage-form-note">
            <span className="garage-tag garage-tag-new">Live</span> Showing on the site (can take a few minutes).
          </p>
          {toggle && (
            <label className="garage-inline-check">
              <input
                type="checkbox"
                checked={toggleOn}
                disabled={busy}
                onChange={async (e) => {
                  const value = e.target.checked;
                  setToggleOn(value);
                  if (!(await send({ [toggle.field]: value }))) setToggleOn(!value);
                }}
              />
              <span>
                <strong>{toggle.label}</strong>
                <small>{toggle.help}</small>
              </span>
            </label>
          )}
          <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => move("waiting", true)}>
            {armed === "waiting" ? "Tap again to take it down" : "Take it down"}
          </button>
        </>
      )}
      {state === "declined" && (
        <>
          <p className="garage-form-note">Declined. Not on the site.</p>
          <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => move("waiting", false)}>
            Move back to waiting
          </button>
        </>
      )}
      {error && <p className="garage-error" role="alert">{error}</p>}
    </div>
  );
}
