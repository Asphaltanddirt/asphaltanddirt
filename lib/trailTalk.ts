import { listRecords, isAirtableConfigured } from "@/lib/airtable";
import { socialLinks } from "@/lib/social";

/**
 * This week's Trail Talk for the Community page (Jose, 2026-09-24): the
 * question, its own image, and the three places the conversation happens —
 * X, Threads and the Facebook group. "Same shiny object, different spin":
 * the blog explains, Trail Talk asks.
 *
 * No blog link here on purpose — the X, Threads and group posts already
 * carry it. The group button goes to the week's thread: members land on it,
 * and Facebook sends non-members of the private group to the group page
 * with "Join group" (checked logged-out 2026-09-24), so it never dead-ends.
 *
 * Everything comes from rows we already fill each week, so there's nothing
 * extra to maintain: the question from the newest Newsletters row with a
 * Trail Talk title, the image from that row's "Trail Talk - Image", and the
 * X / Threads links from that week's posted Trail Talk cards.
 */

const NEWS_BASE = process.env.AIRTABLE_NEWSLETTER_BASE_ID;
const NEWSLETTERS = process.env.AIRTABLE_NEWSLETTERS_TABLE || "Newsletters";
const SOCIAL_BASE = process.env.AIRTABLE_ANALYTICS_BASE_ID || "appzbX0Mz3rXtc1GN";
const THREADS_PROFILE = "https://www.threads.com/@asphaltanddirtpodcast";

export interface TrailTalk {
  title: string;
  body: string;
  imageUrl: string | null;
  groupUrl: string;
  xUrl: string;
  threadsUrl: string;
  /** True when the X / Threads links go to the actual posts, not the profiles. */
  xIsPost: boolean;
  threadsIsPost: boolean;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function getCurrentTrailTalk(): Promise<TrailTalk | null> {
  if (!NEWS_BASE || !isAirtableConfigured(NEWS_BASE)) return null;
  try {
    const rows = await listRecords(NEWSLETTERS, "NOT({Trail Talk - Title} = '')", { baseId: NEWS_BASE, revalidate: 900 });
    if (rows.length === 0) return null;
    rows.sort((a, b) => str(b.fields["Week Of"]).localeCompare(str(a.fields["Week Of"])));
    const f = rows[0].fields;
    const weekOf = str(f["Week Of"]).slice(0, 10);

    let xUrl = "";
    let threadsUrl = "";
    if (weekOf && isAirtableConfigured(SOCIAL_BASE)) {
      const cards = await listRecords(
        "Social Posts",
        `AND(IS_SAME({Week Of}, '${weekOf}', 'day'), {Topic} = 'Trail Talk', {Status} = 'Posted')`,
        { baseId: SOCIAL_BASE, revalidate: 900 },
      ).catch(() => []);
      for (const c of cards) {
        const url = str(c.fields["Post URL"]);
        if (!url) continue;
        if (c.fields.Platform === "X") xUrl ||= url;
        if (c.fields.Platform === "Threads") threadsUrl ||= url;
      }
    }

    const image = ((f["Trail Talk - Image"] as { url?: string }[] | undefined) || [])[0]?.url || null;
    return {
      title: str(f["Trail Talk - Title"]),
      body: str(f["Trail Talk - Body"]),
      imageUrl: image,
      groupUrl: str(f["Trail Talk - Link"]) || socialLinks.facebookGroup,
      xUrl: xUrl || socialLinks.x,
      threadsUrl: threadsUrl || THREADS_PROFILE,
      xIsPost: Boolean(xUrl),
      threadsIsPost: Boolean(threadsUrl),
    };
  } catch (err) {
    console.error("Trail Talk fetch error", err);
    return null;
  }
}

/** The week's Trail Talk image (Newsletters → "Trail Talk - Image"), if any. */
export async function trailTalkImageFor(weekOf: string): Promise<{ url: string; filename: string } | null> {
  if (!NEWS_BASE || !isAirtableConfigured(NEWS_BASE) || !/^\d{4}-\d{2}-\d{2}$/.test(weekOf)) return null;
  const rows = await listRecords(NEWSLETTERS, `IS_SAME({Week Of}, '${weekOf}', 'day')`, { baseId: NEWS_BASE }).catch(() => []);
  for (const r of rows) {
    const img = ((r.fields["Trail Talk - Image"] as { url?: string; filename?: string }[] | undefined) || [])[0];
    if (img?.url) return { url: img.url, filename: img.filename || "trail-talk.jpg" };
  }
  return null;
}
