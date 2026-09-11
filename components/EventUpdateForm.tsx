"use client";

import { useEffect, useState } from "react";

type Status = "idle" | "sending" | "error";

interface EventOption {
  slug: string;
  title: string;
  date: string;
}

interface SendResult {
  mode: "test" | "live";
  recipients: number;
  sent: number;
  failed: number;
  skipped?: string;
}

const KEY_STORAGE = "ad_admin_key";

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function EventUpdateForm({ events }: { events: EventOption[] }) {
  const [adminKey, setAdminKey] = useState("");
  const [slug, setSlug] = useState(events[0]?.slug || "");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<SendResult | null>(null);

  // Convenience only — remembered per-browser so you're not retyping the
  // admin key every send. Never sent anywhere but this page's own fetch.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY_STORAGE);
      if (saved) setAdminKey(saved);
    } catch {
      // sessionStorage unavailable (private mode, etc.) — fine, just retype it
    }
  }, []);

  async function send(mode: "test" | "live") {
    if (!adminKey.trim()) {
      setErrorMsg("Enter the admin key first.");
      setStatus("error");
      return;
    }
    if (!slug || !message.trim()) {
      setErrorMsg("Pick an event and write a message.");
      setStatus("error");
      return;
    }
    if (mode === "live" && !window.confirm("This emails everyone who RSVP'd to this event, right now. Continue?")) {
      return;
    }

    setStatus("sending");
    setErrorMsg("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/send-event-update", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminKey.trim()}` },
        body: JSON.stringify({ slug, message: message.trim(), mode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Send failed.");

      try {
        sessionStorage.setItem(KEY_STORAGE, adminKey.trim());
      } catch {
        // fine to skip remembering it
      }
      setResult(data);
      setStatus("idle");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Send failed.");
      setStatus("error");
    }
  }

  const busy = status === "sending";

  return (
    <div className="build-form">
      <div className="form-section">
        <div className="form-field">
          <label htmlFor="admin-key">Admin Key</label>
          <input
            type="password"
            id="admin-key"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            disabled={busy}
            autoComplete="off"
          />
        </div>
        <div className="form-field">
          <label htmlFor="event-slug">Event</label>
          <select id="event-slug" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={busy}>
            {events.length === 0 && <option value="">No published events</option>}
            {events.map((e) => (
              <option key={e.slug} value={e.slug}>
                {e.title} — {formatDate(e.date)}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="update-message">Message</label>
          <textarea
            id="update-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ minHeight: 150 }}
            placeholder="Heads up — meetup spot moved to..."
            disabled={busy}
          />
        </div>
      </div>

      {errorMsg && <p className="form-error-banner">{errorMsg}</p>}
      {result && (
        <p style={{ fontSize: 14, color: "var(--accent)" }}>
          {result.mode === "test"
            ? "Test sent to your inbox."
            : result.skipped
              ? result.skipped
              : `Sent to ${result.sent} of ${result.recipients} RSVPs${result.failed ? ` (${result.failed} failed)` : ""}.`}
        </p>
      )}

      <div style={{ display: "flex", gap: "var(--sp-2)", flexWrap: "wrap" }}>
        <button className="btn" type="button" disabled={busy} onClick={() => send("test")}>
          {busy ? "Sending…" : "Send Test To Me"}
        </button>
        <button className="btn btn-primary" type="button" disabled={busy} onClick={() => send("live")}>
          {busy ? "Sending…" : "Send To All RSVPs"}
        </button>
      </div>
    </div>
  );
}
