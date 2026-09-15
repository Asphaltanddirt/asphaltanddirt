import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageAnswer from "@/components/GarageAnswer";
import { canRunEvents, getSession } from "@/lib/garageAuth";
import { getEventResponses } from "@/lib/garageEvents";
import { getEventBySlug, isPastEvent } from "@/lib/events";
import { getCommsSettings, isCommsOpen } from "@/lib/eventComms";

export const metadata: Metadata = {
  title: "Event · A and D Garage",
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

export default async function GarageEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) redirect("/garage");

  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const past = isPastEvent(event.date);
  const [responses, settings] = await Promise.all([
    getEventResponses([slug]).catch(() => []),
    canRunEvents(session) ? getCommsSettings(slug).catch(() => null) : Promise.resolve(null),
  ]);
  const mine = responses.find((r) => r.email === session.email)?.response || null;
  const going = responses.filter((r) => r.response === "Going");
  const maybe = responses.filter((r) => r.response === "Maybe");
  const cant = responses.filter((r) => r.response === "Can't");
  const tailgateOpen = isCommsOpen(settings);

  return (
    <div className="garage">
      <GarageBack title="Event" />
      <div className="garage-body">
        {event.photoUrl && (
          <div className="garage-event-flyer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.photoUrl} alt={event.title} />
          </div>
        )}

        <div className="garage-event-date">{formatDate(event.date)}</div>
        <h1 className="garage-event-title">{event.title}</h1>
        {event.generalArea && <p className="garage-event-area">{event.generalArea}</p>}

        {!past && <GarageAnswer slug={slug} initialResponse={mine} />}

        {tailgateOpen && canRunEvents(session) && (
          <Link href={`/comms/${slug}`} className="btn btn-primary garage-block-btn">
            Open Tailgate
          </Link>
        )}

        {/* Crew-only: the exact spot and the run-of-show. The public page keeps
            these behind an RSVP email. */}
        {event.meetupPoint && (
          <section className="garage-panel">
            <h2>Meetup</h2>
            <p>{event.meetupPoint}</p>
          </section>
        )}
        {event.fullDetails && (
          <section className="garage-panel">
            <h2>Details</h2>
            <p>{event.fullDetails}</p>
          </section>
        )}
        {event.atAGlance.length > 0 && (
          <section className="garage-panel">
            <h2>At a glance</h2>
            <dl className="garage-glance">
              {event.atAGlance.map((fact, i) => (
                <div key={i}>
                  {fact.label && <dt>{fact.label}</dt>}
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        {event.publicBlurb && (
          <section className="garage-panel">
            <h2>What we told everyone</h2>
            <p>{event.publicBlurb}</p>
          </section>
        )}

        <section className="garage-panel">
          <h2>Who&apos;s in</h2>
          {responses.length === 0 ? (
            <p className="garage-empty">Nobody&apos;s answered yet.</p>
          ) : (
            <>
              {going.length > 0 && <p><strong>Going:</strong> {going.map((r) => r.name || r.email).join(", ")}</p>}
              {maybe.length > 0 && <p><strong>Maybe:</strong> {maybe.map((r) => r.name || r.email).join(", ")}</p>}
              {cant.length > 0 && <p><strong>Can&apos;t:</strong> {cant.map((r) => r.name || r.email).join(", ")}</p>}
            </>
          )}
        </section>

        <p className="garage-links">
          <a href={`/events/${slug}`} target="_blank" rel="noopener">Public event page ↗</a>
          {event.facebookEventUrl && (
            <a href={event.facebookEventUrl} target="_blank" rel="noopener">Facebook event ↗</a>
          )}
        </p>
      </div>
    </div>
  );
}
