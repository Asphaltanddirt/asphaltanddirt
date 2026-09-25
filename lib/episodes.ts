import { listRecords, isAirtableConfigured, type AirtableRecord } from "@/lib/airtable";

export interface GuestSocialLink {
  /** Free-text platform label ("Instagram", "TikTok", "Website", ...) —
   *  matches the Guest Intake form's shape 1:1, so a submission can be
   *  copied straight into an episode's data. See lib/socialIcons.tsx for
   *  how labels map to an icon. */
  platform: string;
  url: string;
}

export interface Guest {
  name: string;
  bio?: string;
  photo?: string;
  socialLinks?: GuestSocialLink[];
}

export interface Sponsor {
  name: string;
  url?: string;
  disclosure?: string;
}

export interface Episode {
  slug: string;
  title: string;
  publicationDate: string; // ISO 8601
  description: string;
  showNotes?: string;
  guests?: Guest[];
  /** Absent until a real episode is recorded/published on Riverside. */
  riversideEmbedUrl?: string;
  /** Buzzsprout's numeric episode ID (from the "small" player embed code in
   *  the Buzzsprout dashboard's Embed Player tab). This is the actual audio
   *  player source — takes priority over riversideEmbedUrl once set. */
  buzzsproutEpisodeId?: string;
  youtubeVideoId?: string;
  youtubePlaylistUrl?: string;
  spotifyUrl?: string;
  appleUrl?: string;
  amazonMusicUrl?: string;
  youtubeMusicUrl?: string;
  type: "podcast" | "trail-event";
  sponsors?: Sponsor[];
  affiliateDisclosure?: string;
  relatedSlugs?: string[];
  /** Cleaned transcript exported from Riverside (see the Podcast Transcript
   *  runbook prompt for the full process). Plain text, paragraphs separated
   *  by a blank line. Two light conventions the renderer understands:
   *    - A line starting with "## " becomes a segment heading.
   *    - A paragraph starting with "Name: " bolds the speaker's name.
   *  Rendered as the "Transcript" tab of DescriptionTranscriptPanel on the
   *  episode page — both tabs stay in the page's HTML (good for SEO/GEO)
   *  regardless of which one is active. */
  transcript?: string;
  eventRegistrationUrl?: string;
  artwork: { src: string; alt: string };
}

