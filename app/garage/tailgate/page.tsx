import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import { canRunEvents, getSession } from "@/lib/garageAuth";
import { getCommsSettings, isCommsOpen, reminderSendTime } from "@/lib/eventComms";
import { getPublishedEvents } from "@/lib/events";

export const metadata: Metadata = {
  title: "Tailgate · A and D Garage",
  robots: { index: false, follow: false },
};

function when(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

/** Staff's way into an event's Tailgate: no staff code, no link to pass
 *  around. Being signed in to the Garage as Owner/Staff is the credential,
 *  and messages post under the name on their Google account. */
export default async function GarageTailgatePage() {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canRunEvents(session)) redirect("/garage");

  const { upcoming } = await getPublishedEvents().catch(() => ({ upcoming: [], past: [] }));
  const soon = upcoming.slice(0, 5);
  const settings = await Promise.all(soon.map((e) => getCommsSettings(e.slug).catch(() => null)));

  const rows = soon.map((event, i) => {
    const s = settings[i];
    const open = isCommsOpen(s);
    const opensAt = s?.eventDate ? reminderSendTime(s) : null;
    return { event, open, active: Boolean(s?.active), opensAt };
  });

  return (
    <div className="garage">
      <GarageBack title="Tailgate" />
      <div className="garage-body">
        <p className="garage-lead">
          Open an event&apos;s Tailgate to run Staging, post announcements, roll out and call Trail over. Your messages
          show your name from Google.
        </p>

        {rows.length === 0 && <p className="garage-empty">No upcoming events.</p>}

        {rows.map(({ event, open, active, opensAt }) => (
          <article key={event.slug} className="garage-event">
            <div className="garage-event-date">{when(event.date)}</div>
            <h2>{event.title}</h2>
            {open ? (
              <Link href={`/comms/${event.slug}`} className="btn btn-primary mt-2">
                Open Tailgate
              </Link>
            ) : (
              <p className="garage-event-blurb mt-2">
                {active && opensAt
                  ? `Opens ${opensAt.toLocaleString("en-US", { weekday: "long", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })}, when the reminder email goes out.`
                  : "Tailgate isn't switched on for this event yet."}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
