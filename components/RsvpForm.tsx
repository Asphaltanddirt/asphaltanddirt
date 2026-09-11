"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

type Status = "idle" | "submitting" | "success" | "error";

export default function RsvpForm({ slug }: { slug: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [firstNameSubmitted, setFirstNameSubmitted] = useState("");
  const [joinEventUpdatesList, setJoinEventUpdatesList] = useState(true);
  const [joinNewsletter, setJoinNewsletter] = useState(false);

  const busy = status === "submitting";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);

    if (data.get("company")) {
      setStatus("success");
      return;
    }

    const name = ((data.get("name") as string) || "").trim();
    const email = ((data.get("email") as string) || "").trim();
    const phone = ((data.get("phone") as string) || "").trim();
    const alreadyInFbGroup = (data.get("alreadyInFbGroup") as string) || "Not Sure";

    if (!name || !email) {
      setErrorMsg("Please fill out your name and email.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/events/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name,
          email,
          phone: phone || undefined,
          alreadyInFbGroup,
          joinEventUpdatesList,
          joinNewsletter,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "Something went wrong. Please try again.");

      track("event_rsvp", { slug, alreadyInFbGroup, joinEventUpdatesList, joinNewsletter });
      setFirstNameSubmitted(name.split(/\s+/)[0]);
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
        <h2>{firstNameSubmitted ? `You're In, ${firstNameSubmitted}!` : "You're Confirmed!"}</h2>
        <p className="lead" style={{ maxWidth: 480 }}>
          Check your email for the meetup details — we just sent them to you.
        </p>
      </div>
    );
  }

  return (
    <form className="build-form" onSubmit={handleSubmit}>
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
            <label htmlFor="rsvp-name">Name</label>
            <input type="text" id="rsvp-name" name="name" required disabled={busy} />
          </div>
          <div className="form-field">
            <label htmlFor="rsvp-email">Email</label>
            <input type="email" id="rsvp-email" name="email" required disabled={busy} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="rsvp-phone">Phone <span className="optional">(Optional)</span></label>
            <input type="tel" id="rsvp-phone" name="phone" placeholder="For the rare day-of update" disabled={busy} />
          </div>
          <div className="form-field">
            <label htmlFor="rsvp-fb">Already In Our Facebook Group?</label>
            <select id="rsvp-fb" name="alreadyInFbGroup" disabled={busy} defaultValue="Not Sure">
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="Not Sure">Not Sure</option>
            </select>
          </div>
        </div>
        <div className="form-field">
          <label>While You're Here <span className="optional">(Optional)</span></label>
          <div className="form-checkbox-group form-checkbox-group-stacked">
            <label className={`form-checkbox${joinEventUpdatesList ? " has-check" : ""}`}>
              <input
                type="checkbox"
                name="joinEventUpdatesList"
                checked={joinEventUpdatesList}
                onChange={(e) => setJoinEventUpdatesList(e.target.checked)}
                disabled={busy}
              />
              Also add me to the Event Updates list for future meetups
            </label>
            <label className={`form-checkbox${joinNewsletter ? " has-check" : ""}`}>
              <input
                type="checkbox"
                name="joinNewsletter"
                checked={joinNewsletter}
                onChange={(e) => setJoinNewsletter(e.target.checked)}
                disabled={busy}
              />
              Add me to The Dirt Line — the weekly newsletter
            </label>
          </div>
        </div>
      </div>

      {errorMsg && <p className="form-error-banner">{errorMsg}</p>}

      <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
        {busy ? "Submitting…" : "RSVP"}
      </button>
    </form>
  );
}
