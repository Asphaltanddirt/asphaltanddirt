import type { Metadata } from "next";
import { getPublishedEvents } from "@/lib/events";
import EventUpdateForm from "@/components/EventUpdateForm";

export const metadata: Metadata = {
  title: "Send Event Update",
  robots: { index: false, follow: false },
};

export default async function EventUpdateAdminPage() {
  const { upcoming, past } = await getPublishedEvents();
  const events = [...upcoming, ...past].map((e) => ({ slug: e.slug, title: e.title, date: e.date }));

  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container legal-page">
        <h1>Send Event Update</h1>
        <p>
          Emails everyone who RSVP&apos;d to the event you pick — a moved meetup spot, a
          cancellation, &quot;bring tire chains,&quot; whatever. Always test first.
        </p>
        <EventUpdateForm events={events} />
      </div>
    </section>
  );
}
