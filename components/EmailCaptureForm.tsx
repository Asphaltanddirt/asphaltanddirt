"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

type Status = "idle" | "loading" | "success" | "error";

export default function EmailCaptureForm({
  source,
  buttonText = "Subscribe",
  placeholder = "Enter your email",
  className = "newsletter-form",
}: {
  /** Where on the site this form lives — tagged on the subscription for segmentation later. */
  source: string;
  buttonText?: string;
  placeholder?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = new FormData(form).get("email") as string;

    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");

      track("newsletter_signup", { source, result: data.status });
      setStatus("success");
      form.reset();
      setTimeout(() => setStatus("idle"), 4000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  }

  return (
    <form className={className} onSubmit={handleSubmit} style={{ flexWrap: "wrap" }}>
      <input type="email" name="email" placeholder={placeholder} required disabled={status === "loading"} />
      <button className="btn btn-primary" type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Sending…" : status === "success" ? "You're In!" : buttonText}
      </button>
      {status === "error" && (
        <p style={{ fontSize: 12, color: "var(--accent)", margin: "6px 0 0", width: "100%" }}>{errorMsg}</p>
      )}
    </form>
  );
}
