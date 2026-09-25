import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageCommentItem from "@/components/GarageCommentItem";
import { BUCKETS, getComments, type Bucket, type HarvestedComment } from "@/lib/commentHarvest";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Comments · A and D Garage",
  robots: { index: false, follow: false },
};

const BLURB: Record<Bucket, string> = {
  Question: "Real questions from viewers. These are what the Q&A episode is waiting for — answer them where they were asked, too.",
  Debate: "Disagreements and comparisons. A good one is a Garage Take on its own.",
  Praise: "Worth a like and a short thank you. Nothing else needed.",
  Noise: "Emoji, one-liners and spam. Here so nothing is silently thrown away.",
};

export default async function GarageCommentsPage() {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeOwnerOnly(session)) redirect("/garage");

  const items = await getComments().catch((): HarvestedComment[] | null => null);
  const open = items?.filter((i) => i.status === "New") ?? [];
  const handled = items?.filter((i) => i.status !== "New") ?? [];
  const keeping = handled.filter((i) => i.status === "Q&A episode" || i.status === "Garage Take");

  return (
    <div className="garage">
      <GarageBack title="Comments" />
      <div className="garage-body garage-body-wide">
        <div className="garage-social-top">
          <div>
            <h1 className="garage-event-title">Comment harvest</h1>
            <p className="garage-event-area">
              {items ? `${open.length} to look at · ${keeping.length} saved for an episode` : ""}
            </p>
          </div>
          <nav className="garage-links garage-links-wrap" aria-label="Related">
            <Link href="/garage/social">Posting board</Link>
            <Link href="/garage/replies">Replies</Link>
          </nav>
        </div>

        <section className="garage-panel">
          <p>
            Every Monday this pulls the week&apos;s new YouTube, Instagram and Facebook comments and sorts them into four piles. The sorting is
            keyword matching, so it gets things wrong — move a comment to the right pile with the arrows on its card.
            <strong> Reply on the platform itself</strong>; nothing here posts anything. Anything marked
            <strong> Q&amp;A episode</strong> or <strong>Garage Take</strong> stays on the list as material.
          </p>
        </section>

        {!items ? (
          <section className="garage-panel">
            <p className="garage-error">Couldn&apos;t read the comment list.</p>
            <p>
              If this is the first run, the <strong>Comments</strong> table still has to be created in the A&amp;D
              Analytics base, with these fields: Comment ID · Video ID · Video Title · URL · Author · Text · Likes
              (number) · Replies (number) · Published At (date &amp; time) · Harvested At (date &amp; time) · Bucket
              (single select: Question, Debate, Praise, Noise) · Status (single select: New, Answered, Q&amp;A episode,
              Garage Take, Ignore) · Handled By · Notes (long text).
            </p>
          </section>
        ) : open.length === 0 && handled.length === 0 ? (
          <section className="garage-panel">
            <h2>Nothing harvested yet</h2>
            <p>The next pull runs Monday morning.</p>
          </section>
        ) : (
          BUCKETS.map((bucket) => {
            const rows = open.filter((i) => i.bucket === bucket);
            if (!rows.length) return null;
            return (
              <section key={bucket}>
                <h2 className="garage-section">
                  {bucket} ({rows.length})
                </h2>
                <p className="garage-event-area">{BLURB[bucket]}</p>
                <div className="garage-social-grid">
                  {rows.map((i) => (
                    <GarageCommentItem key={i.id} item={i} />
                  ))}
                </div>
              </section>
            );
          })
        )}

        {handled.length > 0 && (
          <>
            <h2 className="garage-section">Handled</h2>
            <div className="garage-social-grid">
              {handled.map((i) => (
                <GarageCommentItem key={i.id} item={i} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
