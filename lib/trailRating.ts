/**
 * The A&D Ride Rating (was the Trail Rating; Jose 2026-09-25, renamed and
 * widened to road events 2026-10-02).
 *
 * The colors and shapes are the standard trail scale riders already know from
 * trail maps and the Forest Service (green circle, blue square, black
 * diamond, double diamond), so a rating means the same thing here as on any
 * map. Park It (meets and pop-ups) borrows the ski-map terrain-park oval in
 * A&D orange and sits first, below Cruise. The names are A&D's own. Never call
 * it "onX": A&D is working toward an onX ambassadorship, so the scale matches
 * theirs, but the badges are ours.
 *
 * One badge per level for every event; what changes with the event's side is
 * the wording underneath: Asphalt lines and Dirt lines (Jose 10/2). Send It
 * and Rip It on asphalt are closed-course only, never public roads.
 *
 * Shapes carry the level as well as color, so riders who can't tell the
 * colors apart can still tell the levels apart (WCAG: never color alone).
 */

export type TrailRatingColor = "Orange" | "Green" | "Blue" | "Black" | "Red";
export type RatingSide = "asphalt" | "dirt";

/** Three short labeled lines plus one note (Jose 9/25: readable at a glance,
 *  not a wall of text). */
export interface RatingLines {
  lines: [string, string][];
  note: string;
}

export interface TrailRating {
  color: TrailRatingColor;
  /** The A&D name on the badge. */
  name: string;
  /** The plain word under it. */
  plain: string;
  shape: "oval" | "circle" | "square" | "diamond" | "double-diamond";
  hex: string;
  /** Badge art (Robin, 2026-10-02): public/img/trail-rating/. The .png beside
   *  each .webp is for email, where webp support is patchy. */
  image: string;
  asphalt: RatingLines;
  dirt: RatingLines;
  /** Park It reads the same on both sides, so it shows one set of lines. */
  sameBothSides?: boolean;
}

/** GMRS radios are required from dirt Run It up (Jose 10/2). The phrase links
 *  to the FCC's GMRS page, no more explanation than that. */
export const GMRS_URL = "https://www.fcc.gov/wireless/bureau-divisions/mobility-division/general-mobile-radio-service-gmrs";
const LINKED = "GMRS radio";

/** Splits a line around "GMRS radio" so the site and the emails can link it. */
export function linkParts(text: string): { text: string; href?: string }[] {
  const i = text.indexOf(LINKED);
  if (i < 0) return [{ text }];
  return [
    { text: text.slice(0, i) },
    { text: LINKED, href: GMRS_URL },
    { text: text.slice(i + LINKED.length) },
  ].filter((p) => p.text);
}

const SIDE_LABEL: Record<RatingSide, string> = { asphalt: "Asphalt", dirt: "Dirt" };
export function sideLabel(side: RatingSide): string {
  return SIDE_LABEL[side];
}

/** Which wording an event shows, from its Event Type: Both shows both. */
export function sidesFor(eventType: string | undefined): RatingSide[] {
  if (eventType === "Asphalt") return ["asphalt"];
  if (eventType === "Both") return ["asphalt", "dirt"];
  return ["dirt"];
}

const parkIt: RatingLines = {
  lines: [
    ["Where", "Car meets, shows and pop-ups. No driving route"],
    ["Vehicle", "Whatever you drive (or walk in)"],
    ["Bring", "An appetite"],
  ],
  note: "Our participation trophy.",
};

