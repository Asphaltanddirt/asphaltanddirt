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
  /** The standard "what to expect / what you need" lines for this level. */
  lines: string[];
}

export const TRAIL_RATINGS: Record<TrailRatingColor, TrailRating> = {
  Green: {
    color: "Green",
    name: "CRUISE",
    plain: "Easy",
    shape: "circle",
    hex: "#2e9e48",
    image: "/img/trail-rating/trail-rating-cruise.webp",
    lines: [
      "Smooth dirt and fire roads with gentle grades.",
      "Stock 4x4s welcome. Great first ride.",
      "Recovery gear is nice to have, not needed.",
    ],
  },
  Blue: {
    color: "Blue",
    name: "GET DIRTY",
    plain: "Moderate",
    shape: "square",
    hex: "#1f6fd1",
    image: "/img/trail-rating/trail-rating-get-dirty.webp",
    lines: [
      "Mud, water, ruts and some obstacles. Your rig will get dirty.",
      "Stock 4x4s welcome; all-terrain tires recommended.",
      "Rated recovery points and basic recovery gear recommended. Getting stuck is possible, and we'll get you out.",
    ],
  },
  Black: {
    color: "Black",
    name: "SEND IT",
    plain: "Difficult",
    shape: "diamond",
    hex: "#111111",
    image: "/img/trail-rating/trail-rating-send-it.webp",
    lines: [
      "Technical sections: steep or rocky climbs and tight lines.",
      "Built rigs: bigger tires, armor and lockers recommended.",
      "Spotters used. Full recovery gear required.",
    ],
  },
  Red: {
    color: "Red",
    name: "BUILT ONLY",
    plain: "Extreme",
    shape: "double-diamond",
    hex: "#d42a1f",
    image: "/img/trail-rating/trail-rating-built-only.webp",
    lines: [
      "Extreme obstacles for purpose-built vehicles.",
      "Experienced drivers only. Winch and a full recovery kit required.",
      "Talk to us before you RSVP.",
    ],
  },
};

export const TRAIL_RATING_COLORS = Object.keys(TRAIL_RATINGS) as TrailRatingColor[];

export function trailRatingFor(value: unknown): TrailRating | null {
  return typeof value === "string" && value in TRAIL_RATINGS ? TRAIL_RATINGS[value as TrailRatingColor] : null;
}
