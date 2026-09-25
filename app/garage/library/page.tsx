import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageLibrary, { type LibraryItem } from "@/components/GarageLibrary";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { displayKind } from "@/lib/mediaKinds";
import { getMediaLibrary } from "@/lib/mediaLibrary";
import { matchPostedMedia } from "@/lib/mediaUsage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Library · A and D Garage",
  robots: { index: false, follow: false },
};

/**
 * Garage → Library: find any filed footage and save it to your phone, without
 * opening Google Drive. Open to every signed-in Garage user — the crew shoots
 * most of this footage, and they're the ones who need to find it again.
 */
export default async function GarageLibraryPage() {
  const session = await getSession();
  if (!session) redirect("/garage");

  const [rows, usage] = await Promise.all([
    getMediaLibrary().catch(() => null),
    // Owners only: posted clips the Library has never seen (#7).
    canSeeOwnerOnly(session) ? matchPostedMedia().catch(() => null) : Promise.resolve(null),
  ]);
  // Only what the screen shows goes to the browser: Thoughts and the AI
  // keywords stay on the server, and every row gets its display Kind here.
  const items: LibraryItem[] | null =
    rows?.map((r) => ({
      id: r.id,
      fileId: r.fileId,
      fileName: r.fileName,
      kind: displayKind(r.kind),
      label: r.label,
      uploadedBy: r.uploadedBy,
      uploadedAt: r.uploadedAt,
      keywords: r.keywords,
      eventType: r.eventType,
      venueTypes: r.venueTypes,
      size: r.size,
      driveLink: r.driveLink,
    })) ?? null;

  return (
    <div className="garage">
      <GarageBack title="Library" />
      <div className="garage-body garage-body-wide">
        <div className="garage-social-top">
          <div>
            <h1 className="garage-event-title">Media library</h1>
            <p className="garage-event-area">Every clip and photo uploaded through the Garage, newest first.</p>
          </div>
          <nav className="garage-links garage-links-wrap" aria-label="Related">
            <Link href="/garage/upload">Upload</Link>
            <Link href="/garage/media">Media</Link>
          </nav>
        </div>

        {usage && usage.unlisted.length > 0 && (
          <section className="garage-panel garage-library-unlisted" aria-labelledby="library-unlisted">
            <h2 id="library-unlisted" className="garage-section">Posted, not in the Library</h2>
            <p className="garage-form-note">
              These clips went out on a card in the last 4 weeks but were never uploaded here, so the footage count can&apos;t
              see them. Upload each one once (Garage → Upload) and it drops off this list.
            </p>
            <ul>
              {usage.unlisted.map((u) => (
                <li key={u.fileName}>
                  <Link href={`/garage/social?card=${u.cardId}`}>{u.fileName}</Link> · {u.platform}, {u.due}
                  {u.topic ? ` · ${u.topic}` : ""}
                </li>
              ))}
            </ul>
          </section>
        )}

        {items ? (
          <GarageLibrary items={items} canAttach={canSeeOwnerOnly(session)} />
        ) : (
          <section className="garage-panel">
            <p className="garage-error">Couldn&apos;t read the media library. Try again in a minute.</p>
          </section>
        )}
      </div>
    </div>
  );
}
