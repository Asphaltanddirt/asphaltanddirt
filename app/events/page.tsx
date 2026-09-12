import type { Metadata } from "next";
import Link from "next/link";
import HeroCTAGroup from "@/components/HeroCTAGroup";
import { getEventsShowcase, isPastEvent } from "@/lib/events";
import { socialLinks } from "@/lib/social";
import { fetchLatestFromPlaylist, TRAIL_EVENT_VIDEOS_PLAYLIST_ID } from "@/lib/youtube";
import { getEpisodeByYoutubeId } from "@/lib/episodes";
import { excerpt } from "@/lib/text";

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

export default async function EventsPage() {
  const [showcase, recaps] = await Promise.all([
    getEventsShowcase(3),
    fetchLatestFromPlaylist(TRAIL_EVENT_VIDEOS_PLAYLIST_ID, 3),
  ]);

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
          <div className="hero-content" style={{ marginTop: -75 }}>
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
            <HeroCTAGroup source="events_hero" returnTo="/events" />
          </div>
        </div>
      </section>

      <section className="section-pt-tight section-pb-tight">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">Events</div>
            <Link href="/events/all" className="view-all">
              All Events
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
          </div>
          {showcase.length === 0 ? (
            <p>
              Nothing on the books right now &mdash; check back soon, or{" "}
              <a href={socialLinks.facebookGroup} target="_blank" rel="noopener">join the FB group</a> so you
              don&apos;t miss the next one.
            </p>
          ) : (
            <div className="grid grid-3">
              {showcase.map((event) => {
                const past = isPastEvent(event.date);
                return (
                  <div className="card" key={event.id}>
                    <div className="card-media">
                      <span className="badge">{formatEventDate(event.date)}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={event.photoUrl || FALLBACK_IMAGE.src} alt={event.photoUrl ? event.title : FALLBACK_IMAGE.alt} />
                    </div>
                    <div className="card-body">
                      <h3>{event.title}</h3>
                      {event.publicBlurb && <p>{excerpt(event.publicBlurb)}</p>}
                      {!past && event.generalArea && (
                        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-dim)" }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s7-6.3 7-12a7 7 0 0 0-14 0c0 5.7 7 12 7 12z" /><circle cx="12" cy="10" r="2.4" /></svg>
                          {event.generalArea}
                        </span>
                      )}
                      <Link href={`/events/${event.slug}`} className="btn btn-primary btn-sm" style={{ marginTop: "auto" }}>
                        {past ? "Recap & Gallery" : "Details & RSVP"}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="section-alt section-pt-tight section-pb-tight">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">Ride Recaps &amp; Highlights</div>
            <a href={`https://www.youtube.com/playlist?list=${TRAIL_EVENT_VIDEOS_PLAYLIST_ID}`} target="_blank" rel="noopener" className="view-all">
              View All Recaps
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </a>
          </div>
          {recaps.length ? (
            <div className="grid grid-3">
              {recaps.map((video) => {
                const internal = getEpisodeByYoutubeId(video.videoId);
                const cardBody = (
                  <>
                    <div className="card-media">
                      <div className="play-overlay">
                        <div className="play-circle">
                          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                        </div>
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={video.thumbnail} alt={video.title} />
                    </div>
                    <div className="card-body">
                      <h3>{video.title}</h3>
                      <p>{excerpt(video.description)}</p>
                    </div>
                  </>
                );
                return internal ? (
                  <Link className="card" key={video.videoId} href={`/podcast/${internal.slug}`}>
                    {cardBody}
                  </Link>
                ) : (
                  <a className="card" key={video.videoId} href={video.url} target="_blank" rel="noopener">
                    {cardBody}
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="mb-0">Recaps drop soon &mdash; check back here or subscribe so you don&apos;t miss one.</p>
          )}
        </div>
      </section>

      <section className="section-pt-tight section-pb-tight">
        <div className="container" style={{ textAlign: "center", maxWidth: 560, marginInline: "auto" }}>
          <div className="eyebrow accent">Been Part Of It?</div>
          <h2 className="mt-2">Leave A Review</h2>
          <p className="lead mt-2">
            The podcast, an event, or just being in the community &mdash; if Asphalt &amp; Dirt&apos;s
            been good to you, tell us. Approved reviews get featured on the site.
          </p>
          <a href="/reviews/submit" className="btn btn-primary btn-sm mt-3">Leave A Review</a>
        </div>
      </section>
    </>
  );
}
