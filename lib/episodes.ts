export interface Guest {
  name: string;
  bio?: string;
  url?: string;
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
