import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GaragePhotoGrid, { type GaragePhoto } from "@/components/GaragePhotoGrid";
import { canRunEvents, canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import GaragePhotoReview from "@/components/GaragePhotoReview";
import { getPendingPhotos } from "@/lib/eventMedia";
import { getPhotoMarks } from "@/lib/garageMedia";
import { getEventBySlug, getEventGalleryPhotos, getEventSubmissionPhotos } from "@/lib/events";
import { getTailgatePhotos } from "@/lib/eventComms";

/** Never served from a cache: the Garage is live data on a phone that stays
 *  open, and stale tasks or answers are worse than a moment's load. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Event photos · A and D Garage",
  robots: { index: false, follow: false },
};

export default async function GarageEventMediaPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) redirect("/garage");

  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const [tailgate, uploads, gallery, marks, pending] = await Promise.all([
    getTailgatePhotos(slug).catch(() => []),
    getEventSubmissionPhotos(event.id).catch(() => []),
    getEventGalleryPhotos(slug).catch(() => []),
    getPhotoMarks().catch(() => []),
    canRunEvents(session) ? getPendingPhotos(event.id).catch(() => []) : Promise.resolve([]),
  ]);
  const byKey = new Map(marks.map((m) => [m.key, m]));
  const me = session.email.toLowerCase();

  const photos: GaragePhoto[] = [
    // What we put up ourselves (the event's Gallery Photos), then posts, then
    // what visitors sent in.
    ...gallery.map((p) => {
      const mark = byKey.get(p.key);
      return {
        key: p.key,
        url: p.url,
        who: "On the site",
        source: "Gallery" as const,
        hidden: Boolean(mark?.hidden),
        stars: mark?.starredBy.length || 0,
        starredByMe: Boolean(mark?.starredBy.includes(me)),
      };
    }),
    ...tailgate.map((p) => {
      const mark = byKey.get(`tailgate|${p.id}`);
      return {
        key: `tailgate|${p.id}`,
        url: p.photoUrl,
        who: p.authorName || "Someone",
        source: "Tailgate" as const,
        // Hidden by staff in Tailgate, or flagged here — either way it's off the site.
        hidden: p.hidden || Boolean(mark?.hidden),
        stars: mark?.starredBy.length || 0,
        starredByMe: Boolean(mark?.starredBy.includes(me)),
      };
    }),
    ...uploads.map((p) => {
      const mark = byKey.get(p.key);
      return {
        key: p.key,
        url: p.url,
        who: p.name,
        source: "Upload" as const,
        hidden: Boolean(mark?.hidden),
        stars: mark?.starredBy.length || 0,
        starredByMe: Boolean(mark?.starredBy.includes(me)),
      };
    }),
  ];

  return (
    <div className="garage">
      <GarageBack title="Photos" />
      <div className="garage-body">
        <h1 className="garage-event-title">{event.title}</h1>
        <p className="garage-event-area">
          {photos.length} photo{photos.length === 1 ? "" : "s"}
        </p>
        {pending.length > 0 && <GaragePhotoReview photos={pending} />}
        <GaragePhotoGrid photos={photos} eventSlug={slug} canRestore={canSeeOwnerOnly(session)} />
      </div>
    </div>
  );
}
