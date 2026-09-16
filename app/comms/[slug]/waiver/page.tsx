import type { Metadata } from "next";
import { getCommsSettings, isCommsOpen } from "@/lib/eventComms";
import { getEventBySlug } from "@/lib/events";
import { waiverForEvent } from "@/lib/waiverContext";
import WaiverForm from "@/components/WaiverForm";
import TailgateReturn from "@/components/TailgateReturn";

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
  const waiver = waiverForEvent(settings, event);

  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="eyebrow accent">{eventTitle}</div>
        <h1 className="mt-2">Sign Up For Tailgate</h1>
        <p className="lead mt-2">
          Read and sign below and you&apos;re straight into the group chat. No app, no login. We&apos;ll email you the
          link too.
        </p>
        <TailgateReturn slug={slug} />
        <div className="mt-4">
          <WaiverForm slug={slug} eventTitle={eventTitle} waiver={waiver} />
        </div>
      </div>
    </section>
  );
}
