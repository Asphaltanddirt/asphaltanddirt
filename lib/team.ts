export interface TeamMember {
  slug: string;
  name: string;
  photo: string;
  role: string;
  tagline: string;
  bio: string;
  experience?: string;
  experienceLine2?: string;
  drives?: string;
  buildSlug?: string;
}

export const HOSTS: TeamMember[] = [
  {
    slug: "jose",
    name: "Jose",
    photo: "/img/team/jose.jpg",
    role: "Host",
    tagline: "Racer on pavement, explorer off it.",
    bio: "Jose runs point on the Asphalt & Dirt voice — street performance, trail culture, and the community that connects the two. His daily is Rock Rhino, a Rubicon that racks up 25,000 miles a year and is slowly becoming a portal-axle, 40-inch monster without ever losing its plates. He cares more about the story behind a build than the receipt for it.",
    experience: "Street builds • Off-road rides",
    experienceLine2: "Community leadership",
    drives: "Rock Rhino",
    buildSlug: "rock-rhino",
  },
  {
    slug: "anthony",
    name: "Anthony",
    photo: "/img/team/anthony.jpg",
    role: "Host",
    tagline: "Builder and storyteller. Wheels on the weekend.",
    bio: "Anthony ties the technical side of the hobby to the human side — turning builds, trips, and shop days into things worth watching and reading. He came up in the BMW race scene and still has deep roots there. He drives Stoned, a barely-broken-in Rubicon Extreme Recon he's building slow and mild on purpose, and runs the tow pig — a 2025 GMC Sierra 2500 Denali diesel with its own build page on the way.",
    experience: "BMW racing • Build culture",
    experienceLine2: "Weekend wheeling",
    drives: "Stoned",
    buildSlug: "stoned",
  },
];

export const TRAIL_AMBASSADORS: TeamMember[] = [
  {
    slug: "dan",
    name: "Dan",
    photo: "/img/team/dan.jpg",
    role: "Trail Ambassadors",
    tagline: "Trail-first. Gear-honest. Recovery specialist.",
    bio: "Dan covers the dirt side — real trail knowledge, straight talk on the gear that works and the gear that doesn't, and a genuine love of getting a rig filthy. He's the guy you want on the winch line when it all goes sideways. His Iron Bandit build is dialed for the technical stuff, whether that's crawling over rocks or hammering down the whoops.",
    experience: "Trail guidance • Recovery",
    experienceLine2: "Gear testing",
    drives: "Iron Bandit",
    buildSlug: "iron-bandit",
  },
  {
    slug: "jack",
    name: "Jack",
    photo: "/img/team/jack.jpg",
    role: "Trail Ambassadors",
    tagline: "Documents the ride, then goes and does another one.",
    bio: "Jack turns rides, events, and trail days into stories people want in on. He wheels Shockwave, a 4xe Rubicon that proves a hybrid can still come home with fresh scratches — and when he's off the trail, he's an avid kayaker, chasing water instead of dirt.",
    experience: "Content creation • Ride recaps",
    experienceLine2: "Trails & water",
    drives: "Shockwave",
    buildSlug: "shockwave",
  },
];

export function findTeamMemberBySlug(slug: string): TeamMember | undefined {
  return [...HOSTS, ...TRAIL_AMBASSADORS].find((m) => m.slug === slug);
}
