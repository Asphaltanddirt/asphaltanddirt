import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventBySlug } from "@/lib/events";
import { getRsvpForRelease, verifyReleaseLink } from "@/lib/rsvpRelease";
import RsvpReleaseButton from "@/components/RsvpReleaseButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Release your spot | Asphalt & Dirt",
  robots: { index: false, follow: false },
};

/**
 * "Can't make it?" from the day-before reminder. Asks first and releases on
 * the button, never on page load (see lib/rsvpRelease.ts for why).
 */
export default async function ReleasePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ id?: string; d?: string; t?: string }>;
}) {
  const { slug } = await params;
  const { id, d, t } = await searchParams;

  const event = await getEventBySlug(slug).catch(() => null);
  if (!event) notFound();

  const ok = verifyReleaseLink(id, d, t) && d === event.date;
  const rsvp = ok && id ? await getRsvpForRelease(id).catch(() => null) : null;

  if (!ok || !rsvp || !rsvp.eventIds.includes(event.id)) {
    return (
      <section className="section-pt-tight section-pb-tight">
        <div className="container" style={{ maxWidth: 560, marginInline: "auto" }}>
          <div className="eyebrow accent">Asphalt &amp; Dirt</div>
          <h1 className="mt-2">That link didn&apos;t work</h1>
          <p className="lead mt-2">
            It may be for an earlier date, or it got broken when it was copied. Reply to the email we sent and we&apos;ll
            sort it out.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container" style={{ maxWidth: 560, marginInline: "auto" }}>
        <div className="eyebrow accent">{event.title.trim()}</div>
        <h1 className="mt-2">Can&apos;t make it?</h1>
        <p className="lead mt-2">
          Hey {rsvp.name.split(/\s+/)[0] || "there"}. No problem, it happens. Tap the button and your spot goes back on
          the list for someone else. Your waiver stays on file for next time.
        </p>
        <RsvpReleaseButton
          id={rsvp.id}
          slug={slug}
          date={event.date}
          token={t as string}
          initialReleased={rsvp.status === "Cancelled"}
        />
      </div>
    </section>
  );
}
