"use client";

import { useState } from "react";

export default function WaiverForm({ slug, eventTitle }: { slug: string; eventTitle: string }) {
  const [screenName, setScreenName] = useState("");
  const [vehicleCallsign, setVehicleCallsign] = useState("");
  const [legalName, setLegalName] = useState("");
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const busy = status === "submitting";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!agreed) {
      setError("You must agree to the waiver to continue.");
      return;
    }
    setStatus("submitting");
    setError("");
    try {
      const res = await fetch(`/api/comms/${slug}/waiver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screenName, vehicleCallsign, legalName, email, agreed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="form-success">
        <div className="form-success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2>You&apos;re Registered</h2>
        <p className="lead" style={{ maxWidth: 480 }}>
          Check your email — we just sent your personal link to the group chat for {eventTitle}.
        </p>
      </div>
    );
  }

  return (
    <form className="build-form" onSubmit={handleSubmit}>
      <div className="form-section">
        <div className="form-section-title">Waiver &amp; Release</div>
        {/* PLACEHOLDER — swap in the real waiver text before this goes live. */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "16px 20px",
            maxHeight: 240,
            overflowY: "auto",
            fontSize: 13,
            lineHeight: 1.6,
            color: "var(--text-dim)",
          }}
        >
          <p>
            <strong>[Placeholder waiver text — replace before this goes live.]</strong> By registering, you
            acknowledge that off-road driving and group rides carry inherent risk of injury or property damage,
            and you voluntarily assume that risk for yourself and your vehicle. You release Asphalt &amp; Dirt,
            its hosts, and other participants from liability for injury or damage arising from your
            participation, to the extent permitted by law. You agree to follow staff instructions and operate
            your vehicle within your own skill level and your vehicle&apos;s capabilities.
          </p>
        </div>
      </div>

      <div className="form-section">
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="waiver-legal-name">Full Legal Name</label>
            <input id="waiver-legal-name" value={legalName} onChange={(e) => setLegalName(e.target.value)} required disabled={busy} maxLength={80} />
          </div>
          <div className="form-field">
            <label htmlFor="waiver-email">Email <span className="optional">(Your chat link goes here)</span></label>
            <input id="waiver-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} maxLength={80} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="waiver-screen-name">Screen Name <span className="optional">(shown in chat)</span></label>
            <input id="waiver-screen-name" value={screenName} onChange={(e) => setScreenName(e.target.value)} required disabled={busy} maxLength={60} />
          </div>
          <div className="form-field">
            <label htmlFor="waiver-vehicle">Vehicle / Callsign</label>
            <input
              id="waiver-vehicle"
              value={vehicleCallsign}
              onChange={(e) => setVehicleCallsign(e.target.value)}
              placeholder="e.g. Red JK, Rock Rhino"
              required
              disabled={busy}
              maxLength={60}
            />
          </div>
        </div>
      </div>

      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "var(--text-dim)" }}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          disabled={busy}
          style={{ marginTop: 3, flex: "none" }}
        />
        I have read and agree to the waiver above.
      </label>

      {error && <p className="form-error-banner">{error}</p>}

      <button className="btn btn-primary" type="submit" disabled={busy || !agreed} style={{ width: "fit-content" }}>
        {busy ? "Submitting…" : "Register For The Chat"}
      </button>
    </form>
  );
}
