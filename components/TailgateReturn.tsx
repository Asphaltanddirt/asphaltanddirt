"use client";

import { useState, useSyncExternalStore } from "react";

/**
 * Top of the Tailgate sign-up page. A phone that already signed up gets
 * "Open Tailgate" instead of the waiver again; anyone else who lost their link
 * can have it emailed to the address they signed up with.
 */

function readSavedLink(slug: string): string {
  try {
    const link = window.localStorage.getItem(`ad-tailgate-link:${slug}`) || "";
    return link.startsWith(`/comms/${slug}?token=`) ? link : "";
  } catch {
    return "";
  }
}

const noSubscribe = () => () => {};

export default function TailgateReturn({ slug }: { slug: string }) {
  const savedLink = useSyncExternalStore(noSubscribe, () => readSavedLink(slug), () => "");
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function resend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setError("");
    try {
      const res = await fetch(`/api/comms/${slug}/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't send that. Try again.");
      setState("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send that. Try again.");
      setState("error");
    }
  }

  return (
    <div className="tailgate-return">
      {savedLink && (
        <div className="tailgate-return-saved">
          <p>
            <strong>This phone is already signed up.</strong> No need to sign again.
          </p>
          <a className="btn btn-primary" href={savedLink}>Open Tailgate</a>
        </div>
      )}

      {!savedLink &&
        (open ? (
          <form className="tailgate-return-form" onSubmit={resend}>
            {state === "sent" ? (
              <p role="status">
                If <strong>{email.trim()}</strong> is signed up for this event, your personal link is on its way. Check
                spam if it isn&apos;t there in a minute.
              </p>
            ) : (
              <>
                <label htmlFor="tg-resend-email">Email you signed up with</label>
                <div className="tailgate-return-row">
                  <input
                    id="tg-resend-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    disabled={state === "sending"}
                  />
                  <button className="btn btn-primary btn-sm" type="submit" disabled={state === "sending"}>
                    {state === "sending" ? "Sending…" : "Email My Link"}
                  </button>
                </div>
                {error && <p className="form-error-banner" role="alert">{error}</p>}
              </>
            )}
          </form>
        ) : (
          <p className="tailgate-return-lost">
            Already signed up?{" "}
            <button type="button" onClick={() => setOpen(true)}>
              Email me my link
            </button>
          </p>
        ))}
    </div>
  );
}
