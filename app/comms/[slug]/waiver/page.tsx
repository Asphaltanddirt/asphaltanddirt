import type { Metadata } from "next";
import { getCommsSettings, isCommsOpen } from "@/lib/eventComms";
import { getEventBySlug } from "@/lib/events";
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

  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container" style={{ maxWidth: 480 }}>
        <div className="eyebrow accent">{eventTitle}</div>
        <h1 className="mt-2">Sign Up For The Group Chat</h1>
        <p className="lead mt-2">Quick waiver, then we&apos;ll email you a personal link — no app, no login.</p>
        <div className="mt-4">
          <WaiverForm slug={slug} eventTitle={eventTitle} />
        </div>
      </div>
    </section>
  );
}
