/**
 * Upload a finished video to the A&D YouTube channel (Claude's job, Jose 9/30).
 * Replaces the old one-off yt_upload.py that lived in a temporary session
 * folder and could vanish.
 *
 * Runs on the laptop, like flip-garage-takes.ts, because the YouTube login
 * that can upload (YOUTUBE_CAPTIONS_REFRESH_TOKEN, youtube.force-ssl) lives
 * only in .env.local, never on the server.
 *
 *   npx tsx scripts/youtube-upload.ts \
 *     --file "/path/video.mp4" \
 *     --title "Jeep Wrangler Sand Dunes in the NJ Pine Barrens | Part 1" \
 *     --description-file "/path/description.txt" \
 *     --tags "jeep wrangler sand dunes, pine barrens off road" \
 *     --thumbnail "/path/thumb.jpg" \
 *     --playlist trail \
 *     --privacy public                      # public | unlisted | private
 *     [--publish-at 2026-10-05T23:00:00Z]   # schedules it: uploads private, YouTube flips it then
 *     [--dry]                               # check the inputs, upload nothing
 *
 * --playlist takes "trail", "garage", "podcast" or a raw playlist id.
 * Prints the video id and link when done.
 */
import { open, readFile, stat } from "node:fs/promises";
import {
  GARAGE_TAKES_PLAYLIST_ID,
  PODCAST_EPISODES_PLAYLIST_ID,
  TRAIL_EVENT_VIDEOS_PLAYLIST_ID,
} from "@/lib/youtube";

const CHUNK = 32 * 1024 * 1024; // a multiple of 256 KB, as the resumable API requires
const PLAYLISTS: Record<string, string> = {
  trail: TRAIL_EVENT_VIDEOS_PLAYLIST_ID,
  garage: GARAGE_TAKES_PLAYLIST_ID,
  podcast: PODCAST_EPISODES_PLAYLIST_ID,
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}
const dry = process.argv.includes("--dry");

async function token(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
      refresh_token: process.env.YOUTUBE_CAPTIONS_REFRESH_TOKEN || "",
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`YouTube sign-in failed: ${JSON.stringify(data).slice(0, 200)}`);
  return data.access_token;
}

async function main() {
  const file = arg("file");
  const title = arg("title");
  const descFile = arg("description-file");
  const privacy = arg("privacy") || "private";
  const publishAt = arg("publish-at");
  const thumb = arg("thumbnail");
  const playlistArg = arg("playlist");
  const playlistId = playlistArg ? PLAYLISTS[playlistArg] || playlistArg : undefined;
  const tags = (arg("tags") || "").split(",").map((t) => t.trim()).filter(Boolean);

  if (!file || !title) throw new Error("--file and --title are required");
  if (title.length > 100) throw new Error(`title is ${title.length} characters; YouTube allows 100`);
  if (!["public", "unlisted", "private"].includes(privacy)) throw new Error(`bad --privacy ${privacy}`);
  const description = descFile ? (await readFile(descFile, "utf8")).trim() : "";
  if (description.length > 5000) throw new Error(`description is ${description.length} characters; YouTube allows 5000`);
  const size = (await stat(file)).size;
  if (thumb) await stat(thumb);

  const body = {
    snippet: { title, description, tags, categoryId: "2", defaultLanguage: "en" }, // 2 = Autos & Vehicles
    status: {
      // A scheduled video must upload as private; YouTube makes it public at publishAt.
      privacyStatus: publishAt ? "private" : privacy,
      ...(publishAt ? { publishAt } : {}),
      selfDeclaredMadeForKids: false,
      containsSyntheticMedia: false,
    },
  };
  console.log(`video      ${file} (${(size / 1e9).toFixed(2)} GB)`);
  console.log(`title      ${title} (${title.length} chars)`);
  console.log(`privacy    ${body.status.privacyStatus}${publishAt ? ` → public at ${publishAt}` : ""}`);
  console.log(`desc/tags  ${description.length} chars · ${tags.length} tags`);
  console.log(`thumbnail  ${thumb || "none"} · playlist ${playlistId || "none"}`);
  if (dry) return console.log("dry run: nothing uploaded");

  const auth = { Authorization: `Bearer ${await token()}` };

  // 1. Start a resumable upload session.
  const start = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        ...auth,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(size),
        "X-Upload-Content-Type": "video/*",
      },
      body: JSON.stringify(body),
    },
  );
  const session = start.headers.get("location");
  if (!start.ok || !session) throw new Error(`upload start failed: ${start.status} ${(await start.text()).slice(0, 300)}`);

  // 2. Send the file in chunks; 308 means "keep going".
  const fh = await open(file, "r");
  let offset = 0;
  let videoId = "";
  try {
    while (offset < size) {
      const len = Math.min(CHUNK, size - offset);
      const buf = Buffer.alloc(len);
      await fh.read(buf, 0, len, offset);
      const res = await fetch(session, {
        method: "PUT",
        headers: { "Content-Length": String(len), "Content-Range": `bytes ${offset}-${offset + len - 1}/${size}` },
        body: buf,
      });
      if (res.status === 308) {
        const range = res.headers.get("range"); // "bytes=0-N"
        offset = range ? Number(range.split("-")[1]) + 1 : offset + len;
        process.stdout.write(`\rupload     ${Math.round((offset / size) * 100)}%`);
        continue;
      }
      if (!res.ok) throw new Error(`upload failed at ${offset}: ${res.status} ${(await res.text()).slice(0, 300)}`);
      videoId = (await res.json()).id;
      offset = size;
    }
  } finally {
    await fh.close();
  }
  console.log(`\nuploaded   ${videoId}  https://youtu.be/${videoId}`);

  // 3. Thumbnail.
  if (thumb) {
    const img = await readFile(thumb);
    const res = await fetch(
      `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}&uploadType=media`,
      { method: "POST", headers: { ...auth, "Content-Type": thumb.endsWith(".png") ? "image/png" : "image/jpeg" }, body: img },
    );
    console.log(res.ok ? "thumbnail  set" : `thumbnail  FAILED ${res.status} ${(await res.text()).slice(0, 200)}`);
  }

  // 4. Playlist.
  if (playlistId) {
    const res = await fetch("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ snippet: { playlistId, resourceId: { kind: "youtube#video", videoId } } }),
    });
    console.log(res.ok ? "playlist   added" : `playlist   FAILED ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  console.log(`done: https://www.youtube.com/watch?v=${videoId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
