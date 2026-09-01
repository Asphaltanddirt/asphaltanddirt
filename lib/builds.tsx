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

// Cyclical order matches the original site's prev/next links: Rhino Rock ->
// TBD -> Iron Bandit -> Shockwave -> (back to Rhino Rock).
export const builds: Build[] = [
  {
    slug: "rhino-rock",
    nameLines: ["Rhino", "Rock"],
    vehicle: "2021 Jeep Wrangler Rubicon",
    lead: "Built to take a beating and keep moving forward. Rhino Rock is all about strength, traction, and unstoppable capability.",
    kicker: "Jose's Trail / Daily Driver Build",
    category: "daily-driven",
    stats: [
      { value: "470 HP", unit: "6.4L HEMI V8", icon: "bolt" },
      { value: "37\"", unit: "Tires", icon: "compass" },
      { value: "4.5\"", unit: "Lift", icon: "lift" },
    ],
    listingImage: { src: "/img/builds/rock-rhino.jpg", alt: "Rock Rhino, Jose's 2021 Jeep Wrangler Rubicon" },
    heroImage: { src: "/img/builds/rhino-hero.jpg", alt: "Rhino Rock, a 2021 Jeep Wrangler Rubicon on a rocky mountainside" },
    listingSpecs: [
      { label: "Engine", value: "6.4L HEMI V8" },
      { label: "Axles", value: "Dana 44 Front & Rear" },
      { label: "Suspension", value: "Rock Krawler 3.5\"" },
      { label: "Tires", value: "40\" Nitto Ridge Grappler" },
    ],
    specs: [
      { label: "Base Vehicle", value: "2021 Jeep Wrangler Rubicon JL", icon: "vehicle" },
      { label: "Engine", value: "6.4L HEMI V8 (470 HP / 470 lb-ft)", icon: "bolt" },
      { label: "Transmission", value: "8-Speed Automatic", icon: "wrench" },
      { label: "Axles", value: "Dana 44 Front & Rear", icon: "cross" },
      { label: "Gear Ratio", value: "4.88 Gears", icon: "compass" },
      { label: "Lift", value: "Rock Krawler 4.5\" Adventure System", icon: "lift" },
      { label: "Shocks", value: "Fox 2.5 Factory Series Reservoir", icon: "lift" },
      { label: "Tires", value: "37x12.50R17 Nitto Ridge Grappler", icon: "compass" },
      { label: "Wheels", value: "Method Race Wheels 701 – 17x9, -12mm", icon: "compass" },
      { label: "Armor", value: "Rock Slide Engineering Sliders & Front Bumper", icon: "cross" },
      { label: "Winch", value: "Warn VR EVO 10-S", icon: "bolt" },
      { label: "Lighting", value: "KC HiLiTES Gravity PRO6, Baja Designs Squadron S2", icon: "headlight" },
      { label: "Roof Rack", value: "Front Runner Slimline II", icon: "cross" },
      { label: "Accessories", value: "RotoPax, Hi-Lift Jack, CB Radio, Fire Extinguisher", icon: "wrench" },
      { label: "Interior", value: "Corbeau Seats, Rugged Radios, WeatherTech Floor Liners", icon: "vehicle" },
      { label: "Exhaust", value: "Borla Cat-Back Exhaust", icon: "bolt" },
      { label: "Exterior", value: "Rhino Rock Custom Graphic Wrap", icon: "cross" },
    ],
    aboutText: "Rhino Rock was built to dominate rocky terrain and long-distance trails. With a stout HEMI V8, 4.5\" of Rock Krawler suspension, and 37\" tires, this rig is ready for anything the trail throws at it.",
    aboutStats: [
      { label: "Build Time", value: "8 Months", icon: "clock" },
      { label: "Miles Built", value: "3,200+", icon: "mountain" },
      { label: "Primary Terrain", value: "Rocks, Trails, Overland", icon: "cross" },
      { label: "Build Goal", value: "Durability, Performance, All-Terrain Capability", icon: "bolt" },
    ],
    gallery: [
      { src: "/img/builds/rhino-gallery-1.jpg", alt: "Rhino Rock rear three-quarter view" },
      { src: "/img/builds/rhino-gallery-2.jpg", alt: "Rhino Rock interior" },
      { src: "/img/builds/rhino-gallery-3.jpg", alt: "Rhino Rock front suspension detail" },
      { src: "/img/builds/rhino-gallery-4.jpg", alt: "Rhino Rock rear axle detail" },
    ],
  },
  {
    slug: "tbd",
    nameLines: ["TBD"],
    badge: "In Progress",
    vehicle: "2024 Jeep Wrangler Rubicon 392",
    lead: "The build is in motion and the mission is set. Stay tuned—this rig is coming together with purpose.",
    kicker: "Anthony's In Progress Build",
    category: "overland",
    stats: [
      { value: "470 HP", unit: "6.4L HEMI V8", icon: "bolt" },
      { value: "TBD", unit: "Tires", icon: "compass" },
      { value: "TBD", unit: "Lift", icon: "lift" },
    ],
    listingImage: { src: "/img/builds/tbd-covered.jpg", alt: "Anthony's covered in-progress build" },
    heroImage: { src: "/img/builds/tbd-covered.jpg", alt: "Anthony's covered in-progress build, a 2024 Jeep Wrangler Rubicon 392" },
    listingSpecs: [
      { label: "Engine", value: "6.4L HEMI V8" },
      { label: "Axles", value: "Dana 60 Front & Rear" },
      { label: "Suspension", value: "TBD" },
      { label: "Tires", value: "TBD" },
    ],
    specs: [
      { label: "Base Vehicle", value: "2024 Jeep Wrangler Rubicon 392", icon: "vehicle" },
      { label: "Engine", value: "6.4L HEMI V8", icon: "bolt" },
      { label: "Axles", value: "Dana 60 Front & Rear", icon: "cross" },
      { label: "Suspension", value: "TBD", icon: "lift" },
      { label: "Tires", value: "TBD", icon: "compass" },
    ],
    aboutText: "Anthony's next rig is a 2024 Jeep Wrangler Rubicon 392, currently under wraps while the build comes together. The mission is set—follow along on the podcast and socials as the details get locked in and the cover comes off.",
    aboutStats: [],
  },
  {
    slug: "iron-bandit",
    nameLines: ["Iron", "Bandit"],
    vehicle: "2019 Jeep Wrangler JLU",
    lead: "A proven trail weapon. Iron Bandit is built for the wild, tested on the rocks, and trusted when it counts.",
    kicker: "Dan's Trail Build",
    category: "trail-built",
    stats: [
      { value: "285 HP", unit: "3.6L Pentastar V6", icon: "bolt" },
      { value: "37\"", unit: "Tires", icon: "compass" },
      { value: "4.5\"", unit: "Lift", icon: "lift" },
    ],
    listingImage: { src: "/img/builds/iron-bandit.jpg", alt: "Iron Bandit, Dan's 2019 Jeep Wrangler JLU" },
    heroImage: { src: "/img/builds/iron-bandit.jpg", alt: "Iron Bandit, a 2019 Jeep Wrangler JLU on the trail" },
    listingSpecs: [
      { label: "Engine", value: "3.6L Pentastar V6" },
      { label: "Axles", value: "Dana 44 Front & Rear" },
      { label: "Suspension", value: "Rock Krawler 4.5\"" },
      { label: "Tires", value: "37\" Mickey Thompson MTZ" },
    ],
    specs: [
      { label: "Base Vehicle", value: "2019 Jeep Wrangler JLU", icon: "vehicle" },
      { label: "Engine", value: "3.6L Pentastar V6 (285 HP)", icon: "bolt" },
      { label: "Axles", value: "Dana 44 Front & Rear", icon: "cross" },
      { label: "Suspension", value: "Rock Krawler 4.5\"", icon: "lift" },
      { label: "Tires", value: "37\" Mickey Thompson MTZ", icon: "compass" },
    ],
    aboutText: "Iron Bandit represents the trail-first side of Asphalt & Dirt—a rig built for the wild, tested on the rocks, and trusted when it counts.",
    aboutStats: [
      { label: "Primary Terrain", value: "Rocks & Trails", icon: "cross" },
      { label: "Build Goal", value: "Durability & Trail Capability", icon: "bolt" },
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
    aboutText: "Shockwave is Jack's 2022 Wrangler Rubicon 4xe—built to blend hybrid performance with serious trail capability. Between the AEV suspension, 37\" BFGoodrich tires, and a full winch, skid plate, and lighting setup, this rig brings the energy wherever it rolls.",
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
