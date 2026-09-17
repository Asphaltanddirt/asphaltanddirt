import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import { getSession } from "@/lib/garageAuth";
import { getCrewEvents } from "@/lib/events";

/** Never served from a cache: the Garage is live data on a phone that stays
 *  open, and stale tasks or answers are worse than a moment's load. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Media · A and D Garage",
  robots: { index: false, follow: false },
};

function when(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** Pick an event, then review its photos. */
export default async function GarageMediaPage() {
  const session = await getSession();
  if (!session) redirect("/garage");

  const { upcoming, past } = await getCrewEvents().catch(() => ({ upcoming: [], past: [] }));
  const events = [...past, ...upcoming];

  return (
    <div className="garage">
      <GarageBack title="Media" />
      <div className="garage-body">
        <p className="garage-lead">
          Photos from Tailgate and from the event page, all in one place. Star the good ones — those are what we pull
          for the Community page. Flag anything that shouldn&apos;t be up and it comes off the site straight away.
        </p>
        {events.length === 0 && <p className="garage-empty">No events yet.</p>}
        {events.map((event) => (
          <Link key={event.slug} href={`/garage/media/${event.slug}`} className="garage-row">
            <span className="garage-row-main">
              <strong>{event.title}</strong>
              <span>{when(event.date)}</span>
            </span>
            <span aria-hidden="true">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
