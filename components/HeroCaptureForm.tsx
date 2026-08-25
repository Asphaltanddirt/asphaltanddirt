"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

export default function HeroCaptureForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    track("newsletter_signup", { source: "home_hero" });
    setSubmitted(true);
    e.currentTarget.reset();
    setTimeout(() => setSubmitted(false), 2500);
  }

  return (
    <div className="capture-box">
      <div className="kicker">
        The Crew. The Community. The Movement.
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
        </svg>
      </div>
      <p style={{ margin: 0, fontSize: 14 }}>
        New episodes, behind-the-scenes, event drops, gear picks &amp; exclusive community updates.
      </p>
      <form className="capture-form" onSubmit={handleSubmit}>
        <input type="email" placeholder="Your email gets you in." required />
        <button className="btn btn-primary" type="submit">
          {submitted ? "You're In!" : "I Want In"}
        </button>
      </form>
      <p className="fine-print">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="9" rx="1.5" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        No Spam, No BS, No Fluff … Real Updates!
      </p>
    </div>
  );
}
