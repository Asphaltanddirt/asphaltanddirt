import type { Metadata } from "next";
import Link from "next/link";
import EventsList from "@/components/EventsList";
import { getAllPublishedEvents } from "@/lib/events";

export const metadata: Metadata = {
  title: "All Events",
  description: "Every Asphalt & Dirt meetup and ride — upcoming and past.",
};

export default async function AllEventsPage() {
  const events = await getAllPublishedEvents();

  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container">
        <Link href="/events" className="back-link mb-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
          Back To Events
        </Link>
        <h1 className="mt-4">All Events</h1>
        <p className="lead mt-2">Every meetup and ride — upcoming and past.</p>
        <div className="mt-4">
          <EventsList events={events} />
        </div>
      </div>
    </section>
  );
}
