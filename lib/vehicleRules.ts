/**
 * An event's Requirements: its own items from the Events table's
 * "Requirements" field (radios, tire size...) followed by the standard rule
 * set for each place ticked in "Venue Type" (State Forest, Private Land,
 * Off-Road Park). A&D follows the state rules to the letter (Jose,
 * 2026-09-16). One model feeds the event page's Requirements section, the
 * RSVP form's required checkbox and the confirmation email, so they never
 * disagree.
 *
 * The NJ set condenses N.J.A.C. 7:2, the State Park Service Code (checked
 * 2026-09-16), kept general because rides use several state forests and
 * parks (no forest-specific maps). Organizer-only duties (20+ group reservation, roster, event
 * and commercial permits) are A&D's job and stay off the attendee list.
 *
 * Changing the wording means a new version, so each RSVP row keeps the one
 * that person agreed to.
 */

export interface VehicleRuleGroup {
  heading: string;
  cite: string;
  rules: string[];
}

export interface VehicleRuleSet {
  version: string;
  title: string;
  intro: string;
  groups: VehicleRuleGroup[];
  link?: { label: string; url: string };
}

export const VEHICLE_RULES: Record<string, VehicleRuleSet> = {
  "State Forest (NJ)": {
    version: "NJ-STATE-FOREST-1.0",
    title: "NJ State Forest Rules",
    intro:
      "This ride is on New Jersey state forest or park roads. State rules apply to every vehicle and rider, and we follow them to the letter. A vehicle that doesn't meet them can't ride with the group.",
    groups: [
      {
        heading: "Vehicles",
        cite: "N.J.A.C. 7:2-3.1, 3.2",
        rules: [
          "Registered, plated and insured, and the driver carries a valid license.",
          "No ATVs, dirt bikes or unregistered vehicles.",
          "No vehicles with more than two axles, and no tires over 40 inches.",
        ],
      },
      {
        heading: "Where You Can Drive",
        cite: "N.J.A.C. 7:2-3.4",
        rules: [
          "Established roads and designated parking only, and no road closed by signs or barriers.",
          "No driving in the woods, swamps, bogs, wetlands or fields. That includes going around a puddle off the road.",
          "Stay on roads open to vehicles. Park Police write summonses.",
        ],
      },
      {
        heading: "On The Ride",
        cite: "N.J.A.C. 7:2-2.6, 3.4(e), 9.3",
        rules: [
          "No racing or showing off. Races, rallies and exhibitions need a state permit.",
          "No alcohol anywhere in the forest.",
          "At least one adult for every nine riders under 18.",
        ],
      },
    ],
  },
  // Private Land and Off-Road Park are first drafts (2026-09-16) for Jose to
  // review. Venue-specific details go in the event's own Requirements.
  "Private Land": {
    version: "PRIVATE-LAND-1.0",
    title: "Private Land Rules",
    intro:
      "Part of this ride is on private land, used with the owner's permission. Keeping that permission depends on every rider following these rules.",
    groups: [
      {
        heading: "On The Property",
        cite: "Landowner permission",
        rules: [
          "Only the routes and areas staff show you. Everything else is off limits.",
          "Leave gates, fences and anything you find the way they were.",
          "Pack out everything you bring, and report any damage to staff right away.",
        ],
      },
      {
        heading: "The Permission",
        cite: "Landowner permission",
        rules: [
          "The owner's permission covers this ride only. Don't come back on your own.",
          "Follow any rule the owner or staff give on the day, including no alcohol if they say so.",
        ],
      },
    ],
  },
  "Off-Road Park": {
    version: "OFF-ROAD-PARK-1.0",
    title: "Off-Road Park Rules",
    intro:
      "Part of this ride is at an off-road park. The park sets its own rules, and they apply on top of ours.",
    groups: [
      {
        heading: "Before You Go",
        cite: "The park's rules",
        rules: [
          "Buy your own pass or entry and sign the park's waiver directly with the park.",
          "Check the park's own vehicle and gear rules (for example flags, helmets, registration) and meet them.",
        ],
      },
      {
        heading: "At The Park",
        cite: "The park's rules",
        rules: [
          "Open trails only, and obey the park's trail ratings, closures and staff.",
          "No alcohol while driving or riding.",
        ],
      },
    ],
  },
};


export interface EventRequirements {
  /** This event's own requirements, in the order the team wrote them. */
  items: string[];
  /** One standard set per Venue Type ticked on the event. */
  ruleSets: VehicleRuleSet[];
}

export const REQUIREMENTS_ACCEPT_LABEL =
  "I've read the Requirements. If I'm driving, my vehicle and I meet them, and I'll follow them for the whole ride.";

export function requirementsFor(event: { requirements: string[]; venueTypes: string[] }): EventRequirements | null {
  const ruleSets = event.venueTypes.map((type) => VEHICLE_RULES[type]).filter((set): set is VehicleRuleSet => Boolean(set));
  if (event.requirements.length === 0 && ruleSets.length === 0) return null;
  return { items: event.requirements, ruleSets };
}

/** What gets stored on the RSVP row (a single-line field): the event's items
 *  as they read when the person agreed (they can change later) and each rule
 *  set's version. */
export function requirementsRecord(req: EventRequirements): string {
  return [
    ...(req.items.length ? [`Event: ${req.items.join("; ")}`] : []),
    ...(req.ruleSets.length ? [`Rules: ${req.ruleSets.map((set) => set.version).join(", ")}`] : []),
  ].join(" | ");
}
