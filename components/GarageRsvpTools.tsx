"use client";

import { useState } from "react";

/**
 * Staff tools under the Garage RSVP list (punchlist 19, 2026-09-25):
 * copy every phone number in one go (for a group text on event day), and,
 * after a postponement, remind the people who haven't answered the new date.
 */
export default function GarageRsvpTools({ slug, phones, waiting }: { slug: string; phones: string[]; waiting: number }) {
  const [note, setNote] = useState("");
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function copyPhones() {
    const text = phones.join(", ");
    try {
      await navigator.clipboard.writeText(text);
      setNote(`Copied ${phones.length} number${phones.length === 1 ? "" : "s"}.`);
    } catch {
      setNote(text);
    }
  }

  async function remind() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/garage/event/reconfirm-remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't send the reminders.");
      setNote(`Reminder sent to ${data.sent}${data.failed ? ` (${data.failed} failed)` : ""}.`);
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Couldn't send the reminders.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="garage-rsvp-tools">
      <div className="card-actions">
        {phones.length > 0 && (
          <button type="button" className="btn btn-outline btn-sm" onClick={copyPhones}>
            Copy phone numbers
          </button>
        )}
        {waiting > 0 && (
          <button type="button" className={armed ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"} onClick={remind} disabled={busy}>
            {busy ? "Sending…" : armed ? `Tap again to email ${waiting}` : `Remind the ${waiting} who haven't answered`}
          </button>
        )}
      </div>
      {note && (
        <p className="garage-form-note" role="status">
          {note}
        </p>
      )}
    </div>
  );
}
