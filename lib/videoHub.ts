import { episodePath, getEpisodesOfType, seriesOf } from "@/lib/episodes";
import { publishedGarageTakes } from "@/lib/garageTakes";

/**
 * The Videos hub (/videos, Jose 2026-10-02): every trail & event video and
 * every Garage Take in one list, newest first. Each video keeps its own page
 * where it always was; the old lists (/events/videos, /garage-takes) now
 * redirect here with their filter on. Podcast episodes stay on /podcast.
 */

export type HubKind = "trail" | "takes";

export interface HubVideo {
  kind: HubKind;
  href: string;
  title: string;
  /** ISO date it went public on the site. */
  date: string;
  description: string;
  videoId: string;
  thumbnail: string;
  part?: number;
}

export const HUB_FILTERS: { key: HubKind | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "trail", label: "Trail & Events" },
  { key: "takes", label: "Garage Takes" },
];

export async function getHubVideos(): Promise<HubVideo[]> {
  const [trail, takes] = await Promise.all([getEpisodesOfType("trail-event"), Promise.resolve(publishedGarageTakes())]);
  const videos: HubVideo[] = [
    ...trail
      .filter((e) => e.youtubeVideoId)
      .map((e) => ({
        kind: "trail" as const,
        href: episodePath(e),
        title: e.title,
        date: e.publicationDate,
        description: e.description,
        videoId: e.youtubeVideoId as string,
        thumbnail: e.artwork.src,
        part: seriesOf(e)?.part,
      })),
    ...takes.map((t) => ({
      kind: "takes" as const,
      href: `/garage-takes/${t.slug}`,
      title: t.title,
      date: t.liveFrom,
      description: t.summary,
      videoId: t.videoId,
      thumbnail: `https://i.ytimg.com/vi/${t.videoId}/maxresdefault.jpg`,
    })),
  ];
  return videos.sort((a, b) => b.date.localeCompare(a.date));
}
