import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageReviewActions from "@/components/GarageReviewActions";
import GarageTaggedPosts from "@/components/GarageTaggedPosts";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { listReviews, listTaggedPosts, type ReviewItem } from "@/lib/garageReview";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Reviews · A and D Garage",
  robots: { index: false, follow: false },
};

const day = (iso: string) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");

function ReviewCard({ r }: { r: ReviewItem }) {
  return (
    <article className="garage-panel garage-review-card">
      <p className="garage-roster-meta">
        {[r.role, r.rating ? `${r.rating} of 5 stars` : "", day(r.created)].filter(Boolean).join(" · ")}
      </p>
      <blockquote className="garage-review-quote">{r.quote || "(no text)"}</blockquote>
      <p>
        <strong>{r.name}</strong>
        {r.email && (
          <>
            {" · "}
            <a href={`mailto:${r.email}`}>{r.email}</a>
          </>
        )}
      </p>
      {r.photos.length > 0 && (
        <div className="garage-review-photos">
          {r.photos.map((p, i) => (
            <a key={i} href={p.full} target="_blank" rel="noopener">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumb} alt={`Photo with ${r.name}'s review`} loading="lazy" />
            </a>
          ))}
        </div>
      )}
      <GarageReviewActions
        kind="review"
        id={r.id}
        state={r.state}
        toggle={{ field: "homepage", label: "Show on the home page", help: "The 3 reviews above the podcast. Aim for one customer, one community member, one event attendee.", value: r.homepage }}
      />
    </article>
  );
}

export default async function GarageReviewReviewsPage() {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeOwnerOnly(session)) redirect("/garage");
  const [reviews, posts] = await Promise.all([listReviews().catch(() => null), listTaggedPosts().catch(() => null)]);
  const waiting = reviews?.filter((r) => r.state === "waiting") || [];
  const approved = reviews?.filter((r) => r.state === "approved") || [];
  const declined = reviews?.filter((r) => r.state === "declined") || [];
  const onHome = approved.filter((r) => r.homepage).length;

  return (
    <div className="garage">
      <GarageBack title="Reviews" />
      <div className="garage-body">
        <h1 className="garage-event-title">Reviews</h1>
        {!reviews ? (
          <p className="garage-error">Couldn&apos;t read the Testimonials table.</p>
        ) : (
          <>
            <h2 className="garage-section">Waiting ({waiting.length})</h2>
            {waiting.length === 0 ? <p className="garage-empty">Nothing waiting.</p> : waiting.map((r) => <ReviewCard key={r.id} r={r} />)}

            <details className="garage-review-group">
              <summary>
                <h2 className="garage-section">On the site ({approved.length}, {onHome} on the home page)</h2>
              </summary>
              {approved.map((r) => <ReviewCard key={r.id} r={r} />)}
            </details>

            {declined.length > 0 && (
              <details className="garage-review-group">
                <summary>
                  <h2 className="garage-section">Declined ({declined.length})</h2>
                </summary>
                {declined.map((r) => <ReviewCard key={r.id} r={r} />)}
              </details>
            )}
          </>
        )}

        <h2 className="garage-section">Tagged posts</h2>
        <section className="garage-panel">
          <p className="garage-form-note">Posts that tagged A&amp;D, shown on the Community page.</p>
          {posts ? <GarageTaggedPosts posts={posts} /> : <p className="garage-error">Couldn&apos;t read the Social Proof table.</p>}
        </section>
      </div>
    </div>
  );
}