export const TRAIL_RATINGS: Record<TrailRatingColor, TrailRating> = {
  Orange: {
    color: "Orange",
    name: "PARK IT",
    plain: "Meet-up",
    shape: "oval",
    hex: "#f86000",
    image: "/img/trail-rating/ride-rating-park-it.webp",
    asphalt: parkIt,
    dirt: parkIt,
    sameBothSides: true,
  },
  Green: {
    color: "Green",
    name: "CRUISE",
    plain: "Easy",
    shape: "circle",
    hex: "#2e9e48",
    image: "/img/trail-rating/ride-rating-cruise.webp",
    asphalt: {
      lines: [
        ["Route", "Scenic roads, easy pace"],
        ["Vehicle", "Any roadworthy vehicle"],
        ["Gear", "Nothing special"],
      ],
      note: "Great first drive.",
    },
    dirt: {
      lines: [
        ["Terrain", "Dirt and fire roads, gentle grades"],
        ["Rig", "Stock 4x4 is fine"],
        ["Gear", "Rated recovery points required; the rest is nice to have"],
      ],
      note: "Great first ride.",
    },
  },
  Blue: {
    color: "Blue",
    name: "RUN IT",
    plain: "Moderate",
    shape: "square",
    hex: "#1f6fd1",
    image: "/img/trail-rating/ride-rating-run-it.webp",
    asphalt: {
      lines: [
        ["Route", "Winding roads, tighter corners, hills"],
        ["Vehicle", "Good tires and brakes"],
        ["Gear", "Nothing special"],
      ],
      note: "Same roads, more fun.",
    },
    dirt: {
      lines: [
        ["Terrain", "Mud, water, ruts, small obstacles"],
        ["Rig", "Stock 4x4, all-terrain tires"],
        ["Gear", "Rated recovery points, a basic kit + a GMRS radio, required"],
      ],
      note: "Getting stuck happens. We will help get you out.",
    },
  },
  Black: {
    color: "Black",
    name: "SEND IT",
    plain: "Difficult",
    shape: "diamond",
    hex: "#111111",
    image: "/img/trail-rating/ride-rating-send-it.webp",
    asphalt: {
      lines: [
        ["Route", "Closed-course track sessions only"],
        ["Vehicle", "Track-ready, passes the event's tech"],
        ["Gear", "Helmet + the event's safety gear"],
      ],
      note: "Track rules rule.",
    },
    dirt: {
      lines: [
        ["Terrain", "Steep, rocky climbs, deep ruts, tight lines"],
        ["Rig", "Bigger tires, armor, lockers"],
        ["Gear", "Rated recovery points, a full kit + a GMRS radio, required"],
      ],
      note: "Spotters on the hard parts.",
    },
  },
  Red: {
    color: "Red",
    name: "RIP IT",
    plain: "Extreme",
    shape: "double-diamond",
    hex: "#d42a1f",
    image: "/img/trail-rating/ride-rating-rip-it.webp",
    asphalt: {
      lines: [
        ["Route", "Racing or advanced track sessions, closed course only"],
        ["Vehicle", "Built for the discipline"],
        ["Gear", "The event's full safety gear"],
      ],
      note: "Talk to us before you sign up.",
    },
    dirt: {
      lines: [
        ["Terrain", "Severe obstacles or off-road race courses"],
        ["Rig", "Purpose-built rigs, experienced drivers"],
        ["Gear", "Rated recovery points, a winch, a full kit + a GMRS radio, required"],
      ],
      note: "Talk to us before you RSVP.",
    },
  },
};

/** Low to high: Park It first (Jose 10/2, "natural evaluation"). */
export const TRAIL_RATING_COLORS = Object.keys(TRAIL_RATINGS) as TrailRatingColor[];

/** The shape as a text character, for emails and plain text. */
export const SHAPE_CHAR: Record<TrailRating["shape"], string> = {
  oval: "⬬",
  circle: "●",
  square: "■",
  diamond: "◆",
  "double-diamond": "◆◆",
};

/** Under the badges on the Events page (Jose 10/2: the laws line covers
 *  posted limits; the copy itself never talks about pace on public roads). */
export const RATING_FOOTNOTE =
  "Ratings describe the route and the prep it takes, in normal weather. If weather bumps a ride up a level, we tell everyone who RSVP'd. Check each event page for its exact requirements. All local and state traffic laws apply, always. Not sure where your vehicle fits? Ask us, no pressure.";

export function trailRatingFor(value: unknown): TrailRating | null {
  return typeof value === "string" && value in TRAIL_RATINGS ? TRAIL_RATINGS[value as TrailRatingColor] : null;
}
