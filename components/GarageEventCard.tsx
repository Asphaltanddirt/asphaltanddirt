"use client";

import Link from "next/link";
import { useState } from "react";
import type { EventResponse } from "@/lib/garageEvents";

const CHOICES: EventResponse[] = ["Going", "Maybe", "Can't"];

/** One event in the Garage: the crew's own answer, who else is in, and the
 *  private meetup details that never show on the public event page. */
export default function GarageEventCard({
  slug,
  title,
  date,
  area,
  blurb,
  meetup,
  details,
  rsvps,
  initialResponse,
  others,
  isPast,
}: {
  slug: string;
  title: string;
  date: string;
  area: string;
  blurb: string;
  meetup: string;
  details: string;
  /** How many people have RSVP'd through the public form. */
  rsvps: number | null;
  initialResponse: EventResponse | null;
  others: { name: string; response: EventResponse }[];
  isPast: boolean;
}) {
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
    } catch {
      setResponse(previous);
      setError("Didn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const going = others.filter((o) => o.response === "Going");
  const maybe = others.filter((o) => o.response === "Maybe");

  return (
    <article className="garage-event" id={slug}>
      <div className="garage-event-date">{date}</div>
      <h2>
        <Link href={`/garage/events/${slug}`}>{title}</Link>
      </h2>
      {area && <p className="garage-event-area">{area}</p>}
      {rsvps !== null && (
        <p className="garage-event-rsvp">
          <strong>{rsvps}</strong> {rsvps === 1 ? "person has" : "people have"} RSVP&apos;d
        </p>
      )}
      {blurb && <p className="garage-event-blurb">{blurb}</p>}

      {!isPast && (
        <>
          <div className="garage-answer" role="group" aria-label={`Your answer for ${title}`}>
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
      )}

      {(going.length > 0 || maybe.length > 0) && (
        <p className="garage-event-crew">
          {going.length > 0 && (
            <>
              <strong>Going:</strong> {going.map((o) => o.name).join(", ")}
            </>
          )}
          {going.length > 0 && maybe.length > 0 && <br />}
          {maybe.length > 0 && (
            <>
              <strong>Maybe:</strong> {maybe.map((o) => o.name).join(", ")}
            </>
          )}
        </p>
      )}

      {/* Crew-only: the exact spot and the run-of-show, which the public event
          page keeps behind an RSVP email. */}
      {(meetup || details) && (
        <details className="garage-event-details">
          <summary>Meetup &amp; details</summary>
          {meetup && <p className="garage-event-meetup">{meetup}</p>}
          {details && <p>{details}</p>}
        </details>
      )}
    </article>
  );
}
