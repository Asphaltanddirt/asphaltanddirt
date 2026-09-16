"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EventResponse } from "@/lib/garageEvents";

const CHOICES: EventResponse[] = ["Going", "Maybe", "Can't"];

/** Going / Maybe / Can't for one event. Saves as you tap. */
export default function GarageAnswer({
  slug,
  initialResponse,
}: {
  slug: string;
  initialResponse: EventResponse | null;
}) {
  const router = useRouter();
  const [response, setResponse] = useState<EventResponse | null>(initialResponse);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function choose(next: EventResponse) {
    if (saving) return;
    const previous = response;
    setResponse(next);
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/garage/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventSlug: slug, response: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setResponse(previous);
      setError("Didn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="garage-answer" role="group" aria-label="Your answer">
        {CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            className={response === choice ? "garage-answer-btn active" : "garage-answer-btn"}
            aria-pressed={response === choice}
            onClick={() => choose(choice)}
            disabled={saving}
          >
            {choice}
          </button>
        ))}
      </div>
      {error && <p className="garage-error" role="alert">{error}</p>}
    </>
  );
}
