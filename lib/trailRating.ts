/**
 * The A&D Trail Rating (Jose, 2026-09-25, punchlist #42).
 *
 * The four colors and shapes are the standard trail scale riders already know
 * from trail maps and the Forest Service (green circle, blue square, black
 * diamond, double diamond), so a rating means the same thing here as on any
 * map. The names are A&D's own. Never call it "onX": A&D is working toward an
 * onX ambassadorship, so the scale matches theirs, but the badges are ours.
 *
 * Shapes carry the level as well as color, so riders who can't tell the
 * colors apart can still tell the levels apart (WCAG: never color alone).
 */

export type TrailRatingColor = "Green" | "Blue" | "Black" | "Red";

export interface TrailRating {
  color: TrailRatingColor;
  /** The A&D name on the badge. */
  name: string;
  /** The plain word under it. */
  plain: string;
  shape: "circle" | "square" | "diamond" | "double-diamond";
  hex: string;
  /** Badge art (Robin, 2026-09-25): public/img/trail-rating/. The .png beside
   *  each .webp is for email, where webp support is patchy. */
  image: string;
  /** What to expect: three short labeled lines plus one note (Jose 9/25:
   *  readable at a glance, not a wall of text). Rated recovery points are
   *  required at every level (Jose 9/25). */
  facts: { terrain: string; rig: string; gear: string; note: string };
}

/** The labeled lines, in order, for the site and the emails. */
export function ratingFacts(r: TrailRating): [string, string][] {
  return [
    ["Terrain", r.facts.terrain],
    ["Rig", r.facts.rig],
    ["Gear", r.facts.gear],
  ];
}

export const TRAIL_RATINGS: Record<TrailRatingColor, TrailRating> = {
  Green: {
    color: "Green",
    name: "CRUISE",
    plain: "Easy",
    shape: "circle",
    hex: "#2e9e48",
    image: "/img/trail-rating/trail-rating-cruise.webp",
    facts: {
      terrain: "Dirt and fire roads, gentle grades",
      rig: "Stock 4x4 is fine",
      gear: "Rated recovery points required; the rest is nice to have",
      note: "Great first ride.",
    },
  },
  Blue: {
    color: "Blue",
    name: "GET DIRTY",
    plain: "Moderate",
    shape: "square",
    hex: "#1f6fd1",
    image: "/img/trail-rating/trail-rating-get-dirty.webp",
    facts: {
      terrain: "Mud, water, ruts, some obstacles",
      rig: "Stock 4x4, all-terrain tires",
      gear: "Rated recovery points required + a basic kit",
      note: "Getting stuck happens. We'll get you out.",
    },
  },
  Black: {
    color: "Black",
    name: "SEND IT",
    plain: "Difficult",
    shape: "diamond",
    hex: "#111111",
    image: "/img/trail-rating/trail-rating-send-it.webp",
    facts: {
      terrain: "Steep, rocky climbs and tight lines",
      rig: "Bigger tires, armor, lockers",
      gear: "Rated recovery points + a full recovery kit, required",
      note: "Spotters on the hard parts.",
    },
  },
  Red: {
    color: "Red",
    name: "BUILT ONLY",
    plain: "Extreme",
    shape: "double-diamond",
    hex: "#d42a1f",
    image: "/img/trail-rating/trail-rating-built-only.webp",
    facts: {
      terrain: "Extreme obstacles",
      rig: "Purpose-built rigs, experienced drivers",
      gear: "Rated recovery points, a winch + a full recovery kit, required",
      note: "Talk to us before you RSVP.",
    },
  },
};

export const TRAIL_RATING_COLORS = Object.keys(TRAIL_RATINGS) as TrailRatingColor[];

export function trailRatingFor(value: unknown): TrailRating | null {
  return typeof value === "string" && value in TRAIL_RATINGS ? TRAIL_RATINGS[value as TrailRatingColor] : null;
}
