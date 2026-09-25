import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EventFeedbackForm from "@/components/EventFeedbackForm";
import { getEventBySlug } from "@/lib/events";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "How was it?",
  robots: { index: false, follow: false },
};

/** "Tell us how it went", from the post-ride thank-you email (lib/eventFeedback.ts). */
export default async function EventFeedbackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug).catch(() => null);
  if (!event) notFound();

  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container" style={{ maxWidth: 560, marginInline: "auto" }}>
        <div className="eyebrow accent">{event.title.trim()}</div>
        <h1 className="mt-2">How was it?</h1>
        <p className="lead mt-2">Thanks for coming out. Tell us what worked and what we should change. Two minutes, tops.</p>
        <EventFeedbackForm slug={slug} />
      </div>
    </section>
  );
}
