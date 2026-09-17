import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageEventForm from "@/components/GarageEventForm";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { listVenues } from "@/lib/garageEventEditor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Add event · A and D Garage",
  robots: { index: false, follow: false },
};

export default async function GarageNewEventPage() {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeOwnerOnly(session)) redirect("/garage/events");
  const venues = await listVenues().catch(() => []);

  return (
    <div className="garage">
      <GarageBack title="Add event" back={{ href: "/garage/events", label: "Events" }} />
      <div className="garage-body">
        <h1 className="garage-event-title">Add an event</h1>
        <p className="garage-form-note">Starts as a Draft unless you pick another status. You can add the photo after saving.</p>
        <GarageEventForm initial={null} venues={venues} />
      </div>
    </div>
  );
}
