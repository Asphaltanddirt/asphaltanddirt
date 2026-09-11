import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedEvents } from "@/lib/events";
import { socialLinks } from "@/lib/social";

export const metadata: Metadata = {
  title: "Events",
  description: "Meetups and rides — RSVP here even if you're not on Facebook.",
};

const FALLBACK_IMAGE = { src: "/img/community/pine-barrens.jpg", alt: "Jeeps on a Pine Barrens trail ride" };

function formatEventDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function excerpt(text: string, maxLength = 140) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, clean.lastIndexOf(" ", maxLength)) + "…";
}

export default async function EventsPage() {
  const { upcoming, past } = await getPublishedEvents();

  return (
    <>
      <section className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/events/sunset-overlook.jpg"
          className="hero-bg"
          alt="Jeeps and cars gathered at an overlook around a firepit at sunset"
        />
        <div className="hero-scrim" />
        <div className="container hero-inner">
          <div className="hero-content">
            <h1>
              <span className="line">Meet Up.</span>
              <span className="line accent-text">Roll Out.</span>
            </h1>
            <div className="eyebrow mt-2" style={{ fontSize: 16 }}>Events &amp; Rides</div>
            <p className="lead mt-4">
              RSVP here and we&apos;ll email you the details — no Facebook required. Most of the
              day-to-day chatter still happens in our{" "}
              <a href={socialLinks.facebookGroup} target="_blank" rel="noopener">private FB group</a>, so
              join that too if you&apos;re on there.
            </p>
          </div>
        </div>
      </section>

      <section className="section-pt-tight section-pb-tight">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">Upcoming</div>
          </div>
          {upcoming.length === 0 ? (
            <p>
              Nothing on the books right now &mdash; check back soon, or{" "}
              <a href={socialLinks.facebookGroup} target="_blank" rel="noopener">join the FB group</a> so you
              don&apos;t miss the next one.
            </p>
          ) : (
            <div className="grid grid-3">
              {upcoming.map((event) => (
                <div className="card" key={event.id}>
                  <div className="card-media">
                    <span className="badge">{formatEventDate(event.date)}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={event.photoUrl || FALLBACK_IMAGE.src} alt={event.photoUrl ? event.title : FALLBACK_IMAGE.alt} />
                  </div>
                  <div className="card-body">
                    <h3>{event.title}</h3>
                    {event.publicBlurb && <p>{excerpt(event.publicBlurb)}</p>}
                    {event.generalArea && (
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-dim)" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s7-6.3 7-12a7 7 0 0 0-14 0c0 5.7 7 12 7 12z" /><circle cx="12" cy="10" r="2.4" /></svg>
                        {event.generalArea}
                      </span>
                    )}
                    <Link href={`/events/${event.slug}`} className="btn btn-primary btn-sm" style={{ marginTop: "auto" }}>
                      Details &amp; RSVP
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {past.length > 0 && (
        <section className="section-alt section-pt-tight section-pb-tight">
          <div className="container">
            <div className="section-head">
              <div className="eyebrow">Past Events</div>
            </div>
            <div className="grid grid-3">
              {past.slice(0, 6).map((event) => (
                <div className="card" key={event.id}>
                  <div className="card-media">
                    <span className="badge">{formatEventDate(event.date)}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={event.photoUrl || FALLBACK_IMAGE.src} alt={event.photoUrl ? event.title : FALLBACK_IMAGE.alt} />
                  </div>
                  <div className="card-body">
                    <h3>{event.title}</h3>
                    {event.publicBlurb && <p>{excerpt(event.publicBlurb)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
