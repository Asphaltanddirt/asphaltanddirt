"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

type Status = "idle" | "submitting" | "success" | "error";

const MAX_NOTES_LENGTH = 1000;

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function ContentSubmissionForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const busy = status === "submitting";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    // Honeypot — a real visitor never fills this hidden field. Accept quietly so bots
    // don't learn anything, and skip sending anything for it.
    if (data.get("company")) {
      setStatus("success");
      return;
    }

    const payload = {
      email: ((data.get("email") as string) || "").trim(),
      month: ((data.get("month") as string) || "").trim(),
      contentType: ((data.get("contentType") as string) || "").trim(),
      link: ((data.get("link") as string) || "").trim(),
      notes: ((data.get("notes") as string) || "").trim(),
    };

    if (!payload.email || !payload.month || !payload.contentType || !payload.link) {
      setErrorMsg("Please fill out all required fields.");
      return;
    }

    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/submit-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "Something went wrong. Please try again.");

      track("content_submission", { result: "success" });
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
        <h2>Submission Received!</h2>
        <p className="lead" style={{ maxWidth: 480 }}>
          Thanks for contributing. We review every submission by hand — approved content may show up
          across A&amp;D&apos;s social channels, the website, or the newsletter.
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
            <label htmlFor="email">Your A&amp;D Ambassador Email</label>
            <input type="email" id="email" name="email" required disabled={busy} />
          </div>
          <div className="form-field">
            <label htmlFor="month">Month</label>
            <input type="month" id="month" name="month" defaultValue={currentMonth()} required disabled={busy} />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="contentType">Content Type</label>
          <select id="contentType" name="contentType" required disabled={busy} defaultValue="">
            <option value="" disabled>Select a type</option>
            <option value="Photo">Photo</option>
            <option value="Video">Video</option>
            <option value="Written Story">Written Story</option>
            <option value="Event Coverage">Event Coverage</option>
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="link">Link To Your Content</label>
          <input
            type="url"
            id="link"
            name="link"
            placeholder="A link to the post, video, or file (Drive, Dropbox, Instagram, TikTok, YouTube, etc.)"
            required
            disabled={busy}
          />
        </div>
        <div className="form-field">
          <label htmlFor="notes">Notes <span className="optional">(Optional)</span></label>
          <textarea
            id="notes"
            name="notes"
            maxLength={MAX_NOTES_LENGTH}
            placeholder="Any context worth knowing — what it is, where it was shot, anything we should know."
            style={{ minHeight: 120 }}
            disabled={busy}
          />
        </div>
      </div>

      {errorMsg && <p className="form-error-banner">{errorMsg}</p>}

      <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: "fit-content" }}>
        {status === "submitting" ? "Submitting…" : "Submit Content"}
      </button>
    </form>
  );
}