export const episodes: Episode[] = [
  {
    slug: "asphalt-and-dirt-official-trailer",
    title: "ASPHALT & DIRT Podcast — Official Trailer | Where Horsepower Meets Mud",
    publicationDate: "2026-07-07T01:07:11Z",
    description:
      "Two worlds. One podcast. ASPHALT & DIRT is the live video podcast built for people who love cars in every form — street builds, off-road rigs, overlanding setups, and everything in between.",
    showNotes:
      "Whether you're chasing horsepower on the asphalt or chasing trails through the mud, this is the show where both sides of car culture finally share the mic. We're bringing you real conversations, real builds, and real stories from the people living this lifestyle — no gatekeeping, no snobbery, just gearheads talking to gearheads.\n\nWhat to expect from ASPHALT & DIRT:\n- In-depth build breakdowns — street, off-road, and everything between\n- Overlanding rigs, trail talk, and adventure-ready setups\n- Guest interviews with builders, drivers, and creators from across the automotive world\n- Live multistreamed episodes across YouTube, TikTok, Instagram, Facebook, and X\n- Full episodes available on Spotify, Apple Podcasts, and everywhere you listen\n\nThis trailer is just a taste of what's coming. New episodes drop soon.",
    youtubeVideoId: "jXeOj8KDVJU",
    youtubePlaylistUrl: "https://www.youtube.com/playlist?list=PLfeeUT85XiEE",
    type: "podcast",
    artwork: {
      src: "https://i.ytimg.com/vi/jXeOj8KDVJU/maxresdefault.jpg",
      alt: "ASPHALT & DIRT Podcast — Official Trailer artwork",
    },
    // spotifyUrl / appleUrl / amazonMusicUrl / youtubeMusicUrl / riversideEmbedUrl:
    // intentionally left unset — the show hasn't launched on these yet. The page
    // renders honest "Coming Soon" states rather than dead links.
  },
  // Trail & Event Videos — baseline pages for the "Long-form video" uploads
  // that previously only lived on YouTube (linked externally from the
  // podcast index). Description/showNotes are trimmed from the real YouTube
  // descriptions, not written fresh — see each video for the original.
  {
    slug: "ram-power-wagons-rebel-rainy-aoaa-trails",
    title: "Ram Power Wagons & Rebel on Rainy AOAA Trails",
    publicationDate: "2026-04-06T13:07:54Z",
    description:
      "Rain, fog, and tight turns at AOAA — ride along with a group of full-size trucks, mostly Ram Power Wagons and a Rebel, working through wet, rocky woodland trails.",
    showNotes:
      "This is a look back at a gloomy trail day from the dashboard: trucks ahead, trees close by, and a spotter helping with the line. If you enjoy full-size rigs out in the woods, this one's for you.\n\nWhat's the trickiest part of wheeling a full-size truck for you: width, wheelbase, or seeing the line?",
    youtubeVideoId: "RLITfmzwWzw",
    youtubePlaylistUrl: "https://www.youtube.com/playlist?list=PLKEZJPl1lIfxCiLkpYnw226zEulWj8Su5",
    type: "trail-event",
    relatedSlugs: ["ram-1500-hemi-off-road-nj-pine-barrens"],
    artwork: {
      src: "https://i.ytimg.com/vi/RLITfmzwWzw/maxresdefault.jpg",
      alt: "Ram Power Wagons and a Rebel on a rainy trail at AOAA",
    },
  },
  {
    slug: "built-vw-touaregs-jeep-wrangler-xr-hit-the-trails",
    title: "Built VW Touaregs & Jeep Wrangler XR Hit the Trails",
    publicationDate: "2026-03-31T11:23:36Z",
    description:
      "Two heavily built VW Touaregs join our new 2026 Jeep Wrangler JL Extreme Recon for its first trail ride, with a Tundra, a Tacoma, and three other Jeeps rounding out the group at Famous Reading Outdoors.",
    showNotes:
      "This video captures a slice of that mixed-rig trail day, including a close view along the Jeep's side as we work through the rocky track. Different builds, one shared reason to get outside and put them to use.\n\nWhich rig would you want a closer look at: the Touaregs, the Wrangler XR, or one of the Toyotas?",
    youtubeVideoId: "1T22EgNrYak",
    youtubePlaylistUrl: "https://www.youtube.com/playlist?list=PLKEZJPl1lIfxCiLkpYnw226zEulWj8Su5",
    type: "trail-event",
    relatedSlugs: ["jeep-wrangler-extreme-recon-nj-jeep-invasion-2026"],
    artwork: {
      src: "https://i.ytimg.com/vi/1T22EgNrYak/maxresdefault.jpg",
      alt: "Built VW Touaregs and a Jeep Wrangler JL Extreme Recon on the trail",
    },
  },
  {
    slug: "jeep-wrangler-extreme-recon-nj-jeep-invasion-2026",
    title: "Jeep Wrangler Extreme Recon Takes on NJ Jeep Invasion 2026",
    publicationDate: "2026-07-11T20:23:57Z",
    description:
      "Our Jeep Wrangler JL Extreme Recon hits the beach obstacle course at NJ Jeep Invasion 2026 in Wildwood, New Jersey — a second run of the weekend, with my son in the passenger seat for his first beach off-road adventure.",
    showNotes:
      "Sand climbs, a line of Jeeps, and plenty of encouragement from the driver's seat. This one is about sharing the ride and spending time together doing something we love.\n\nWhat was your favorite obstacle at Jeep Invasion? If you haven't been, would you bring your rig?",
    youtubeVideoId: "foFG1DRwx2Y",
    youtubePlaylistUrl: "https://www.youtube.com/playlist?list=PLKEZJPl1lIfxCiLkpYnw226zEulWj8Su5",
    type: "trail-event",
    relatedSlugs: ["built-vw-touaregs-jeep-wrangler-xr-hit-the-trails"],
    artwork: {
      src: "https://i.ytimg.com/vi/foFG1DRwx2Y/maxresdefault.jpg",
      alt: "Jeep Wrangler Extreme Recon on the beach obstacle course at NJ Jeep Invasion 2026",
    },
  },
  {
    slug: "jeep-rubicon-trail-run-pov-rocks-ruts-dirt",
    title: "Jeep Rubicon Trail Run POV | Rocks, Ruts & Dirt",
    publicationDate: "2026-04-21T17:11:42Z",
    description:
      "Take the passenger seat for a Jeep Rubicon trail run — this off-road POV puts you on the rocky tracks and dirt sections with the group, showing the route from the rig's perspective.",
    showNotes:
      "If watching a trail unfold through the windshield is your kind of downtime, settle in and ride with us. Tell us which section caught your eye — and add a timestamp so we can find it.",
    youtubeVideoId: "acsgbKQXrK4",
    youtubePlaylistUrl: "https://www.youtube.com/playlist?list=PLKEZJPl1lIfxCiLkpYnw226zEulWj8Su5",
    type: "trail-event",
    relatedSlugs: ["built-vw-touaregs-jeep-wrangler-xr-hit-the-trails"],
    artwork: {
      src: "https://i.ytimg.com/vi/acsgbKQXrK4/maxresdefault.jpg",
      alt: "Jeep Rubicon trail run, POV from the passenger seat over rocks and ruts",
    },
  },
  {
    slug: "pine-barrens-off-road-pov-with-high-speed-dan",
    title: "Pine Barrens Off-Road POV with High Speed Dan",
    publicationDate: "2026-06-19T12:12:27Z",
    description:
      "Ride along with High Speed Dan through the Pine Barrens — a dashboard-view trail run from open sandy stretches into wooded tracks, with the hood and the trail right in front of you.",
    showNotes:
      "This is the view from the rig: loose ground, changing trail surfaces, and a day out in the Pines with Asphalt & Dirt. Grab the passenger seat and tell us which section you'd want to drive.",
    youtubeVideoId: "rXhrzDlHmsE",
    youtubePlaylistUrl: "https://www.youtube.com/playlist?list=PLKEZJPl1lIfxCiLkpYnw226zEulWj8Su5",
    type: "trail-event",
    relatedSlugs: ["ram-1500-hemi-off-road-nj-pine-barrens"],
    artwork: {
      src: "https://i.ytimg.com/vi/rXhrzDlHmsE/maxresdefault.jpg",
      alt: "Dashboard POV of a Pine Barrens off-road trail run with High Speed Dan",
    },
  },
  {
    slug: "ram-1500-hemi-off-road-nj-pine-barrens",
    title: "Ram 1500 5.7 Hemi Off-Road in the NJ Pine Barrens",
    publicationDate: "2026-04-10T11:47:29Z",
    description:
      "We're taking the Ram 1500 5.7 Hemi into New Jersey's Pine Barrens for a trail ride — through the sandy tracks and wooded stretches with the group.",
    showNotes:
      "Big truck, a day in the Pines, and plenty of dirt ahead. If you're a Ram owner — or just like seeing full-size rigs out on the trails — pull up a seat and join the ride.\n\nWhat would you want to know about this truck's setup? Drop your questions below so we can cover the details in a future walkaround.",
    youtubeVideoId: "Ugyr2tXLnFw",
    youtubePlaylistUrl: "https://www.youtube.com/playlist?list=PLKEZJPl1lIfxCiLkpYnw226zEulWj8Su5",
    type: "trail-event",
    relatedSlugs: ["ram-power-wagons-rebel-rainy-aoaa-trails", "pine-barrens-off-road-pov-with-high-speed-dan"],
    artwork: {
      src: "https://i.ytimg.com/vi/Ugyr2tXLnFw/maxresdefault.jpg",
      alt: "Ram 1500 5.7 Hemi on a trail in the New Jersey Pine Barrens",
    },
  },
];

