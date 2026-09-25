import Link from "next/link";
import type { TrailRating } from "@/lib/trailRating";

/**
 * The A&D Trail Rating badge (lib/trailRating.ts). Drawn in CSS so it works
 * before Robin's badge art exists; the shape is part of the badge so the
 * level never depends on color alone.
 */
export default function TrailRatingBadge({
  rating,
  showLines = false,
  link = false,
}: {
  rating: TrailRating;
  showLines?: boolean;
  /** Link to the explainer on the Events page (on event pages). */
  link?: boolean;
}) {
  return (
    <div className="trail-rating">
      <div className="trail-rating-badge" style={{ ["--tr" as string]: rating.hex }}>
        <span className={`trail-rating-shape is-${rating.shape}`} aria-hidden="true" />
        <span className="trail-rating-text">
          <span className="trail-rating-label">A&amp;D Trail Rating</span>
          <strong>{rating.name}</strong>
          <span className="trail-rating-plain">{rating.plain}</span>
        </span>
      </div>
      {link && (
        <Link href="/events#trail-rating" className="trail-rating-link">
          What the ratings mean
        </Link>
      )}
      {showLines && (
        <ul className="trail-rating-lines">
          {rating.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
