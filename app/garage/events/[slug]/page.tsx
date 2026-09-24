import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageAnswer from "@/components/GarageAnswer";
import { canRunEvents, canSeeOwnerOnly, getSession, listGarageUsers } from "@/lib/garageAuth";
import { crewPicture, getEventResponses } from "@/lib/garageEvents";
import { getEventBySlug, getRsvpRoster, isPastEvent, type RsvpPerson } from "@/lib/events";
import { getCommsSettings, isCommsOpen } from "@/lib/eventComms";
import { getPromoMeasurement, type PromoMeasurement } from "@/lib/eventPromo";

/** Never served from a cache: the Garage is live data on a phone that stays
 *  open, and stale tasks or answers are worse than a moment's load. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

/** 5163040650 → (516) 304-0650; anything that isn't a plain US number stays as typed. */
function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : raw;
}

export default async function GarageEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) redirect("/garage");

  const { slug } = await params;
  const event = await getEventBySlug(slug, { includeCrewOnly: true });
  if (!event) notFound();

  const past = isPastEvent(event.date);
  const staff = canRunEvents(session);
  const [responses, settings, roster, users, promo] = await Promise.all([
    getEventResponses([slug]).catch(() => []),
    staff ? getCommsSettings(slug).catch(() => null) : Promise.resolve(null),
    event.crewOnly ? Promise.resolve([] as RsvpPerson[]) : getRsvpRoster(event.id).catch((): RsvpPerson[] | null => null),
    listGarageUsers().catch(() => []),
    staff && !event.crewOnly ? getPromoMeasurement(event.id, slug).catch((): PromoMeasurement | null => null) : Promise.resolve(null),
  ]);
  const mine = responses.find((r) => r.email === session.email)?.response || null;
  const crew = crewPicture(users, responses, slug);
  const tailgateOpen = isCommsOpen(settings);
  const firstTimers = roster ? roster.filter((p) => p.earlierEvents.length === 0).length : 0;
  const notInGroup = roster ? roster.filter((p) => p.inFbGroup !== "Yes").length : 0;

  return (
    <div className="garage">
      <GarageBack title="Event" back={{ href: "/garage/events", label: "Events" }} />
      <div className="garage-body">
        {event.photoUrl && (
          <div className="garage-event-flyer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.photoUrl} alt={event.title} />
          </div>
        )}

        <div className="garage-event-date">{formatDate(event.date)}</div>
        <h1 className="garage-event-title">{event.title}</h1>
        {event.crewOnly && (
          <p className="garage-form-note">
            <span className="garage-tag">Crew ride</span> Only the crew sees this. No public page, no RSVPs.
          </p>
        )}
        {event.generalArea && <p className="garage-event-area">{event.generalArea}</p>}

        {!past && <GarageAnswer slug={slug} initialResponse={mine} />}

        {tailgateOpen && canRunEvents(session) && (
          <Link href={`/comms/${slug}`} className="btn btn-primary garage-block-btn">
            Open Tailgate
          </Link>
        )}

        <Link href={`/garage/upload?event=${slug}`} className="btn btn-primary garage-block-btn">
          Upload photos &amp; videos
        </Link>
        {event.driveFolderUrl && (
          <a href={event.driveFolderUrl} target="_blank" rel="noopener" className="btn btn-outline garage-block-btn">
            Open Drive folder ↗
          </a>
        )}
        {canSeeOwnerOnly(session) && (
          <Link href={`/garage/events/edit/${event.id}`} className="btn btn-outline garage-block-btn">
            Edit event
          </Link>
        )}

        {/* One "who's coming" picture: the public RSVPs plus the crew's own
            answers. Names, phones and the repeat-face check are for Owner/Staff
            (same rule as the Tailgate roster); emails never reach the screen. */}
        <section className="garage-panel" id="who">
          <h2>Who&apos;s coming</h2>
          <p className="garage-count">
            {(roster?.length ?? 0) + crew.going.length} <span>{past ? "on the list" : "expected"}</span>
          </p>
          <p>
            {roster ? `${roster.length} RSVP${roster.length === 1 ? "" : "s"}` : "RSVPs unavailable"} ·{" "}
            {crew.going.length} crew going
            {crew.maybe.length > 0 && ` · ${crew.maybe.length} maybe`}
          </p>
        </section>

        {!event.crewOnly && (
        <section className="garage-panel">
          <h2>RSVPs{roster ? ` (${roster.length})` : ""}</h2>
          {!roster ? (
            <p className="garage-empty">Couldn&apos;t read the RSVP list.</p>
          ) : roster.length === 0 ? (
            <p className="garage-empty">{past ? "Nobody RSVP'd." : "Nobody's RSVP'd yet."}</p>
          ) : !staff ? (
            <p>
              {roster.length} {roster.length === 1 ? "person has" : "people have"} RSVP&apos;d.
            </p>
          ) : (
            <>
              <p className="garage-form-note">
                {firstTimers} first-timer{firstTimers === 1 ? "" : "s"} · {roster.length - firstTimers} RSVP&apos;d before
                {notInGroup > 0 && ` · ${notInGroup} not in the FB group`}
              </p>
              <ul className="garage-roster">
                {roster.map((p) => (
                  <li key={p.id} className="garage-roster-row">
                    <div className="garage-roster-top">
                      <strong>{p.name}</strong>
                      {p.earlierEvents.length === 0 ? (
                        <span className="garage-tag garage-tag-new">First RSVP</span>
                      ) : (
                        <span className="garage-tag">Back again</span>
                      )}
                    </div>
                    <div className="garage-roster-meta">
                      {p.phone && (
                        <>
                          <a className="garage-roster-phone" href={`tel:${p.phone.replace(/[^\d+]/g, "")}`}>
                            {formatPhone(p.phone)}
                          </a>{" "}
                          ·{" "}
                        </>
                      )}
                      FB group: {p.inFbGroup === "Not Sure" ? "not sure" : p.inFbGroup ? p.inFbGroup.toLowerCase() : "didn't say"}
                      {p.rsvpDate &&
                        ` · RSVP'd ${new Date(`${p.rsvpDate}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                      {p.earlierEvents.length > 0 && ` · Also RSVP'd: ${p.earlierEvents.join(", ")}`}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
        )}

        {/* Read-only promo measurement (event promo countdown, 2026-09-24).
            Where site RSVPs came from, split by the footage test's variant.
            The test alternates by EVENT, and organic delivery isn't
            randomized (each platform picks who sees what, and events differ
            in type, weather and lead time), so this is a comparison across
            events, never proof. Counts only: no names here. */}
        {promo && (
          <section className="garage-panel">
            <h2>Where RSVPs came from</h2>
            <p className="garage-form-note">
              This event&apos;s footage test: variant {promo.variant} (
              {promo.variant === "A" ? "real footage" : "designed card"}) on the &quot;who&apos;s in?&quot; and one-week posts.
            </p>
            {promo.bySource.length === 0 ? (
              <p className="garage-empty">No site RSVPs yet.</p>
            ) : (
              <table className="garage-table">
                <thead>
                  <tr>
                    <th scope="col">Source</th>
                    <th scope="col">A (footage)</th>
                    <th scope="col">B (card)</th>
                    <th scope="col">No variant</th>
                  </tr>
                </thead>
                <tbody>
                  {promo.bySource.map((row) => (
                    <tr key={row.source}>
                      <th scope="row">{row.source}</th>
                      <td>{row.A}</td>
                      <td>{row.B}</td>
                      <td>{row.none}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p>
              Site RSVPs: {promo.siteConfirmed}
              {promo.released > 0 && ` (${promo.released} released their spot)`} · Facebook &quot;Going&quot;:{" "}
              {promo.fbGoing === null ? "not entered" : promo.fbGoing}
            </p>
            {promo.heardAbout.length > 0 && (
              <p className="garage-form-note">
                They said they heard from: {promo.heardAbout.map((h) => `${h.answer} ${h.count}`).join(" · ")}
              </p>
            )}
            <p className="garage-form-note">
              A comparison across events, not proof: organic reach isn&apos;t random. Facebook &quot;Going&quot; is typed into
              the event&apos;s FB Going field by hand.
            </p>
          </section>
        )}

        <section className="garage-panel">
          <h2>Crew</h2>
          {crew.going.length > 0 && <p><strong>Going:</strong> {crew.going.join(", ")}</p>}
          {crew.maybe.length > 0 && <p><strong>Maybe:</strong> {crew.maybe.join(", ")}</p>}
          {crew.cant.length > 0 && <p><strong>Can&apos;t:</strong> {crew.cant.join(", ")}</p>}
          {!past && crew.silent.length > 0 && (
            <p><strong>Hasn&apos;t answered:</strong> {crew.silent.join(", ")}</p>
          )}
          {crew.going.length + crew.maybe.length + crew.cant.length === 0 && (past || crew.silent.length === 0) && (
            <p className="garage-empty">{past ? "No crew answers." : "Nobody's answered yet."}</p>
          )}
          {!past && (
            <p className="garage-form-note">
              Crew don&apos;t get the RSVP emails. The meetup spot and details are on this screen.
            </p>
          )}
        </section>

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

        <p className="garage-links">
          {!event.crewOnly && (
            <a href={`/events/${slug}`} target="_blank" rel="noopener">Public event page ↗</a>
          )}
          {event.facebookEventUrl && (
            <a href={event.facebookEventUrl} target="_blank" rel="noopener">Facebook event ↗</a>
          )}
        </p>
      </div>
    </div>
  );
}
