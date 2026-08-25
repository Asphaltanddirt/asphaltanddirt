// Fetches the newest videos from a YouTube playlist, sorted by actual upload
// date (not playlist-add order). Ported from the static site's
// api/_lib/youtube.js — same filtering/sorting logic, adapted for Next.js
// Server Component data fetching with ISR caching.

const PLAYLIST_ITEMS_URL = "https://www.googleapis.com/youtube/v3/playlistItems";

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
