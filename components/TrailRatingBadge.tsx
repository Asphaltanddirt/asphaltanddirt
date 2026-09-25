import Link from "next/link";
import { ratingFacts, type TrailRating } from "@/lib/trailRating";

/**
 * The A&D Trail Rating badge (lib/trailRating.ts): Robin's art (2026-09-25),
 * hexagon with the trail symbol, name and plain word, so the level never
 * depends on color alone.
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
      {/* The art carries the shape, name and plain word; the alt text says the
          same for screen readers, so nothing depends on the picture alone. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={rating.image}
        alt={`A&D Trail Rating: ${rating.name} (${rating.plain})`}
        width={120}
        height={120}
        className="trail-rating-img"
        loading="lazy"
      />
      {link && (
        <Link href="/events#trail-rating" className="trail-rating-link">
          What the ratings mean
        </Link>
      )}
      {showLines && <TrailRatingFacts rating={rating} />}
    </div>
  );
}

/** Terrain / Rig / Gear, then the one-line note. Shared by the event page and
 *  the picker on the Events page. */
export function TrailRatingFacts({ rating }: { rating: TrailRating }) {
  return (
    <div className="trail-rating-facts">
      <dl>
        {ratingFacts(rating).map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="trail-rating-note">{rating.facts.note}</p>
    </div>
  );
}
