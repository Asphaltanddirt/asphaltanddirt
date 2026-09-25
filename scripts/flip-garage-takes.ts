/**
 * Friday 9 AM: make this week's Garage Takes Public (Claude's job, Jose 9/25).
 *
 * Runs on the laptop from a scheduled task, because the YouTube login that can
 * change a video's privacy (YOUTUBE_CAPTIONS_REFRESH_TOKEN, youtube.force-ssl)
 * deliberately lives only in .env.local, never on the server.
 *
 * Which videos: every take in lib/garageTakes.ts whose liveFrom is within the
 * last 7 days (that Friday's pair) and is still Unlisted. Anything already
 * Public or Private is left alone. Then the week's Garage task
 * "Make both vlogs Public" is ticked.
 *
 *   npx tsx scripts/flip-garage-takes.ts          # flip
 *   npx tsx scripts/flip-garage-takes.ts --dry    # only report
 */
import { garageTakes } from "@/lib/garageTakes";
import { todayNY, weekOf } from "@/lib/garageTasks";
import { listRecords, updateRecord } from "@/lib/airtable";

const dry = process.argv.includes("--dry");

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

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
  const today = todayNY();
  const due = garageTakes.filter((t) => t.liveFrom <= today && t.liveFrom > addDays(today, -7));
  if (!due.length) return console.log(`${today}: no Garage Takes due this week.`);

  const auth = { Authorization: `Bearer ${await token()}` };
  const ids = due.map((t) => t.videoId).join(",");
  const list = await (await fetch(`https://www.googleapis.com/youtube/v3/videos?part=status,snippet&id=${ids}`, { headers: auth })).json();
  const flipped: string[] = [];
  for (const v of list.items || []) {
    const title = v.snippet?.title || v.id;
    if (v.status?.privacyStatus !== "unlisted") {
      console.log(`skip  ${v.id} ${title} (already ${v.status?.privacyStatus})`);
      continue;
    }
    if (dry) {
      console.log(`would flip ${v.id} ${title}`);
      continue;
    }
    // videos.update replaces the whole status part, so send it back with only
    // the privacy changed (publishAt must be dropped for a public video).
    const status = { ...v.status, privacyStatus: "public" };
    delete status.publishAt;
    const res = await fetch("https://www.googleapis.com/youtube/v3/videos?part=status", {
      method: "PUT",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ id: v.id, status }),
    });
    if (!res.ok) throw new Error(`flip failed for ${v.id}: ${res.status} ${(await res.text()).slice(0, 200)}`);
    flipped.push(title);
    console.log(`public ${v.id} ${title}`);
  }

  if (!dry) {
    const key = `blog-fri-public-social|${weekOf(today)}`;
    const [task] = await listRecords("Tasks", `{Template Key} = '${key}'`, { baseId: process.env.AIRTABLE_GARAGE_BASE_ID });
    if (task && task.fields.Status !== "Done") {
      await updateRecord("Tasks", task.id, { Status: "Done", "Done At": new Date().toISOString() }, { baseId: process.env.AIRTABLE_GARAGE_BASE_ID });
      console.log(`ticked task: ${task.fields.Title}`);
    }
  }
  console.log(`done: ${flipped.length} flipped`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
