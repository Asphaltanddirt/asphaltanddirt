"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Start / test / send for the weekly Dirt Line. Sending to everyone takes
 *  two taps and names how many people it's going to. */
export default function GarageNewsletterActions({
  hasDraft,
  recipients,
  testInbox,
  overCap,
}: {
  hasDraft: boolean;
  recipients: number | null;
  testInbox: string;
  overCap: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"" | "start" | "test" | "live">("");
  const [armed, setArmed] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function run(action: "start" | "test" | "live") {
    if (action === "live" && !armed) {
      setArmed(true);
      setError("");
      return;
    }
    setBusy(action);
    setError("");
    setNote("");
    try {
      const res = await fetch("/api/garage/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "That didn't work. Try again.");
      if (action === "start") {
        router.push(`/garage/newsletter/${data.id}`);
        return;
      }
      setNote(
        action === "test"
          ? `Test sent to ${testInbox || "the test inbox"}: "${data.subject}".`
          : `Sent to ${data.sent} subscriber${data.sent === 1 ? "" : "s"}${data.failed ? ` (${data.failed} failed)` : ""}. The issue is archived as Sent.`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.");
    } finally {
      setBusy("");
      setArmed(false);
    }
  }

  if (!hasDraft) {
    return (
      <div className="garage-review-actions">
        <button type="button" className="btn btn-primary" disabled={Boolean(busy)} onClick={() => run("start")}>
          {busy === "start" ? "Starting…" : "Start this week's issue"}
        </button>
        {error && <p className="garage-error" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <div className="garage-review-actions">
      <div className="garage-decision-row">
        <a href="/garage/newsletter/preview" target="_blank" rel="noopener" className="btn btn-outline btn-sm">
          Preview ↗
        </a>
        <button type="button" className="btn btn-outline btn-sm" disabled={Boolean(busy)} onClick={() => run("test")}>
          {busy === "test" ? "Sending…" : "Send me a test"}
        </button>
      </div>
      <button
        type="button"
        className="btn btn-primary"
        disabled={Boolean(busy) || overCap || !recipients}
        onClick={() => run("live")}
      >
        {busy === "live"
          ? "Sending…"
          : armed
            ? `Tap again: send to ${recipients} subscribers`
            : `Send to ${recipients ?? "–"} subscribers`}
      </button>
      {overCap && (
        <p className="garage-form-note garage-warn">The list is over the email service&apos;s free daily limit. Upgrade Resend before sending.</p>
      )}
      <p className="garage-form-note" aria-live="polite">{note}</p>
      {error && <p className="garage-error" role="alert">{error}</p>}
    </div>
  );
}
