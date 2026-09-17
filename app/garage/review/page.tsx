import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { reviewCounts } from "@/lib/garageReview";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Review · A and D Garage",
  robots: { index: false, follow: false },
};

/** What the public sent in, and what the site features. */
export default async function GarageReviewHub() {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeOwnerOnly(session)) redirect("/garage");
  const counts = await reviewCounts();
  const waiting = (n: number | null) => (n === null ? "" : n === 0 ? "Nothing waiting" : `${n} waiting`);

  const rows = [
    { href: "/garage/review/builds", label: "Builds", sub: waiting(counts.builds), hint: "Rigs sent in from /builds/submit" },
    { href: "/garage/review/reviews", label: "Reviews & tagged posts", sub: waiting(counts.reviews), hint: "Reviews from /reviews/submit, posts that tagged us" },
    { href: "/garage/review/featured", label: "Featured on the site", sub: "", hint: "Featured Rigs on /builds, products on Home and Merch" },
  ];

  return (
    <div className="garage">
      <GarageBack title="Review" />
      <div className="garage-body">
        <h1 className="garage-event-title">Review</h1>
        <section className="garage-panel">
          <ul className="garage-roster">
            {rows.map((r) => (
              <li key={r.href}>
                <Link href={r.href} className="garage-app-row">
                  <span className="garage-app-main">
                    <strong>{r.label}</strong>
                    <span className="garage-roster-meta">{r.hint}</span>
                  </span>
                  {r.sub && <span className={r.sub.startsWith("Nothing") ? "garage-tag" : "garage-tag garage-tag-new"}>{r.sub}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
