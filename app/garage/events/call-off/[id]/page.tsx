import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageEventChange from "@/components/GarageEventChange";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { getEditableEvent } from "@/lib/garageEventEditor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Call it off · A and D Garage",
  robots: { index: false, follow: false },
};

/**
 * Call it off, on its own page — nothing above it but the event's name
 * (Jose, 2026-09-24: "lets hide everything above it"). Reached by a
 * double-tap from the event, so it's never opened by accident. Owners only:
 * Jose or Anthony, whoever isn't driving.
 */
export default async function GarageCallOffPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ preset?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeOwnerOnly(session)) redirect("/garage/events");

  const { id } = await params;
  const { preset } = await searchParams;
  const event = await getEditableEvent(id).catch(() => null);
  if (!event) notFound();
  const live = event.status !== "Draft" && event.status !== "Cancelled";

  return (
    <div className="garage">
      <GarageBack title="Call it off" back={{ href: event.slug ? `/garage/events/${event.slug}` : "/garage/events", label: "Event" }} />
      <div className="garage-body">
        <h1 className="garage-event-title">{event.title || "Untitled event"}</h1>
        <GarageEventChange
          slug={event.slug}
          title={event.title}
          date={event.date || null}
          rsvpCount={event.rsvpCount}
          canCallOff={live}
          cancelled={event.status === "Cancelled"}
          preset={preset === "go" ? "go" : undefined}
        />
      </div>
    </div>
  );
}
