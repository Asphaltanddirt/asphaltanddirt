"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

type Status = "idle" | "submitting" | "success" | "error";

const MAX_QUOTE_LENGTH = 600;

export default function ReviewSubmissionForm() {
  const [rating, setRating] = useState(5);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const busy = status === "submitting";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    // Honeypot — a real visitor never fills this hidden field. Accept quietly so bots
    // don't learn anything, and skip sending an email for it.
    if (data.get("company")) {
      setStatus("success");
      return;
    }

    const payload = {
      name: ((data.get("name") as string) || "").trim(),
      email: ((data.get("email") as string) || "").trim(),
      role: ((data.get("role") as string) || "").trim(),
      quote: ((data.get("quote") as string) || "").trim(),
      rating,
    };

    if (!payload.name || !payload.email || !payload.quote) {
      setErrorMsg("Please fill out your name, email, and review.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      setErrorMsg("A valid email is required.");
      return;
    }

    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/submit-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "Something went wrong. Please try again.");

      track("review_submission", { result: "success" });
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
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
        <h2>Thanks For The Review!</h2>
        <p className="lead" style={{ maxWidth: 480 }}>
          We read every submission by hand. Once it&apos;s approved, it&apos;ll show up on the site
          for the whole community to see.
        </p>
      </div>
    );
  }

  return (
    <form className="build-form" onSubmit={handleSubmit}>
      {/* Honeypot field — hidden from real visitors, bots often fill every input. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }}
      />

      <div className="form-section">
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="name">Full Name</label>
            <input type="text" id="name" name="name" required disabled={busy} />
          </div>
          <div className="form-field">
            <label htmlFor="email">Email <span className="optional">(Never published)</span></label>
            <input type="email" id="email" name="email" required disabled={busy} />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="role">How You Know Us <span className="optional">(Optional)</span></label>
          <select id="role" name="role" disabled={busy} defaultValue="">
            <option value="">Select one</option>
            <option value="Podcast Listener">Podcast Listener</option>
            <option value="Event Attendee">Event Attendee</option>
            <option value="Community Member">Community Member</option>
            <option value="Customer">Customer</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="form-section">
        <div className="form-field">
          <label htmlFor="quote">Your Rating</label>
          <div className="star-input" role="radiogroup" aria-label="Your rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                role="radio"
                aria-checked={n === rating}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                className={n <= rating ? "star-input-btn is-filled" : "star-input-btn"}
                disabled={busy}
                onClick={() => setRating(n)}
              >
                ★
              </button>
            ))}
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="quote">Your Review</label>
          <textarea
            id="quote"
            name="quote"
            required
            maxLength={MAX_QUOTE_LENGTH}
            placeholder="What's your experience with Asphalt & Dirt been like?"
            style={{ minHeight: 140 }}
            disabled={busy}
          />
        </div>
      </div>

      {errorMsg && <p className="form-error-banner">{errorMsg}</p>}

      <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: "fit-content" }}>
        {status === "submitting" ? "Submitting…" : "Submit Your Review"}
      </button>
    </form>
  );
}
