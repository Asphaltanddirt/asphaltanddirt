import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageEventForm from "@/components/GarageEventForm";
import GarageEventChange from "@/components/GarageEventChange";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { getEditableEvent, listVenues } from "@/lib/garageEventEditor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Edit event · A and D Garage",
  robots: { index: false, follow: false },
};

export default async function GarageEditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeOwnerOnly(session)) redirect("/garage/events");

  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const [event, venues] = await Promise.all([getEditableEvent(id).catch(() => null), listVenues().catch(() => [])]);
  if (!event) notFound();
  const live = event.status !== "Draft" && event.status !== "Cancelled";

  return (
    <div className="garage">
      <GarageBack title="Edit event" back={{ href: "/garage/events/manage", label: "All events" }} />
      <div className="garage-body">
        <h1 className="garage-event-title">{event.title || "Untitled event"}</h1>
        {created && (
          <p className="garage-form-note" role="status">
            Event added. Add its photo below.
          </p>
        )}
        <p className="garage-links garage-links-wrap">
          {live && event.date && <Link href={`/garage/events/${event.slug}`}>Crew view</Link>}
          {(event.status === "Published" || event.status === "Unlisted") && (
            <a href={`/events/${event.slug}`} target="_blank" rel="noopener">Public page ↗</a>
          )}
          {event.driveFolderUrl ? (
            <a href={event.driveFolderUrl} target="_blank" rel="noopener">Drive folder ↗</a>
          ) : (
            live && <span>Drive folder: being made</span>
          )}
          {event.rsvpCount > 0 && <span>{event.rsvpCount} RSVP{event.rsvpCount === 1 ? "" : "s"}</span>}
        </p>
        <GarageEventForm initial={event} venues={venues} />

        {(live || event.rsvpCount > 0) && (
          <GarageEventChange
            slug={event.slug}
            title={event.title}
            date={event.date || null}
            rsvpCount={event.rsvpCount}
            canCallOff={live}
          />
        )}
      </div>
    </div>
  );
}
