"use client";

import { useState } from "react";

const TOPICS: { value: string; label: string; blurb: string }[] = [
  { value: "Newsletter", label: "The Dirt Line", blurb: "Our weekly newsletter — builds, trails, gear, and community." },
  { value: "Event Updates", label: "Event Updates", blurb: "New meetups as they're posted." },
];

type Status = "idle" | "saving" | "saved" | "unsubscribed" | "error";

export default function ManageForm({ token, initialTopics }: { token: string; initialTopics: string[] }) {
  const [topics, setTopics] = useState<string[]>(initialTopics);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const busy = status === "saving";

  function toggleTopic(value: string) {
    setTopics((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]));
  }

  async function save(nextTopics: string[]) {
    setStatus("saving");
    setErrorMsg("");
    try {
      const res = await fetch("/api/newsletter/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, topics: nextTopics }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "Something went wrong. Please try again.");
      setTopics(nextTopics);
      setStatus(nextTopics.length === 0 ? "unsubscribed" : "saved");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "unsubscribed") {
    return (
      <div className="form-success">
        <h2>You&apos;re Unsubscribed</h2>
        <p className="lead" style={{ maxWidth: 480 }}>
          You won&apos;t get any more emails from us. Changed your mind? Just check a box below to
          rejoin.
        </p>
        <button className="btn btn-primary" style={{ marginTop: "var(--sp-3)" }} onClick={() => setStatus("idle")}>
          Actually, Let Me Pick
        </button>
      </div>
    );
  }

  return (
    <div className="build-form">
      <div className="form-section">
        <div className="form-field">
          <label>What You&apos;re Getting</label>
          <div className="form-checkbox-group form-checkbox-group-stacked">
            {TOPICS.map((topic) => (
              <label className={`form-checkbox${topics.includes(topic.value) ? " has-check" : ""}`} key={topic.value}>
                <input
                  type="checkbox"
                  checked={topics.includes(topic.value)}
                  onChange={() => toggleTopic(topic.value)}
                  disabled={busy}
                />
                <span>
                  <strong>{topic.label}</strong>
                  <br />
                  <span style={{ fontWeight: 400, fontSize: 13, color: "var(--text-muted)" }}>{topic.blurb}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {status === "saved" && <p style={{ color: "var(--accent)", fontSize: 14 }}>Saved.</p>}
      {errorMsg && <p className="form-error-banner">{errorMsg}</p>}

      <div style={{ display: "flex", gap: "var(--sp-2)", flexWrap: "wrap" }}>
        <button className="btn btn-primary" disabled={busy} onClick={() => save(topics)}>
          {busy ? "Saving…" : "Save Preferences"}
        </button>
        <button className="btn" disabled={busy} onClick={() => save([])}>
          Unsubscribe From Everything
        </button>
      </div>
    </div>
  );
}
