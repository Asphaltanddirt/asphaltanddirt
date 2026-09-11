import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventBySlug } from "@/lib/events";
import { socialLinks } from "@/lib/social";
import RsvpForm from "@/components/RsvpForm";

const FALLBACK_IMAGE = { src: "/img/community/pine-barrens.jpg", alt: "Jeeps on a Pine Barrens trail ride" };

function formatEventDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return {};
  return {
    title: event.title,
    description: event.publicBlurb || `${event.title} — ${formatEventDate(event.date)}`,
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="gallery-main" style={{ marginBottom: "var(--sp-4)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.photoUrl || FALLBACK_IMAGE.src}
            alt={event.photoUrl ? event.title : FALLBACK_IMAGE.alt}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        <div className="eyebrow accent">{formatEventDate(event.date)}</div>
        <h1 className="mt-2">{event.title}</h1>
        {event.generalArea && (
          <p style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-dim)", fontSize: 14 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s7-6.3 7-12a7 7 0 0 0-14 0c0 5.7 7 12 7 12z" /><circle cx="12" cy="10" r="2.4" /></svg>
            {event.generalArea}
          </p>
        )}
        {event.publicBlurb && <p className="lead mt-3">{event.publicBlurb}</p>}

        {event.meetupPublic && event.meetupPoint ? (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "16px 20px", margin: "var(--sp-3) 0" }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Meetup Point</div>
            <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{event.meetupPoint}</p>
          </div>
        ) : (
          <p style={{ fontSize: 14, color: "var(--text-dim)" }}>
            The exact meetup spot goes out by email once you RSVP.{" "}
            <a href={socialLinks.facebookGroup} target="_blank" rel="noopener">Already in the FB group?</a> The
            discussion&apos;s happening there too.
          </p>
        )}

        <h2 className="mt-6">RSVP</h2>
        <RsvpForm slug={event.slug} />
      </div>
    </section>
  );
}
