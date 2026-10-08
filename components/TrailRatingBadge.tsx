import Link from "next/link";
import { linkParts, sideLabel, sidesFor, type RatingLines, type RatingSide, type TrailRating } from "@/lib/trailRating";

/**
 * The A&D Ride Rating badge (lib/trailRating.ts): Robin's art (2026-10-02),
 * hexagon with the shape, name and plain word, so the level never depends on
 * color alone.
 */
export default function TrailRatingBadge({
  rating,
  eventType,
  showLines = false,
  link = false,
}: {
  rating: TrailRating;
  /** Asphalt / Dirt / Both: picks which wording shows under the badge. */
  eventType?: string;
  showLines?: boolean;
  /** Link to the explainer on the Events page (on event pages). */
  link?: boolean;
}) {
  const sides = rating.sameBothSides ? (["dirt"] as RatingSide[]) : sidesFor(eventType);
  return (
    <div className={showLines ? "trail-rating has-lines" : "trail-rating"}>
      {/* Badge + link on the left, the facts fill the space to its right
          (Jose 10/8); stacked on phones. */}
      <div className="trail-rating-mark">
        {/* The art carries the shape, name and plain word; the alt text says the
            same for screen readers, so nothing depends on the picture alone. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={rating.image}
          alt={`A&D Ride Rating: ${rating.name} (${rating.plain})`}
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
      </div>
      {showLines && (
        <div className="trail-rating-body">
          {sides.map((s) => (
            <TrailRatingFacts key={s} lines={rating[s]} heading={sides.length > 1 ? sideLabel(s) : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}

/** A line's text with "GMRS radio" linked to the FCC page. */
export function LinkedText({ text }: { text: string }) {
  return (
    <>
      {linkParts(text).map((p, i) =>
        p.href ? (
          <a key={i} href={p.href} target="_blank" rel="noopener noreferrer">
            {p.text}
          </a>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

/** The three labeled lines, then the one-line note. Shared by the event page
 *  and the picker on the Events page. */
export function TrailRatingFacts({ lines, heading }: { lines: RatingLines; heading?: string }) {
  return (
    <div className="trail-rating-facts">
      {heading && <p className="trail-rating-side">{heading}</p>}
      <dl>
        {lines.lines.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>
              <LinkedText text={v} />
            </dd>
          </div>
        ))}
      </dl>
      <p className="trail-rating-note">{lines.note}</p>
    </div>
  );
}
