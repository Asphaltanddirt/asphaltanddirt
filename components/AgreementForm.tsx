"use client";

import { useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { AGREEMENT_VERSION } from "@/lib/ambassadorAgreement";

type Status = "idle" | "submitting" | "accepted" | "already-accepted" | "error";

export default function AgreementForm() {
  const [accepted, setAccepted] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [name, setName] = useState("");

  const busy = status === "submitting";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    if (data.get("company")) {
      setStatus("accepted");
      return;
    }

    const payload = {
      email: ((data.get("email") as string) || "").trim(),
      legalName: ((data.get("legalName") as string) || "").trim(),
      accepted,
    };

    if (!payload.email || !payload.legalName) {
      setErrorMsg("Please enter your ambassador email and full legal name.");
      return;
    }
    if (!accepted) {
      setErrorMsg("Please check the box to confirm you've read and accept the Agreement.");
      return;
    }

    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/accept-agreement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "Something went wrong. Please try again.");

      track("ambassador_agreement", { result: result.status || "accepted" });
      setName(result.name || payload.legalName);
      setStatus(result.status === "already-accepted" ? "already-accepted" : "accepted");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "accepted" || status === "already-accepted") {
    return (
      <div className="form-success">
        <div className="form-success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2>{status === "already-accepted" ? "Already On File" : "Agreement Accepted"}</h2>
        <p className="lead" style={{ maxWidth: 520 }}>
          {status === "already-accepted" ? (
            <>Thanks, {name} — we already have your acceptance on record. Nothing more to do here; your code and tracking link are on their way if they haven&apos;t arrived yet.</>
          ) : (
            <>Thanks, {name}. Your acceptance is recorded. We&apos;ll follow up by email with your personal discount code and tracking link so you can start sharing and earning.</>
          )}
        </p>
        <Link href="/ambassadors" className="btn btn-primary">Back To The Crew</Link>
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
        <div className="form-section-title">Accept The Agreement</div>
        <p className="form-section-hint">
          Use the email address on your acceptance email. Typing your full legal name below is your
          electronic signature.
        </p>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="email">Your A&amp;D Ambassador Email</label>
            <input type="email" id="email" name="email" required disabled={busy} autoComplete="email" />
          </div>
          <div className="form-field">
            <label htmlFor="legalName">Full Legal Name</label>
            <input
              type="text"
              id="legalName"
              name="legalName"
              required
              disabled={busy}
              placeholder="First and last name"
              autoComplete="name"
            />
          </div>
        </div>
        <label className="form-field-consent" htmlFor="accepted">
          <input
            type="checkbox"
            id="accepted"
            name="accepted"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            disabled={busy}
          />
          <span>
            I have read and agree to the Asphalt &amp; Dirt Road &amp; Trail Crew Brand Ambassador
            Agreement above, the Onboarding Guide, and A&amp;D&apos;s safety, conduct, and disclosure
            standards. I understand that personal purchases do not earn commission and that
            participation does not create employment.
          </span>
        </label>
      </div>

      {errorMsg && <p className="form-error-banner">{errorMsg}</p>}

      <button className="btn btn-primary" type="submit" disabled={busy || !accepted} style={{ width: "fit-content" }}>
        {busy ? "Submitting…" : "Accept & Sign"}
      </button>
      <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
        Agreement version {AGREEMENT_VERSION}. Your acceptance, name, email, date, and IP are recorded.
      </p>
    </form>
  );
}
