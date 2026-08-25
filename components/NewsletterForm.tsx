"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

export default function NewsletterForm({ source = "footer" }: { source?: string }) {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    track("newsletter_signup", { source });
    setSubmitted(true);
    e.currentTarget.reset();
    setTimeout(() => setSubmitted(false), 2500);
  }

  return (
    <form className="newsletter-form" onSubmit={handleSubmit}>
      <input type="email" placeholder="Enter your email" required />
      <button className="btn btn-primary" type="submit">
        {submitted ? "You're in!" : "Subscribe"}
      </button>
    </form>
  );
}
