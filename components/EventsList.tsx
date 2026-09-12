"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { EventSummary } from "@/lib/events";

const FALLBACK_IMAGE = { src: "/img/community/pine-barrens.jpg", alt: "Jeeps on a Pine Barrens trail ride" };

type SortOption = "newest" | "oldest";

function formatEventDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function EventsList({ events }: { events: EventSummary[] }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const visibleEvents = useMemo(() => {
    let list = events;

    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter((e) => [e.title, e.generalArea].join(" ").toLowerCase().includes(query));
    }

    list = [...list];
    if (sort === "oldest") list.reverse();

    return list;
  }, [events, search, sort]);

  return (
    <>
      <div className="filter-row">
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value as SortOption)}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {visibleEvents.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {visibleEvents.map((event) => {
            const past = event.date < today;
            return (
              <div className="build-row" key={event.id}>
                <div className="build-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={event.photoUrl || FALLBACK_IMAGE.src} alt={event.photoUrl ? event.title : FALLBACK_IMAGE.alt} />
                </div>
                <div>
                  <div className="build-kicker">{formatEventDate(event.date)}</div>
                  <h3>{event.title}</h3>
                  {!past && event.generalArea && (
                    <div className="accent-text" style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                      {event.generalArea}
                    </div>
                  )}
                  {event.publicBlurb && <p className="mb-0">{event.publicBlurb}</p>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-end" }}>
                  <Link href={`/events/${event.slug}`} className="btn btn-outline-accent btn-sm">
                    {past ? "Recap & Gallery" : "Details & RSVP"}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mb-0">No events match your search &mdash; try a different term.</p>
      )}
    </>
  );
}
