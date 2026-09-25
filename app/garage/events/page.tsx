import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageEventCard from "@/components/GarageEventCard";
import Link from "next/link";
import { canSeeOwnerOnly, getSession, seesEventDetails } from "@/lib/garageAuth";
import { crewPicture, getEventResponses } from "@/lib/garageEvents";
import { getCrewEvents, getEventBySlug, getRsvpSummaries } from "@/lib/events";

/** Never served from a cache: the Garage is live data on a phone that stays
 *  open, and stale tasks or answers are worse than a moment's load. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Events · A and D Garage",
  robots: { index: false, follow: false },
};

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function GarageEventsPage() {
  const session = await getSession();
  if (!session) redirect("/garage");

  // Published events plus Crew Only rides (those never show on the public site).
  const { upcoming, past } = await getCrewEvents().catch(() => ({ upcoming: [], past: [] }));
  const shown = [...upcoming, ...past.slice(0, 3)];

  // The crew view shows the private meetup spot and run-of-show, which only
  // the per-event record carries.
  const [details, responses, rsvps] = await Promise.all([
    Promise.all(shown.map((e) => getEventBySlug(e.slug, { includeCrewOnly: true }).catch(() => null))),
    getEventResponses(shown.map((e) => e.slug)),
    getRsvpSummaries(shown.map((e) => e.id)).catch(() => new Map()),
  ]);
  const mine = new Map(responses.filter((r) => r.email === session.email).map((r) => [r.eventSlug, r.response]));
  // Crew see everything; outside ambassadors once they're Going (9/25).
  const insider = (slug: string) => seesEventDetails(session, mine.get(slug) === "Going");

  return (
    <div className="garage">
      <GarageBack title="Events" />
      <div className="garage-body">
        {canSeeOwnerOnly(session) && (
          <p className="garage-links garage-links-wrap">
            <Link href="/garage/events/new" className="btn btn-primary btn-sm">Add event</Link>
            <Link href="/garage/events/manage" className="btn btn-outline btn-sm">All events, drafts too</Link>
          </p>
        )}
        {shown.length === 0 && <p className="garage-empty">No events on the calendar yet.</p>}

        {upcoming.length > 0 && <h2 className="garage-section">Coming up</h2>}
        {shown.map((event, i) => {
          const detail = details[i];
          const isPast = i >= upcoming.length;
          return (
            <div key={event.slug}>
              {isPast && i === upcoming.length && <h2 className="garage-section">Recently</h2>}
              <GarageEventCard
                slug={event.slug}
                title={event.title}
                date={formatDate(event.date)}
                area={event.generalArea}
                blurb={event.publicBlurb}
                meetup={insider(event.slug) ? detail?.meetupPoint || "" : ""}
                details={insider(event.slug) ? detail?.fullDetails || "" : ""}
                rsvps={event.crewOnly ? null : rsvps.get(event.id)?.count ?? null}
                crewOnly={event.crewOnly}
                crewGoing={crewPicture([], responses, event.slug).going.length}
                initialResponse={mine.get(event.slug) || null}
                others={responses
                  .filter((r) => insider(event.slug) && r.eventSlug === event.slug && r.email !== session.email)
                  .map((r) => ({ name: r.name || r.email, response: r.response }))}
                isPast={isPast}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
