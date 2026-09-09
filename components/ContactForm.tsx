"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

type Status = "idle" | "submitting" | "success" | "error";

const MAX_MESSAGE_LENGTH = 4000;

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const busy = status === "submitting";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);

    // Honeypot — a real visitor never fills this. Accept quietly.
    if (data.get("company")) {
      setStatus("success");
      return;
    }

    const payload = {
      name: ((data.get("name") as string) || "").trim(),
      email: ((data.get("email") as string) || "").trim(),
      topic: ((data.get("topic") as string) || "").trim(),
      message: ((data.get("message") as string) || "").trim(),
    };

    if (!payload.name || !payload.email || !payload.message) {
      setErrorMsg("Please fill out your name, email, and message.");
      setStatus("error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      setErrorMsg("A valid email is required.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "Something went wrong. Please try again.");

      track("contact_submission", { result: "success", topic: payload.topic || "unset" });
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
        <h2>Message Sent</h2>
        <p className="lead" style={{ maxWidth: 480 }}>
          Thanks for reaching out &mdash; it landed with the team and we&apos;ll get back to you at
          the email you gave us.
        </p>
      </div>
    );
  }

  return (
    <form className="build-form" onSubmit={handleSubmit}>
      {/* Honeypot — hidden from real visitors. */}
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
            <label htmlFor="email">Email</label>
            <input type="email" id="email" name="email" required disabled={busy} />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="topic">What&apos;s It About?</label>
          <select id="topic" name="topic" disabled={busy} defaultValue="Something Else">
            <option value="Podcast">Podcast</option>
            <option value="Events & Partnerships">Events &amp; Partnerships</option>
            <option value="Ambassador Program">Ambassador Program</option>
            <option value="Media & Press">Media &amp; Press</option>
            <option value="Something Else">Something Else</option>
          </select>
        </div>
      </div>

      <div className="form-section">
        <div className="form-field">
          <label htmlFor="message">Message</label>
          <textarea
            id="message"
            name="message"
            required
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="What's on your mind?"
            style={{ minHeight: 150 }}
            disabled={busy}
          />
        </div>
      </div>

      {errorMsg && <p className="form-error-banner">{errorMsg}</p>}

      <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: "fit-content" }}>
        {status === "submitting" ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
