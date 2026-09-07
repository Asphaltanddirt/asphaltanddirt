"use client";

import { useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { AGREEMENT_VERSION } from "@/lib/ambassadorAgreement";

type Status = "idle" | "submitting" | "accepted" | "already-accepted" | "error";

const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

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

    const field = (key: string) => ((data.get(key) as string) || "").trim();
    const payload = {
      email: field("email"),
      legalName: field("legalName"),
      phone: field("phone"),
      instagram: field("instagram"),
      otherSocials: field("otherSocials"),
      vehicle: field("vehicle"),
      shippingAddress: field("shippingAddress"),
      shirtSize: field("shirtSize"),
      accepted,
    };

    const missing = !payload.email || !payload.legalName || !payload.phone || !payload.instagram || !payload.vehicle || !payload.shippingAddress || !payload.shirtSize;
    if (missing) {
      setErrorMsg("Please fill in every field so we can finish setting you up.");
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
        <h2>{status === "already-accepted" ? "Already On File" : "You're All Set"}</h2>
        <p className="lead" style={{ maxWidth: 520 }}>
          {status === "already-accepted" ? (
            <>Thanks, {name} — we already have your acceptance on record. If anything needs updating, email crew@asphaltanddirt.com.</>
          ) : (
            <>Thanks, {name}. Your acceptance and details are recorded. We&apos;ll get your welcome kit
            in the mail and follow up by email with your personal discount code and tracking link.</>
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

      {/* Confirm details */}
      <div className="form-section">
        <div className="form-section-title">Confirm Your Details</div>
        <p className="form-section-hint">
          Quick check that everything&apos;s current — this is what we&apos;ll use for your ambassador
          profile and to reach you.
        </p>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="email">Your A&amp;D Ambassador Email</label>
            <input type="email" id="email" name="email" required disabled={busy} autoComplete="email" />
            <p className="form-section-hint" style={{ marginTop: 4 }}>Use the address on your acceptance email.</p>
          </div>
          <div className="form-field">
            <label htmlFor="phone">Phone Number</label>
            <input type="tel" id="phone" name="phone" required disabled={busy} placeholder="(555) 123-4567" autoComplete="tel" />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="instagram">Instagram Handle</label>
          <input type="text" id="instagram" name="instagram" required disabled={busy} placeholder="@yourhandle" autoComplete="off" />
        </div>
        <div className="form-field">
          <label htmlFor="otherSocials">Other Social Links <span className="optional">(Optional — one per line)</span></label>
          <textarea id="otherSocials" name="otherSocials" disabled={busy} placeholder={"TikTok: https://tiktok.com/@you\nYouTube: https://youtube.com/@you"} />
        </div>
        <div className="form-field">
          <label htmlFor="vehicle">Your Primary Vehicle / Build</label>
          <input type="text" id="vehicle" name="vehicle" required disabled={busy} placeholder="e.g. 2026 Jeep Wrangler Rubicon XR" />
        </div>
      </div>

      {/* Shipping */}
      <div className="form-section">
        <div className="form-section-title">Where To Ship Your Welcome Kit</div>
        <p className="form-section-hint">Patch, stickers, and a shirt — on us.</p>
        <div className="form-field">
          <label htmlFor="shippingAddress">Shipping Address</label>
          <textarea
            id="shippingAddress"
            name="shippingAddress"
            required
            disabled={busy}
            placeholder={"Full name\nStreet address\nCity, State ZIP\nCountry"}
            style={{ minHeight: 110 }}
          />
        </div>
        <div className="form-field" style={{ maxWidth: 200 }}>
          <label htmlFor="shirtSize">Shirt Size</label>
          <select id="shirtSize" name="shirtSize" required disabled={busy} defaultValue="">
            <option value="" disabled>Select one</option>
            {SHIRT_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Accept */}
      <div className="form-section">
        <div className="form-section-title">Accept The Agreement</div>
        <div className="form-field">
          <label htmlFor="legalName">Full Legal Name</label>
          <input
            type="text"
            id="legalName"
            name="legalName"
            required
            disabled={busy}
            placeholder="Typing your name here is your electronic signature"
            autoComplete="name"
          />
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
