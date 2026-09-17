import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { listAllEvents } from "@/lib/garageEventEditor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "All events · A and D Garage",
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<string, string> = { "Crew Only": "Crew ride" };

function formatDate(iso: string) {
  return iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No date";
}

/** Every event in any status, for owners to open and edit. */
export default async function GarageManageEventsPage() {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeOwnerOnly(session)) redirect("/garage/events");
  const events = await listAllEvents().catch(() => null);

  return (
    <div className="garage">
      <GarageBack title="All events" />
      <div className="garage-body">
        <h1 className="garage-event-title">All events</h1>
        <p className="garage-links">
          <Link href="/garage/events/new" className="btn btn-primary btn-sm">Add event</Link>
        </p>
        {!events ? (
          <p className="garage-error">Couldn&apos;t read the Events table.</p>
        ) : events.length === 0 ? (
          <p className="garage-empty">No events yet.</p>
        ) : (
          <section className="garage-panel">
            <ul className="garage-roster">
              {events.map((e) => (
                <li key={e.id}>
                  <Link href={`/garage/events/edit/${e.id}`} className="garage-app-row">
                    <span className="garage-app-main">
                      <strong>{e.title || "Untitled event"}</strong>
                      <span className="garage-roster-meta">
                        {[formatDate(e.date), e.generalArea, e.rsvpCount ? `${e.rsvpCount} RSVP${e.rsvpCount === 1 ? "" : "s"}` : ""]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className={e.status === "Draft" ? "garage-tag garage-tag-new garage-manage-status" : "garage-tag garage-manage-status"}>
                      {STATUS_LABEL[e.status] || e.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