export function getEpisodeBySlug(slug: string): Episode | undefined {
  return episodes.find((e) => e.slug === slug);
}

/** Looks up an internal episode page by its YouTube video ID, so listing
 *  pages can link in-site when a full episode page exists, and out to
 *  YouTube directly when it doesn't (yet). */
export function getEpisodeByYoutubeId(videoId: string): Episode | undefined {
  return episodes.find((e) => e.youtubeVideoId === videoId);
}

export function getRelatedEpisodes(episode: Episode): Episode[] {
  if (!episode.relatedSlugs?.length) return [];
  return episode.relatedSlugs
    .map((slug) => getEpisodeBySlug(slug))
    .filter((e): e is Episode => Boolean(e));
}

// ---------------------------------------------------------------------------
// Airtable episodes (punchlist #1, 2026-09-25)
//
// New episodes are added in Airtable (Podcast Production → Episodes, Status =
// Published) and appear on the site within 5 minutes, no deploy. The list
// above stays as the built-in set; an Airtable row with the same slug wins,
// so an old page can be taken over and edited in Airtable too.
// ---------------------------------------------------------------------------

const PODCAST_BASE = process.env.AIRTABLE_PODCAST_PRODUCTION_BASE_ID;
const REVALIDATE = 300;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const links = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);

