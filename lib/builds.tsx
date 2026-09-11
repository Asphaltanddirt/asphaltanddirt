import type { ReactNode } from "react";

export type BuildIconKey = "vehicle" | "bolt" | "wrench" | "cross" | "compass" | "lift" | "headlight" | "clock" | "mountain";

export const BUILD_ICONS: Record<BuildIconKey, ReactNode> = {
  vehicle: (
    <>
      <path d="M4 16V11l2.2-4.4A2 2 0 0 1 8 5.5h8a2 2 0 0 1 1.8 1.1L20 11v5" />
      <path d="M4 16h16v3H4z" /><circle cx="8" cy="19" r="1.4" /><circle cx="16" cy="19" r="1.4" />
    </>
  ),
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6z" />,
  wrench: <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4l-2.6 2.6-2-2z" />,
  cross: <path d="M12 2v20M2 12h20" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v5M12 15.5v5M3.5 12h5M15.5 12h5M6 6l3.5 3.5M14.5 14.5 18 18M18 6l-3.5 3.5M9.5 14.5 6 18" />
    </>
  ),
  lift: (
    <>
      <path d="M12 2v4M12 18v4M9 6h6l-1 3H10zM9 15h6l-1 3H10z" />
      <path d="M9 9h6v6H9z" />
    </>
  ),
  headlight: (
    <>
      <path d="M4 8h3l2-2h6l2 2h3v11H4z" /><circle cx="12" cy="13.5" r="3.3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" />
    </>
  ),
  mountain: <path d="M3 19 9 8l4 6.5L15 11l6 8z" />,
};

export interface BuildSpec {
  label: string;
  value: string;
  icon: BuildIconKey;
}

export interface BuildStat {
  value: string;
  unit: string;
  icon: BuildIconKey;
}

export type BuildCategory = "daily-driven" | "trail-built" | "overland" | "performance";

export interface Build {
  slug: string;
  nameLines: string[];
  badge?: string;
  /** True for approved community builds submitted by an active Road & Trail
   *  Crew ambassador — drives the ambassador emblem and priority ordering.
   *  Always absent for the 4 host builds below. */
  isAmbassador?: boolean;
  vehicle: string;
  lead: string;
  kicker: string;
  category: BuildCategory;
  stats: BuildStat[];
  listingImage: { src: string; alt: string };
  heroImage: { src: string; alt: string };
  listingSpecs: { label: string; value: string }[];
  specs: BuildSpec[];
  aboutText: string;
  aboutStats: { label: string; value: string; icon: BuildIconKey }[];
  gallery?: { src: string; alt: string }[];
}

