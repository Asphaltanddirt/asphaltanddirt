// Fetches the newest videos from a YouTube playlist, sorted by actual upload
// date (not playlist-add order). Ported from the static site's
// api/_lib/youtube.js — same filtering/sorting logic, adapted for Next.js
// Server Component data fetching with ISR caching.

const PLAYLIST_ITEMS_URL = "https://www.googleapis.com/youtube/v3/playlistItems";
const VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

/** Pulls the 11-char video id out of any common YouTube URL form (watch?v=,
 *  youtu.be/, /live/, /shorts/, /embed/), or returns a bare id unchanged. */
export function youtubeIdFromUrl(value: string): string {
  const v = value.trim();
  const m = v.match(/(?:v=|youtu\.be\/|\/live\/|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{11}$/.test(v) ? v : "";
}

export const PODCAST_EPISODES_PLAYLIST_ID = "PLfeeUT85XiEE";
export const TRAIL_EVENT_VIDEOS_PLAYLIST_ID = "PLKEZJPl1lIfxCiLkpYnw226zEulWj8Su5";

export type YouTubeVideo = {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  url: string;
};

type PlaylistItemsResponse = {
  items?: {
    snippet?: {
      title?: string;
      description?: string;
      publishedAt?: string;
      thumbnails?: Record<string, { url?: string }>;
    };
    contentDetails?: {
      videoId?: string;
      videoPublishedAt?: string;
    };
  }[];
};

/** Returns the newest `count` videos from a playlist. Returns [] on any error
 *  or missing config — callers should render an empty state, not treat this
 *  as fatal. */
export async function fetchLatestFromPlaylist(
  playlistId: string,
  count: number
): Promise<YouTubeVideo[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    console.error("Missing YOUTUBE_API_KEY");
    return [];
  }

  try {
    const url = `${PLAYLIST_ITEMS_URL}?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=25&key=${key}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      console.error("YouTube playlistItems fetch failed", res.status, await res.text());
      return [];
    }

    const data: PlaylistItemsResponse = await res.json();

    const items = (data.items ?? [])
      .filter((item) => {
        const title = item.snippet?.title;
        return title && title !== "Private video" && title !== "Deleted video";
      })
      .map((item) => {
        const videoId = item.contentDetails?.videoId ?? "";
        const thumbs = item.snippet?.thumbnails ?? {};
        const thumbnail =
          thumbs.maxres?.url ?? thumbs.high?.url ?? thumbs.medium?.url ?? thumbs.default?.url ?? "";
        // videoPublishedAt is the video's actual upload date; snippet.publishedAt
        // is only when it was added to the playlist.
        const publishedAt =
          item.contentDetails?.videoPublishedAt ?? item.snippet?.publishedAt ?? "";
        return {
          videoId,
          title: item.snippet?.title ?? "",
          description: item.snippet?.description ?? "",
          thumbnail,
          publishedAt,
          url: `https://www.youtube.com/watch?v=${videoId}`,
        };
      })
      .filter((item) => item.videoId);

    items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return items.slice(0, count);
  } catch (err) {
    console.error("YouTube playlistItems fetch error", err);
    return [];
  }
}

/** Looks up a single video by id (accepts an id or any YouTube URL). Returns
 *  undefined on any error, missing config, or an unresolvable/private video. */
export async function fetchVideoById(idOrUrl: string): Promise<YouTubeVideo | undefined> {
  const key = process.env.YOUTUBE_API_KEY;
  const videoId = youtubeIdFromUrl(idOrUrl);
  if (!key || !videoId) return undefined;

  try {
    const url = `${VIDEOS_URL}?part=snippet&id=${videoId}&key=${key}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      console.error("YouTube videos fetch failed", res.status, await res.text());
      return undefined;
    }
    const data: {
      items?: {
        snippet?: {
          title?: string;
          description?: string;
          publishedAt?: string;
          thumbnails?: Record<string, { url?: string }>;
        };
      }[];
    } = await res.json();

    const snippet = data.items?.[0]?.snippet;
    if (!snippet?.title) return undefined;
    const thumbs = snippet.thumbnails ?? {};
    return {
      videoId,
      title: snippet.title,
      description: snippet.description ?? "",
      thumbnail:
        thumbs.maxres?.url ?? thumbs.high?.url ?? thumbs.medium?.url ?? thumbs.default?.url ?? "",
      publishedAt: snippet.publishedAt ?? "",
      url: `https://www.youtube.com/watch?v=${videoId}`,
    };
  } catch (err) {
    console.error("YouTube videos fetch error", err);
    return undefined;
  }
}
