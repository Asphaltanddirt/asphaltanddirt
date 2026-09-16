"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { GarageReminder } from "@/lib/garageReminders";

/** Reminders on the home screen, plus a small form to add your own — nobody
 *  should have to ask Claude to set one. */
export default function GarageReminders({ reminders, today }: { reminders: GarageReminder[]; today: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", date: "", repeat: "None", audience: "Just me", notes: "" });

  async function send(body: Record<string, string>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/garage/reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (await send({ action: "add", ...form })) {
      setForm({ title: "", date: "", repeat: "None", audience: "Just me", notes: "" });
      setOpen(false);
    }
  }

  const label = (date: string) => {
    if (date < today) return "Overdue";
    if (date === today) return "Today";
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <>
      {error && <p className="garage-error" role="alert">{error}</p>}

      {reminders.length > 0 && (
        <ul className="garage-tasks">
          {reminders.map((reminder) => (
            <li key={reminder.id} className="garage-task">
              <span className="garage-task-main">
                <span className="garage-task-title">{reminder.title}</span>
                {reminder.notes && <span className="garage-task-details">{reminder.notes}</span>}
              </span>
              <span className={reminder.date < today ? "garage-task-when late" : "garage-task-when"}>
                {label(reminder.date)}
              </span>
              <button
                type="button"
                className="garage-photo-btn"
                disabled={busy}
                onClick={() => send({ action: "done", id: reminder.id })}
              >
                Done
              </button>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <form className="garage-form garage-panel" onSubmit={add}>
          <label htmlFor="r-title">Remind me to…</label>
          <input
            id="r-title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            maxLength={120}
          />

          <label htmlFor="r-date">When</label>
          <input
            id="r-date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />

          <label htmlFor="r-repeat">Repeat</label>
          <select id="r-repeat" value={form.repeat} onChange={(e) => setForm({ ...form, repeat: e.target.value })}>
            <option>None</option>
            <option>Monthly</option>
            <option>Quarterly</option>
            <option>Yearly</option>
          </select>

          <label htmlFor="r-who">Who sees it</label>
          <select id="r-who" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
            <option>Just me</option>
            <option>Owners</option>
            <option>Everyone</option>
          </select>

          <label htmlFor="r-notes">Notes</label>
          <textarea
            id="r-notes"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            maxLength={1000}
          />

          <div className="garage-answer">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Add reminder"}
            </button>
            <button className="btn btn-outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="garage-add" onClick={() => setOpen(true)}>
          + Add a reminder
        </button>
      )}
    </>
  );
}
