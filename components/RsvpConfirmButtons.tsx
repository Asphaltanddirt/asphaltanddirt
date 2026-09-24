"use client";

import { useState } from "react";

/** Three buttons, one tap, no form. Changing your mind is just tapping another. */
export default function RsvpConfirmButtons({
  id,
  slug,
  date,
  token,
  initial,
}: {
  id: string;
  slug: string;
  date: string;
  token: string;
  initial: string;
}) {
  const [answer, setAnswer] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function answerWith(value: "Yes" | "No" | "Not sure") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${slug}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, date, token, answer: value }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "That didn't save.");
      setAnswer(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't save.");
    } finally {
      setBusy(false);
    }
  }

  const said =
    answer === "Yes"
      ? "You're in. See you there."
      : answer === "No"
        ? "No problem — you're off the list for this one."
        : answer === "Not sure"
          ? "Noted. Come back and tap Yes or No whenever you know."
          : "";

  return (
    <div className="mt-4">
      <div className="card-actions" style={{ flexWrap: "wrap", gap: 10 }}>
        {(["Yes", "No", "Not sure"] as const).map((value) => (
          <button
            key={value}
            className={answer === value ? "btn btn-primary" : "btn btn-outline"}
            onClick={() => answerWith(value)}
            disabled={busy}
          >
            {value === "Yes" ? "Yes, I'm in" : value === "No" ? "Can't make it" : "Not sure yet"}
          </button>
        ))}
      </div>

      {said && (
        <p className="mt-3" role="status">
          <strong>{said}</strong>
          {answer && " Changed your mind? Tap another one."}
        </p>
      )}
      {error && <p className="mt-3" style={{ color: "var(--accent)" }}>{error}</p>}
    </div>
  );
}
