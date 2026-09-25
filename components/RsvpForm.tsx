"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";
import { requirementsAcceptLabel } from "@/lib/vehicleRules";
import { useOptionalUnchecked } from "@/lib/comfort";

type Status = "idle" | "submitting" | "success" | "error";

export default function RsvpForm({
  slug,
  hasRequirements = false,
  needsVenueWaiver = false,
}: {
  slug: string;
  hasRequirements?: boolean;
  needsVenueWaiver?: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [firstNameSubmitted, setFirstNameSubmitted] = useState("");
  // Both list boxes start ticked (Jose, 2026-09-17) and sit in plain view just
  // above the button, unless Comfort settings asks for optional boxes to
  // start empty. Once someone clicks a box, their click wins.
  const optionalUnchecked = useOptionalUnchecked();
  const [eventUpdatesChoice, setJoinEventUpdatesList] = useState<boolean | null>(null);
  const [newsletterChoice, setJoinNewsletter] = useState<boolean | null>(null);
  const joinEventUpdatesList = eventUpdatesChoice ?? !optionalUnchecked;
  const joinNewsletter = newsletterChoice ?? !optionalUnchecked;
  const [rulesAccepted, setRulesAccepted] = useState(false);

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
    const heardAbout = (data.get("heardAbout") as string) || undefined;
    // Which promo card sent them: `?src=tiktok&v=A` on the link they arrived
    // on. Read at submit time, so the event page itself stays static.
    const params = new URLSearchParams(window.location.search);
    const source = params.get("src")?.toLowerCase().slice(0, 30) || undefined;
    const variant = params.get("v")?.toUpperCase() || undefined;

    if (!name || !email || phone.replace(/\D/g, "").length < 10) {
      setErrorMsg("Please fill out your name, email and a phone number we can reach you at on the day.");
      setStatus("error");
      return;
    }

    if (hasRequirements && !rulesAccepted) {
      setErrorMsg("Please read the Requirements above and tick the box to agree.");
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
          phone,
          alreadyInFbGroup,
          joinEventUpdatesList,
          joinNewsletter,
          requirementsAccepted: hasRequirements ? rulesAccepted : undefined,
          source,
          variant,
          heardAbout,
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

  const joinedLists = [joinEventUpdatesList ? "Event Updates" : "", joinNewsletter ? "The Dirt Line" : ""].filter(Boolean);

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
        <p style={{ maxWidth: 480 }}>
          <a href={`/events/${slug}/calendar.ics`} className="btn btn-outline btn-sm">
            Add to calendar
          </a>
        </p>
        {joinedLists.length > 0 && (
          <p style={{ maxWidth: 480 }}>
            You&apos;re also on {joinedLists.join(" and ")}. Every email has an unsubscribe link if you change your mind.
          </p>
        )}
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
            <input autoComplete="name" type="text" id="rsvp-name" name="name" required disabled={busy} />
          </div>
          <div className="form-field">
            <label htmlFor="rsvp-email">Email</label>
            <input autoComplete="email" type="email" id="rsvp-email" name="email" required disabled={busy} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="rsvp-phone">Phone</label>
            <input
              type="tel"
              id="rsvp-phone"
              name="phone"
              autoComplete="tel"
              required
              aria-describedby="rsvp-phone-help"
              disabled={busy}
            />
            <small id="rsvp-phone-help" className="form-help">Staff only, so we can reach you on the day. Never shown to other riders.</small>
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
          <label htmlFor="rsvp-heard">
            How Did You Hear About This? <span className="optional">(Optional)</span>
          </label>
          <select id="rsvp-heard" name="heardAbout" disabled={busy} defaultValue="">
            <option value="">Pick one if you like</option>
            {["TikTok", "Instagram", "Facebook", "X", "Threads", "YouTube", "Newsletter", "Friend", "Other"].map((o) => (
              <option key={o} value={o}>
                {o === "Friend" ? "A friend" : o}
              </option>
            ))}
          </select>
        </div>
        {hasRequirements && (
          <div className="form-field">
            <label id="rsvp-group-1">
              Requirements <span className="optional">(Required)</span>
            </label>
            <div className="form-checkbox-group form-checkbox-group-stacked" role="group" aria-labelledby="rsvp-group-1">
              <label className={`form-checkbox${rulesAccepted ? " has-check" : ""}`}>
                <input
                  type="checkbox"
                  name="requirementsAccepted"
                  checked={rulesAccepted}
                  onChange={(e) => setRulesAccepted(e.target.checked)}
                  required
                  disabled={busy}
                />
                {requirementsAcceptLabel(needsVenueWaiver)}
              </label>
            </div>
          </div>
        )}
        <div className="form-field">
          <label id="rsvp-group-2">While You&apos;re Here <span className="optional">(Optional)</span></label>
          <small id="rsvp-lists-help" className="form-help">
            {joinEventUpdatesList || joinNewsletter
              ? "Untick anything you don't want. You can unsubscribe from any email later."
              : "Tick either one if you'd like email from us."}
          </small>
          <div className="form-checkbox-group form-checkbox-group-stacked" role="group" aria-labelledby="rsvp-group-2" aria-describedby="rsvp-lists-help">
            <label className={`form-checkbox${joinEventUpdatesList ? " has-check" : ""}`}>
              <input
                type="checkbox"
                name="joinEventUpdatesList"
                checked={joinEventUpdatesList}
                onChange={(e) => setJoinEventUpdatesList(e.target.checked)}
                disabled={busy}
              />
              Add me to Event Updates: an email when a new meetup is posted
            </label>
            <label className={`form-checkbox${joinNewsletter ? " has-check" : ""}`}>
              <input
                type="checkbox"
                name="joinNewsletter"
                checked={joinNewsletter}
                onChange={(e) => setJoinNewsletter(e.target.checked)}
                disabled={busy}
              />
              Add me to The Dirt Line: our weekly newsletter
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
