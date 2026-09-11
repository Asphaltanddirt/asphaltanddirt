import Link from "next/link";
import type { Testimonial } from "@/lib/testimonials";
import TestimonialQuote from "./TestimonialQuote";

function stars(rating: number) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}

/** Shared "What Our Community Says" grid — used on Home and Community, both
 *  backed by the same live, Approved-gated Airtable testimonials. Renders
 *  nothing until at least one is approved, rather than showing an empty grid. */
export default function TestimonialGrid({
  testimonials,
  gridClass = "grid-testimonials",
  expandable = false,
}: {
  testimonials: Testimonial[];
  /** "grid-testimonials" (default, auto-fit) or e.g. "grid-3" for a fixed
   *  three-across row (home page). */
  gridClass?: string;
  /** Clamp long quotes to a preview with an inline "Read more" (home 3-up). */
  expandable?: boolean;
}) {
  if (testimonials.length === 0) return null;

  return (
    <>
      <div className={`grid ${gridClass}`}>
        {testimonials.map((t) => (
          <div className="testimonial" key={t.id}>
            <TestimonialQuote quote={t.quote} expandable={expandable} />
            <div className="testimonial-foot">
              {t.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="avatar" src={t.photoUrl} alt={t.name} />
              ) : (
                <div className="avatar-initial">{t.name.trim().charAt(0).toUpperCase() || "?"}</div>
              )}
              <div>
                <div className="testimonial-name">{t.name}</div>
                <div className="testimonial-role">{t.role}</div>
              </div>
              <div className="stars testimonial-stars">{stars(t.rating)}</div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-center mt-4">
        <Link href="/reviews/submit" className="view-all">Leave A Review</Link>
      </p>
    </>
  );
}