/** "https://www.buzzsprout.com/123/456789-title" → "456789" (the player id). */
function buzzsproutId(url: string): string | undefined {
  return [...url.matchAll(/\/(\d{5,})(?=[-/?.]|$)/g)].pop()?.[1] || undefined;
}

function socials(text: string): GuestSocialLink[] {
  return text
    .split("\n")
    .map((l) => l.match(/^\s*([^:]+):\s*(https?:\/\/\S+)/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => ({ platform: m[1].trim(), url: m[2] }));
}

async function airtableEpisodes(): Promise<Episode[]> {
  if (!PODCAST_BASE || !isAirtableConfigured(PODCAST_BASE)) return [];
  const rows = await listRecords("Episodes", "{Status} = 'Published'", { baseId: PODCAST_BASE, revalidate: REVALIDATE });
  if (!rows.length) return [];
  const needGuests = rows.some((r) => links(r.fields.Guests).length);
  const needSponsors = rows.some((r) => links(r.fields.Sponsors).length);
  const [guestRows, sponsorRows] = await Promise.all([
    needGuests ? listRecords("Guests", undefined, { baseId: PODCAST_BASE, revalidate: REVALIDATE }) : Promise.resolve([] as AirtableRecord[]),
    needSponsors ? listRecords("Sponsors", undefined, { baseId: PODCAST_BASE, revalidate: REVALIDATE }) : Promise.resolve([] as AirtableRecord[]),
  ]);
  const guests = new Map<string, Guest>(
    guestRows.map((g) => [
      g.id,
      {
        name: str(g.fields["Guest Name"]),
        bio: str(g.fields["Public Bio"]) || undefined,
        photo: (g.fields.Photo as { url: string }[] | undefined)?.[0]?.url,
        socialLinks: socials(str(g.fields["Social Links"])),
      },
    ]),
  );
  const sponsors = new Map<string, Sponsor>(
    sponsorRows.map((s) => [
      s.id,
      {
        name: str(s.fields["Sponsor Name"]),
        url: str(s.fields["Website URL"]) || undefined,
        disclosure: str(s.fields["Public Disclosure Text"]) || undefined,
      },
    ]),
  );
  const slugById = new Map(rows.map((r) => [r.id, str(r.fields.Slug)]));

  return rows
    .filter((r) => str(r.fields.Slug) && str(r.fields.Title))
    .map((r): Episode => {
      const f = r.fields;
      const yt = str(f["YouTube Video ID"]);
      const art = (f.Artwork as { url: string }[] | undefined)?.[0]?.url;
      const title = str(f.Title);
      return {
        slug: str(f.Slug),
        title,
        publicationDate: str(f["Publication Date"]) || new Date().toISOString().slice(0, 10),
        description: str(f.Description),
        showNotes: str(f["Show Notes"]) || undefined,
        transcript: str(f.Transcript) || undefined,
        youtubeVideoId: yt || undefined,
        youtubePlaylistUrl: str(f["YouTube Playlist URL"]) || undefined,
        buzzsproutEpisodeId: buzzsproutId(str(f["Buzzsprout Embed URL"])),
        spotifyUrl: str(f["Spotify URL"]) || undefined,
        appleUrl: str(f["Apple Podcasts URL"]) || undefined,
        amazonMusicUrl: str(f["Amazon Music URL"]) || undefined,
        youtubeMusicUrl: str(f["YouTube Music URL"]) || undefined,
        eventRegistrationUrl: str(f["Event Registration URL"]) || undefined,
        affiliateDisclosure: str(f["Affiliate Disclosure"]) || undefined,
        type: str(f.Type) === "Trail Event" ? "trail-event" : "podcast",
        guests: links(f.Guests).map((id) => guests.get(id)).filter((g): g is Guest => Boolean(g?.name)),
        sponsors: links(f.Sponsors).map((id) => sponsors.get(id)).filter((x): x is Sponsor => Boolean(x?.name)),
        relatedSlugs: links(f["Related Episodes"]).map((id) => slugById.get(id) || "").filter(Boolean),
        artwork: {
          src: art || (yt ? `https://i.ytimg.com/vi/${yt}/maxresdefault.jpg` : "/img/podcast/hero.jpg"),
          alt: `${title} artwork`,
        },
      };
    });
}

/** Every episode the site shows: Airtable's published ones (newest first),
 *  then the built-in list minus any slug Airtable took over. If Airtable is
 *  down, the built-in list still renders. */
export async function getAllEpisodes(): Promise<Episode[]> {
  const fromAirtable = await airtableEpisodes().catch((err) => {
    console.error("episodes: Airtable read failed, using the built-in list", err);
    return [] as Episode[];
  });
  const taken = new Set(fromAirtable.map((e) => e.slug));
  return [
    ...fromAirtable.sort((a, b) => b.publicationDate.localeCompare(a.publicationDate)),
    ...episodes.filter((e) => !taken.has(e.slug)),
  ];
}

export async function findEpisodeBySlug(slug: string): Promise<Episode | undefined> {
  return (await getAllEpisodes()).find((e) => e.slug === slug);
}

export async function findEpisodeByYoutubeId(videoId: string): Promise<Episode | undefined> {
  return (await getAllEpisodes()).find((e) => e.youtubeVideoId === videoId);
}

export async function findRelatedEpisodes(episode: Episode): Promise<Episode[]> {
  if (!episode.relatedSlugs?.length) return [];
  const all = await getAllEpisodes();
  return episode.relatedSlugs.map((slug) => all.find((e) => e.slug === slug)).filter((e): e is Episode => Boolean(e));
}

/** The newest real podcast episode (not a trail video), for "The Latest Episode". */
export async function getLatestPodcastEpisode(): Promise<Episode | undefined> {
  return (await getAllEpisodes())
    .filter((e) => e.type === "podcast")
    .sort((a, b) => b.publicationDate.localeCompare(a.publicationDate))[0];
}
