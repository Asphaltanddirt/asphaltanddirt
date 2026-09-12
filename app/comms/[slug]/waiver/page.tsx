import type { Metadata } from "next";
import { getCommsSettings, isCommsOpen } from "@/lib/eventComms";
import { getEventBySlug } from "@/lib/events";
import { getWaiver } from "@/lib/waivers";
import WaiverForm from "@/components/WaiverForm";

export const metadata: Metadata = {
  title: "Event Chat Sign-Up",
  robots: { index: false, follow: false },
};

export default async function WaiverPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [settings, event] = await Promise.all([getCommsSettings(slug), getEventBySlug(slug)]);

  if (!isCommsOpen(settings)) {
    return (
      <section className="section-pt-tight section-pb-tight">
        <div className="container" style={{ maxWidth: 480, textAlign: "center" }}>
          <h1>Sign-Up Isn&apos;t Open</h1>
          <p className="lead mt-2">This event&apos;s chat sign-up isn&apos;t live right now.</p>
        </div>
      </section>
    );
  }

  const eventTitle = event?.title || "This Event";
  const eventDate = event?.date
    ? new Date(`${event.date}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "the scheduled date";

  const waiver = getWaiver(settings?.waiverVersion, {
    eventName: eventTitle,
    eventDate,
    location: event?.generalArea || "the announced location",
  });

  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="eyebrow accent">{eventTitle}</div>
        <h1 className="mt-2">Sign Up For Tailgate</h1>
        <p className="lead mt-2">
          Read and sign below, then we&apos;ll email you a personal link to the group chat — no app, no login.
        </p>
        <div className="mt-4">
          <WaiverForm slug={slug} eventTitle={eventTitle} waiver={waiver} />
        </div>
      </div>
    </section>
  );
}
