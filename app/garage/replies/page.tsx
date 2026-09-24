import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageReplyItem from "@/components/GarageReplyItem";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { getReplyQueue, type QueueItem } from "@/lib/replyQueue";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Replies · A and D Garage",
  robots: { index: false, follow: false },
};

export default async function GarageRepliesPage() {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeOwnerOnly(session)) redirect("/garage");

  const items = await getReplyQueue().catch((): QueueItem[] | null => null);
  const open = items?.filter((i) => i.status === "New") ?? [];
  const handled = items?.filter((i) => i.status !== "New") ?? [];

  return (
    <div className="garage">
      <GarageBack title="Replies" />
      <div className="garage-body garage-body-wide">
        <div className="garage-social-top">
          <div>
            <h1 className="garage-event-title">X reply queue</h1>
            <p className="garage-event-area">
              {items ? `${open.length} to look at${handled.length > 0 ? ` · ${handled.length} just handled` : ""}` : ""}
            </p>
          </div>
          <nav className="garage-links garage-links-wrap" aria-label="Related">
            <Link href="/garage/social">Posting board</Link>
          </nav>
        </div>

        <section className="garage-panel">
          <p>
            New posts from the big car and off-road accounts (8 AM) and the most relevant posts on our topics (6:30 PM).
            About 10–15 minutes a day: answer anyone who replied to us first, then pick 3–5 here where we know the subject.
            <strong> Write each reply yourself in the X app</strong>, with no links and no copy-paste. X&apos;s rules forbid automated replies,
            and its ranking can tell when a reply was pasted.
          </p>
        </section>

        {!items ? (
          <p className="garage-error">Couldn&apos;t read the reply queue.</p>
        ) : open.length === 0 ? (
          <section className="garage-panel">
            <h2>Nothing waiting</h2>
            <p>The next search runs at 8 AM or 6:30 PM.</p>
          </section>
        ) : (
          <div className="garage-social-grid">
            {open.map((i) => (
              <GarageReplyItem key={i.id} item={i} />
            ))}
          </div>
        )}

        {handled.length > 0 && (
          <>
            <h2 className="garage-section">Handled</h2>
            <div className="garage-social-grid">
              {handled.map((i) => (
                <GarageReplyItem key={i.id} item={i} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
