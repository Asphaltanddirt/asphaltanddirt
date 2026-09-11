"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics";

// How long the "You're In!" confirmation stays up before sending them back
// to the page they subscribed from — long enough to read, not long enough
// to feel stuck.
const REDIRECT_DELAY_MS = 2500;

type Status = "idle" | "submitting" | "success" | "error";

const TOPICS: { value: string; label: string; blurb: string }[] = [
  { value: "Newsletter", label: "The Dirt Line", blurb: "Our weekly newsletter — builds, trails, gear, and community." },
  { value: "Event Updates", label: "Event Updates", blurb: "Hear about new meetups as they're posted, even if you're not in the Facebook group." },
];

export default function SubscribeForm({
  source = "subscribe_page",
  defaultTopics = ["Newsletter"],
  returnTo,
}: {
  source?: string;
  defaultTopics?: string[];
  /** Site-relative path to send them back to after the confirmation shows. */
  returnTo?: string;
}) {
  const router = useRouter();
  const [topics, setTopics] = useState<string[]>(defaultTopics);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [firstNameSubmitted, setFirstNameSubmitted] = useState("");

  const busy = status === "submitting";

  useEffect(() => {
    if (status !== "success" || !returnTo) return;
    const timer = setTimeout(() => router.push(returnTo), REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [status, returnTo, router]);

  function toggleTopic(value: string) {
    setTopics((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);

    // Honeypot — a real visitor never fills this.
    if (data.get("company")) {
      setStatus("success");
      return;
    }

    const firstName = ((data.get("firstName") as string) || "").trim();
    const email = ((data.get("email") as string) || "").trim();
    const phone = ((data.get("phone") as string) || "").trim();

    if (!firstName || !email) {
      setErrorMsg("Please fill out your name and email.");
      setStatus("error");
      return;
    }
    if (topics.length === 0) {
      setErrorMsg("Pick at least one list to join.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, phone: phone || undefined, topics, source }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "Something went wrong. Please try again.");

      track("newsletter_signup", { source, result: result.status, topics: topics.join(",") });
      setFirstNameSubmitted(firstName);
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
        <h2>{firstNameSubmitted ? `You're In, ${firstNameSubmitted}!` : "You're In!"}</h2>
        <p className="lead" style={{ maxWidth: 480 }}>
          {topics.includes("Newsletter")
            ? "Watch your inbox — the welcome email is on its way."
            : "You're set. We'll email you when there's an update."}
        </p>
        {returnTo && (
          <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: "var(--sp-2)" }}>
            Taking you back to where you were…
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
        <div className="form-field">
          <label>What Do You Want To Get? <span className="optional">(Pick at least one)</span></label>
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

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="firstName">First Name</label>
            <input type="text" id="firstName" name="firstName" required disabled={busy} />
          </div>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" name="email" required disabled={busy} />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="phone">Phone <span className="optional">(Optional)</span></label>
          <input type="tel" id="phone" name="phone" placeholder="For the rare day-of update, not spam" disabled={busy} />
        </div>
      </div>

      {errorMsg && <p className="form-error-banner">{errorMsg}</p>}

      <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: "fit-content" }}>
        {busy ? "Joining…" : "Sign Me Up"}
      </button>
    </form>
  );
}
