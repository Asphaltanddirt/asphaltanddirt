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
    tagline: "Gearhead, racer, and off-road explorer.",
    bio: "Jose helps shape the voice of Asphalt & Dirt with a mix of street performance, trail culture, and real-world community connection. He brings the perspective of someone who lives the build, the ride, and the stories behind both.",
    experience: "Street builds • Off-road rides",
    experienceLine2: "Community leadership",
    drives: "Rhino Rock",
    buildSlug: "rhino-rock",
  },
  {
    slug: "anthony",
    name: "Anthony",
    photo: "/img/team/anthony.jpg",
    role: "Host",
    tagline: "Builder, storyteller, and weekend adventurer.",
    bio: "Anthony brings a builder's eye and a storyteller's mindset, helping turn the culture into content that feels real, useful, and entertaining. He connects the technical side of the hobby with the community side.",
    experience: "Build culture • Event coverage",
    experienceLine2: "Weekend wheeling",
    drives: "TBD",
    buildSlug: "tbd",
  },
];

export const TRAIL_AMBASSADORS: TeamMember[] = [
  {
    slug: "dan",
    name: "Dan",
    photo: "/img/team/dan.jpg",
    role: "Trail Ambassadors",
    tagline: "Trail guide, gear tester, and off-road advocate.",
    bio: "Dan represents the trail-first side of Asphalt & Dirt, bringing practical trail knowledge, honest gear feedback, and a deep appreciation for getting rigs dirty. He helps connect the brand to the off-road community in a grounded, authentic way.",
    experience: "Trail guidance • Gear testing",
    experienceLine2: "Off-road community",
    drives: "Iron Bandit",
    buildSlug: "iron-bandit",
  },
  {
    slug: "jack",
    name: "Jack",
    photo: "/img/team/jack.jpg",
    role: "Trail Ambassadors",
    tagline: "Explorer, content creator, and trail enthusiast.",
    bio: "Jack brings energy to the community through content, adventure, and a passion for documenting the experience. He helps turn rides, events, and moments on the trail into stories people want to be part of.",
    experience: "Content creation • Ride recaps",
    experienceLine2: "Community adventures",
    drives: "Shockwave",
    buildSlug: "shockwave",
  },
];

export function findTeamMemberBySlug(slug: string): TeamMember | undefined {
  return [...HOSTS, ...TRAIL_AMBASSADORS].find((m) => m.slug === slug);
}