// Cyclical order matches the original site's prev/next links: Rock Rhino ->
// Stoned -> Iron Bandit -> Shockwave -> (back to Rock Rhino).
export const builds: Build[] = [
  {
    slug: "rock-rhino",
    nameLines: ["Rock", "Rhino"],
    vehicle: "2026 Jeep Wrangler Rubicon Extreme Recon",
    lead: "A 2026 Rubicon Extreme Recon that racks up 25,000 miles a year as a daily — starting mild on 35s, with portal axles and 40s as the endgame.",
    kicker: "Jose's Daily Driver Build",
    category: "daily-driven",
    stats: [
      { value: "285 HP", unit: "3.6L Pentastar V6", icon: "bolt" },
      { value: "35\"", unit: "BFGoodrich KO2", icon: "compass" },
      { value: "1\"", unit: "Mopar Lift", icon: "lift" },
    ],
    listingImage: { src: "/img/builds/rock-rhino.jpg", alt: "Rock Rhino, Jose's 2026 Jeep Wrangler Rubicon Extreme Recon in Anvil, doors off on a residential street" },
    heroImage: { src: "/img/builds/rock-rhino-hero.jpg", alt: "Rock Rhino, a 2026 Jeep Wrangler Rubicon Extreme Recon in Anvil, blasting through a mud hole on the trail" },
    listingSpecs: [
      { label: "Engine", value: "3.6L Pentastar V6" },
      { label: "Suspension", value: "Mopar 1\" Factory Lift" },
      { label: "Tires", value: "35\" BFGoodrich All-Terrain KO2" },
      { label: "Armor", value: "MetalCloak Skid Plates" },
    ],
    specs: [
      { label: "Base Vehicle", value: "2026 Jeep Wrangler Rubicon Extreme Recon", icon: "vehicle" },
      { label: "Color", value: "Anvil", icon: "cross" },
      { label: "Engine", value: "3.6L Pentastar V6 (285 HP) — stock", icon: "bolt" },
      { label: "Suspension / Lift", value: "Mopar 1\" Factory Lift", icon: "lift" },
      { label: "Wheels & Tires", value: "Factory Extreme Recon wheels, 35\" BFGoodrich All-Terrain KO2", icon: "compass" },
      { label: "Armor", value: "MetalCloak Front & Rear Skid Plates", icon: "cross" },
      { label: "Next Up", value: "38\" tires on a low-center-of-gravity lift", icon: "lift" },
      { label: "End Game", value: "40s, more lift, portal axles", icon: "compass" },
    ],
    aboutText:
      "Rock Rhino earns its keep. It's a daily driver, a family hauler, and a special-needs transporter that puts on 25,000 miles a year — and it's only in the early innings. The plan isn't another trailer-queen trail rig; it's to build something a little different and keep it livable as a daily for as long as possible. First move is 38s on a low-center-of-gravity lift. The endgame is 40s, more lift, and portal axles — a high-clearance monster that still does the school run.",
    aboutStats: [
      { label: "Daily Miles", value: "25,000 / year", icon: "clock" },
      { label: "Primary Use", value: "Daily Driver & Special-Needs Transport", icon: "vehicle" },
      { label: "Primary Terrain", value: "Street, headed for the trail", icon: "compass" },
      { label: "Build Goal", value: "Daily-driven high-clearance monster on portals and 40s", icon: "bolt" },
    ],
    gallery: [
      { src: "/img/builds/rock-rhino.jpg", alt: "Rock Rhino on a residential street with the doors off" },
      { src: "/img/builds/rock-rhino-gallery-2.jpg", alt: "Rock Rhino on a gravel staging lot with an American flag whip" },
      { src: "/img/builds/rock-rhino-gallery-3.jpg", alt: "Rock Rhino, muddy side profile at a fuel stop" },
      { src: "/img/builds/rock-rhino-hero.jpg", alt: "Rock Rhino throwing mud through a trail puddle" },
    ],
  },
  {
    slug: "stoned",
    nameLines: ["Stoned"],
    vehicle: "2025 Jeep Wrangler Rubicon Extreme Recon",
    lead: "Stock and fun as can be — a Rubicon Extreme Recon on 35s that still handles the daily without complaint.",
    kicker: "Anthony's Daily Driver Build",
    category: "daily-driven",
    stats: [
      { value: "285 HP", unit: "3.6L Pentastar V6", icon: "bolt" },
      { value: "35\"", unit: "BFGoodrich KO2", icon: "compass" },
      { value: "1\"", unit: "Mopar Lift", icon: "lift" },
    ],
    listingImage: { src: "/img/builds/stoned-a.jpg", alt: "Stoned, Anthony's 2025 Jeep Wrangler Rubicon Extreme Recon in a rock cut" },
    heroImage: { src: "/img/builds/stoned-wide.jpg", alt: "Stoned, a 2025 Jeep Wrangler Rubicon Extreme Recon on a rocky trail through fall foliage" },
    listingSpecs: [
      { label: "Engine", value: "3.6L Pentastar V6" },
      { label: "Suspension", value: "Mopar 1\" Factory Lift" },
      { label: "Tires", value: "35\" BFGoodrich All-Terrain KO2" },
      { label: "Armor", value: "MetalCloak Skid Plates" },
    ],
    specs: [
      { label: "Base Vehicle", value: "2025 Jeep Wrangler Rubicon Extreme Recon", icon: "vehicle" },
      { label: "Engine", value: "3.6L Pentastar V6 (285 HP) — stock", icon: "bolt" },
      { label: "Suspension / Lift", value: "Mopar 1\" Factory Lift", icon: "lift" },
      { label: "Wheels & Tires", value: "Factory Extreme Recon wheels, 35\" BFGoodrich All-Terrain KO2", icon: "compass" },
      { label: "Armor", value: "MetalCloak Front & Rear Skid Plates", icon: "cross" },
    ],
    aboutText:
      "Stoned started where a lot of good builds start: barely touched. It's a Rubicon Extreme Recon, so it rolls off the lot on 35s with factory lockers and armor — the early moves are small, a Mopar 1-inch lift and MetalCloak skids underneath. The plan is a mild build that does a little of everything on 37s without ever becoming a chore to daily. No rock-buggy dreams here. Just a clean, capable Jeep that actually gets driven.",
    aboutStats: [
      { label: "Primary Terrain", value: "Street & Light Trail", icon: "compass" },
      { label: "Build Goal", value: "Daily-drivable, trail-capable — 37s down the road", icon: "bolt" },
    ],
    gallery: [
      { src: "/img/builds/stoned-a.jpg", alt: "Stoned front three-quarter in a rock cut" },
      { src: "/img/builds/stoned-b.jpg", alt: "Stoned on the trail" },
      { src: "/img/builds/stoned-portrait.jpg", alt: "Stoned, vertical trail shot" },
      { src: "/img/builds/stoned-wide.jpg", alt: "Stoned climbing a rocky trail through fall foliage" },
    ],
  },
  {
    slug: "iron-bandit",
    nameLines: ["Iron", "Bandit"],
    vehicle: "Jeep Wrangler JK (2-Door)",
    lead: "Built to conquer the trails and daily drive. Iron Bandit doesn't get a garage day off — trail rig on the weekend, daily the rest of the week.",
    kicker: "Dan's Daily-Driven Build",
    category: "daily-driven",
    stats: [
      { value: "285 HP", unit: "3.6L Pentastar V6", icon: "bolt" },
      { value: "37\"", unit: "Nitto Tires", icon: "compass" },
      { value: "3.5\"", unit: "MetalCloak Lift", icon: "lift" },
    ],
    listingImage: { src: "/img/builds/iron-bandit.jpg", alt: "Iron Bandit, Dan's Jeep Wrangler JK" },
    heroImage: { src: "/img/builds/iron-bandit.jpg", alt: "Iron Bandit, a Jeep Wrangler JK on the trail" },
    listingSpecs: [
      { label: "Engine", value: "3.6L Pentastar V6" },
      { label: "Suspension", value: "MetalCloak 3.5\" Game Changer" },
      { label: "Tires", value: "37\" Nitto" },
    ],
    specs: [
      { label: "Base Vehicle", value: "Jeep Wrangler JK (2-Door)", icon: "vehicle" },
      { label: "Engine", value: "3.6L Pentastar V6 (285 HP)", icon: "bolt" },
      { label: "Suspension", value: "MetalCloak 3.5\" Game Changer", icon: "lift" },
      { label: "Tires", value: "37\" Nitto", icon: "compass" },
    ],
    aboutText:
      "Iron Bandit is Dan's two-door JK, built to do both jobs at once — trail rig on the weekends, daily driver the rest of the week. A MetalCloak 3.5\" Game Changer lift and 37-inch Nittos give it the clearance to handle the trails, and the 3.6L Pentastar underneath doesn't complain about the commute either. Built to conquer the trails and drive daily.",
    aboutStats: [
      { label: "Primary Use", value: "Trails & Daily Driving", icon: "cross" },
      { label: "Build Goal", value: "Daily-Driven Trail Capability", icon: "bolt" },
    ],
  },
  {
    slug: "shockwave",
    nameLines: ["Shockwave"],
    vehicle: "2022 Jeep Wrangler Rubicon 4xe",
    lead: "Powerful, aggressive, and built to make an impact. Shockwave brings the energy wherever it rolls.",
    kicker: "Jack's Trail / Performance Build",
    category: "performance",
    stats: [
      { value: "375 HP", unit: "2.0L Turbo I4 PHEV", icon: "bolt" },
      { value: "37\"", unit: "Tires", icon: "compass" },
      { value: "3\"", unit: "Lift", icon: "lift" },
    ],
    listingImage: { src: "/img/builds/shockwave-hero.jpg", alt: "Shockwave, Jack's 2022 Jeep Wrangler Rubicon 4xe" },
    heroImage: { src: "/img/builds/shockwave-hero.jpg", alt: "Shockwave, a 2022 Jeep Wrangler Rubicon 4xe, on a dirt trail" },
    listingSpecs: [
      { label: "Engine", value: "2.0L Turbo I4 PHEV" },
      { label: "Axles", value: "Dana 44 Front & Rear" },
      { label: "Suspension", value: "AEV 2.5–3\" DualSport RT" },
      { label: "Tires", value: "37\" BFGoodrich A/T KO2" },
    ],
    specs: [
      { label: "Base Vehicle", value: "2022 Jeep Wrangler Rubicon 4xe", icon: "vehicle" },
      { label: "Engine", value: "2.0L Turbo I4 PHEV (375 HP Combined / 470 lb-ft)", icon: "bolt" },
      { label: "Intake", value: "aFe Magnum Force Cold Air Intake", icon: "wrench" },
      { label: "Suspension", value: "AEV 2.5–3\" DualSport RT Lift Kit", icon: "lift" },
      { label: "Steering", value: "SteerSmarts Yeti XD Adjustable Track Bars, Rough Country N3 Dual Stabilizer", icon: "wrench" },
      { label: "Tires", value: "37x12.50R17 BFGoodrich A/T KO2", icon: "compass" },
      { label: "Wheels", value: "RockTrix RT110 – 17x9", icon: "compass" },
      { label: "Skid Plates", value: "Rough Country M210 Front & M220 Rear Diff", icon: "cross" },
      { label: "Winch", value: "Openroad 12K Synthetic Rope, Carbon Offroad Megapro Hook", icon: "bolt" },
      { label: "Lighting", value: "Rough Country Quad LED Pods, AuxBeam 4\" Fog Lights, Sequential Brake Light", icon: "headlight" },
      { label: "Front Bumper", value: "Low-Style Bull Bar", icon: "cross" },
      { label: "Roof Rack", value: "Nilight Roof Crossbars", icon: "cross" },
      { label: "Performance", value: "TurboSmart Dual Port VR3 Blow Off Valve", icon: "wrench" },
      { label: "Exterior", value: "Red Color-Matched Hardtop, XR Style Fender Flares", icon: "cross" },
      { label: "Utility", value: "Nilight 2\" Hitch Receiver, Retractable Cargo Cover", icon: "vehicle" },
    ],
    aboutText:
      "Shockwave makes the case that a plug-in hybrid can still be a real trail rig. The 4xe drivetrain puts down 375 combined horsepower and instant torque off idle — genuinely useful when you're picking a line through rocks. On top of that: an AEV 2.5–3-inch DualSport lift, 37s, SteerSmarts and Rough Country hardware to settle the steering back down, a 12K winch, front and rear skids, and enough lighting to turn night into day. Built to wheel hard and still commute Monday.",
    aboutStats: [
      { label: "Primary Terrain", value: "Trail & Overland", icon: "cross" },
      { label: "Build Goal", value: "Trail Capability & Everyday Versatility", icon: "bolt" },
    ],
    gallery: [
      { src: "/img/builds/shockwave-gallery-1.jpg", alt: "Shockwave front three-quarter view" },
      { src: "/img/builds/shockwave-gallery-2.jpg", alt: "Shockwave rear three-quarter view with spare tire" },
      { src: "/img/builds/shockwave-gallery-3.jpg", alt: "Shockwave interior with doors off" },
      { src: "/img/builds/shockwave-gallery-4.jpg", alt: "Shockwave at sunset with lights on" },
    ],
  },
];

// Pure lookups over a caller-supplied list, so pages can pass the static
// team builds alone or merged with approved community builds (see
// lib/communityBuilds.ts) without this module needing to know about
// Airtable at all.
export function findBuildBySlug(list: Build[], slug: string): Build | undefined {
  return list.find((b) => b.slug === slug);
}

export function findAdjacentBuilds(list: Build[], slug: string): { prev: Build; next: Build } {
  const index = list.findIndex((b) => b.slug === slug);
  const prev = list[(index - 1 + list.length) % list.length];
  const next = list[(index + 1) % list.length];
  return { prev, next };
}
