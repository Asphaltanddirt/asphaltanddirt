import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventBySlug, getApprovedEventPhotoSubmissions, isPastEvent, uploadsOpen } from "@/lib/events";
import { socialLinks } from "@/lib/social";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import RsvpForm from "@/components/RsvpForm";
import EventRequirementsSection from "@/components/EventRequirements";
import { needsVenueWaiver, requirementsFor } from "@/lib/vehicleRules";
import BuildGallery from "@/components/BuildGallery";
import EventPhotoSubmissionForm from "@/components/EventPhotoSubmissionForm";

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
    alternates: { canonical: `${SITE_URL}/events/${event.slug}` },
    ...(event.unlisted && { robots: { index: false, follow: false } }),
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

  const past = isPastEvent(event.date);
  // Uploads open on the day itself, not the day after — the Tailgate thank-you
  // email goes out the same evening and links straight to #photos.
  const canUpload = uploadsOpen(event.date);
  const requirements = requirementsFor(event);
  const submittedPhotos = past ? await getApprovedEventPhotoSubmissions(event.id) : [];
  const galleryImages = [...event.galleryPhotos, ...submittedPhotos].map((photo) => ({ src: photo.url, alt: photo.alt }));
  const hasGallery = galleryImages.length > 0;

  // Event structured data: the public facts only (never the exact meetup spot).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: `${SITE_URL}/events/${event.slug}`,
    ...(event.publicBlurb && { description: [event.publicBlurb, ...event.atAGlance.map((f) => (f.label ? `${f.label}: ${f.value}` : f.value))].join(" ") }),
    ...(event.generalArea && { location: { "@type": "Place", name: event.generalArea, address: event.generalArea } }),
    organizer: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    isAccessibleForFree: true,
  };

  return (
    <section className="section-pt-tight section-pb-tight">
      {!event.unlisted && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <div className="container">
        <Link href="/events/all" className="back-link mb-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 18 5 12l6-6M5 12h14" /></svg>
          Back To All Events
        </Link>

        {/* Left: the flyer at its own proportions (never cropped), plus the
            gallery on past events so the long recap column is balanced.
            On mobile both columns dissolve and reorder: flyer, details,
            gallery, photo upload. */}
        <div className="event-detail-grid mt-3">
          <div className={`event-detail-side${hasGallery ? " has-gallery" : ""}`}>
            <div className="event-detail-cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={event.photoUrl || FALLBACK_IMAGE.src} alt={event.photoUrl ? event.title : FALLBACK_IMAGE.alt} />
            </div>
            {hasGallery && (
              <div className="event-detail-gallery">
                <h2>Gallery</h2>
                <BuildGallery images={galleryImages} />
              </div>
            )}
          </div>

          <div className="event-detail-main">
            <div className="event-detail-info">
              <div className="eyebrow accent">{formatEventDate(event.date)}</div>
              <h1 className="mt-2">{event.title}</h1>
              {event.generalArea && (
                <p style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-dim)", fontSize: 14 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s7-6.3 7-12a7 7 0 0 0-14 0c0 5.7 7 12 7 12z" /><circle cx="12" cy="10" r="2.4" /></svg>
                  {event.generalArea}
                </p>
              )}
              {event.publicBlurb && <p className="lead mt-3">{event.publicBlurb}</p>}

              {!past && event.atAGlance.length > 0 && (
                <div className="event-glance">
                  <h2 className="eyebrow">At A Glance</h2>
                  <dl>
                    {event.atAGlance.map((fact, i) =>
                      fact.label ? (
                        <div key={i}>
                          <dt>{fact.label}</dt>
                          <dd>{fact.value}</dd>
                        </div>
                      ) : (
                        <div key={i} className="event-glance-note">
                          <dd>{fact.value}</dd>
                        </div>
                      ),
                    )}
                  </dl>
                </div>
              )}

              {past ? (
                <>
                  <h2 className="mt-6">Recap</h2>
                  {event.recap ? (
                    <p style={{ whiteSpace: "pre-wrap" }}>{event.recap}</p>
                  ) : (
                    <p style={{ color: "var(--text-dim)" }}>Recap coming soon.</p>
                  )}
                </>
              ) : (
                <>
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

                  {requirements && <EventRequirementsSection requirements={requirements} />}

                  <h2 className="mt-6">RSVP</h2>
                  <RsvpForm slug={event.slug} hasRequirements={Boolean(requirements)} needsVenueWaiver={needsVenueWaiver(requirements)} />
                </>
              )}
            </div>

            {canUpload && (
              <div className="event-detail-upload" id="photos">
                <h2 className="mt-6">Got Photos Or Video From The Day?</h2>
                <p style={{ color: "var(--text-dim)" }}>
                  Send them here in full quality. We look at everything by hand, and approved photos show up in the gallery.
                </p>
                <EventPhotoSubmissionForm eventSlug={event.slug} eventTitle={event.title} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
