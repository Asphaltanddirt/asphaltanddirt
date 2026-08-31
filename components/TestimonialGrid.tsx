import Link from "next/link";
import type { Testimonial } from "@/lib/testimonials";

function stars(rating: number) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}

/** Shared "What Our Community Says" grid — used on Home and Community, both
 *  backed by the same live, Approved-gated Airtable testimonials. Renders
 *  nothing until at least one is approved, rather than showing an empty grid. */
export default function TestimonialGrid({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null;

  return (
    <>
      <div className="grid grid-3">
        {testimonials.map((t) => (
          <div className="testimonial" key={t.id}>
            <span className="quote-mark">&ldquo;</span>
            <div className="stars">{stars(t.rating)}</div>
            <p>{t.quote}</p>
            <div className="testimonial-foot">
              <div className="avatar-initial">{t.name.trim().charAt(0).toUpperCase() || "?"}</div>
              <div>
                <div className="testimonial-name">{t.name}</div>
                <div className="testimonial-role">{t.role}</div>
              </div>
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
