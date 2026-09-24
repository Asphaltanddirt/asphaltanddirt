"use client";

import { useRef, useState } from "react";

/**
 * Call off an event, in one flip.
 *
 * Jose's spec: flip the switch, the email goes out, the prompt comes to me, I
 * build the image, upload it, the system takes it where it can and I take it
 * the rest of the way. Five minutes.
 *
 * So the only things a person does here are: pick cancelled or postponed,
 * type why, confirm — and then attach the graphic when it exists.
 */
type Done = { steps: Record<string, string>; text: string; prompt: string; imageCardId: string; emailed: number };

export default function GarageEventCallOff({ slug, rsvpCount }: { slug: string; rsvpCount: number }) {
  const [kind, setKind] = useState<"cancelled" | "postponed">("cancelled");
  const [newDate, setNewDate] = useState("");
  const [why, setWhy] = useState("");
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const ready = why.trim().length > 0 && (kind === "cancelled" || newDate);

  async function callOff() {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/garage/event/call-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, kind, why, newDate: kind === "postponed" ? newDate : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "That didn't go through.");
      setDone(data);
      setArmed(false);
    } catch (err) {
      setNote(err instanceof Error ? err.message : "That didn't go through.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(file: File) {
    if (!done?.imageCardId) return;
    setBusy(true);
    setNote("");
    try {
      const form = new FormData();
      form.set("id", done.imageCardId);
      form.set("file", file);
      const up = await fetch("/api/garage/social/upload", { method: "POST", body: form });
      if (!up.ok) throw new Error((await up.json()).error || "Upload failed.");

      const post = await fetch("/api/garage/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "post-now", id: done.imageCardId }),
      });
      const data = await post.json().catch(() => ({}));
      setNote(post.ok ? "Image up — Instagram posted. Just the Facebook group left." : data.error || "Image saved, but Instagram didn't post. Open the board.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="garage-panel">
        <h2>Done — {done.emailed} emailed</h2>
        <ul className="garage-form-note">
          {Object.entries(done.steps).map(([k, v]) => (
            <li key={k}>{v}</li>
          ))}
        </ul>

        <h2 className="mt-4">1. Make the graphic</h2>
        <p className="garage-form-note">Send this to Robin. It&apos;s already filled in.</p>
        <textarea rows={8} readOnly value={done.prompt} />
        <button className="btn btn-outline btn-sm" onClick={() => navigator.clipboard?.writeText(done.prompt)}>
          Copy the prompt
        </button>

        <h2 className="mt-4">2. Upload it</h2>
        <p className="garage-form-note">Instagram posts itself the moment the image lands.</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
          disabled={busy || !done.imageCardId}
        />

        <h2 className="mt-4">3. The Facebook group</h2>
        <p className="garage-form-note">The only one nobody can automate — Meta has no Groups posting API.</p>
        <textarea rows={5} readOnly value={done.text} />
        <button className="btn btn-outline btn-sm" onClick={() => navigator.clipboard?.writeText(done.text)}>
          Copy the text
        </button>

        {note && (
          <p className="garage-form-note" role="status">
            {note}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="garage-panel">
      <h2>Call it off</h2>
      <p className="garage-form-note">
        One tap does all of it: the event is marked, {rsvpCount} RSVP{rsvpCount === 1 ? "" : "s"} emailed, the notice
        posted to X, Threads and the Facebook Page, any queued promos held, and the graphic brief handed to you.
      </p>

      <fieldset className="garage-choice-group">
        <legend>Which</legend>
        {(
          [
            ["cancelled", "Cancelled", "It's off."],
            ["postponed", "Postponed", "Moved to another day. Same waiver."],
          ] as const
        ).map(([value, label, help]) => (
          <label key={value} className="garage-choice">
            <input type="radio" name="callOffKind" checked={kind === value} onChange={() => { setKind(value); setArmed(false); }} />
            <span>
              <strong>{label}</strong>
              <small>{help}</small>
            </span>
          </label>
        ))}
      </fieldset>

      {kind === "postponed" && (
        <>
          <label htmlFor="co-date">New date</label>
          <input id="co-date" type="date" value={newDate} onChange={(e) => { setNewDate(e.target.value); setArmed(false); }} />
        </>
      )}

      <label htmlFor="co-why">Why</label>
      <textarea
        id="co-why"
        rows={3}
        value={why}
        onChange={(e) => { setWhy(e.target.value); setArmed(false); }}
        placeholder="Nor'easter is putting the Pine Barrens roads under water."
      />
      <p className="garage-form-note">One or two lines. Everything else is written for you.</p>

      <button
        className={armed ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"}
        onClick={() => (armed ? callOff() : setArmed(true))}
        disabled={busy || !ready}
      >
        {busy ? "Working…" : armed ? "Tap again — this sends everything" : "Call it off"}
      </button>

      {note && (
        <p className="garage-error" role="status">
          {note}
        </p>
      )}
    </div>
  );
}
