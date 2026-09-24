"use client";

import { useState } from "react";

/**
 * "Tell everyone who RSVP'd." Cancelled, postponed, meetup moved.
 *
 * Test first, always — the live send has no undo. The button only offers the
 * live send once a test has actually gone out, because the one time this gets
 * used in a hurry is the one time nobody re-reads it.
 */
export default function GarageEventUpdate({ slug, rsvpCount }: { slug: string; rsvpCount: number | null }) {
  const [kind, setKind] = useState<"cancelled" | "postponed" | "update">("update");
  const [newDate, setNewDate] = useState("");
  const [message, setMessage] = useState("");
  const [tested, setTested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function send(mode: "test" | "live") {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/garage/event/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, message, mode, kind, newDate: kind === "postponed" ? newDate : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "That didn't send.");
      if (mode === "test") {
        setTested(true);
        setNote("Test sent to you. Read it, then send it for real.");
      } else {
        setNote(`Sent to ${data.sent} of ${data.total}.${data.failed ? ` ${data.failed} failed.` : ""}`);
        setTested(false);
        setMessage("");
      }
    } catch (err) {
      setNote(err instanceof Error ? err.message : "That didn't send.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="garage-panel">
      <h2>Tell everyone who RSVP&apos;d</h2>
      <p className="garage-form-note">
        {rsvpCount === null ? "Goes to every confirmed RSVP." : `Goes to all ${rsvpCount} confirmed RSVP${rsvpCount === 1 ? "" : "s"}.`}{" "}
        Write only the reason. The email already says what happened and what it means for their waiver.
      </p>

      <fieldset className="garage-choice-group">
        <legend>What happened</legend>
        {(
          [
            ["update", "An update", "Meetup moved, bring tire chains, running late."],
            ["cancelled", "Cancelled", "It's off. The email says their waiver stays on file."],
            ["postponed", "Postponed", "Moved to another day. Same waiver, new date."],
          ] as const
        ).map(([value, label, help]) => (
          <label key={value} className="garage-choice">
            <input
              type="radio"
              name="updateKind"
              checked={kind === value}
              onChange={() => {
                setKind(value);
                setTested(false);
              }}
            />
            <span>
              <strong>{label}</strong>
              <small>{help}</small>
            </span>
          </label>
        ))}
      </fieldset>

      {kind === "postponed" && (
        <>
          <label htmlFor="ev-newdate">New date</label>
          <input
            id="ev-newdate"
            type="date"
            value={newDate}
            onChange={(e) => {
              setNewDate(e.target.value);
              setTested(false);
            }}
          />
          <p className="garage-form-note">Leave it blank if the new date isn&apos;t settled — the email will say so.</p>
        </>
      )}

      <label htmlFor="ev-update">Why</label>
      <textarea
        id="ev-update"
        rows={5}
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          setTested(false);
        }}
        placeholder={"The nor'easter is forecast to put the Pine Barrens roads under water, and state forest rules keep us on mapped roads — there won't be any worth running."}
      />

      <div className="card-actions mt-2">
        <button className="btn btn-outline btn-sm" onClick={() => send("test")} disabled={busy || !message.trim()}>
          {busy ? "Sending…" : "Send me a test"}
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => send("live")} disabled={busy || !tested}>
          Send to everyone
        </button>
      </div>

      {!tested && message.trim() && <p className="garage-form-note">Send yourself a test first.</p>}
      {note && (
        <p className="garage-form-note" role="status">
          {note}
        </p>
      )}
      <p className="garage-form-note">
        This is the email half. The people who never RSVP&apos;d found the event on social — post it there too.
      </p>
    </div>
  );
}
