import { createRecord, listRecords, updateRecord, uploadAttachment, isAirtableConfigured, type AirtableFields } from "@/lib/airtable";
import { getPostBySlug } from "@/lib/blog";
import { todayNY, weekOf } from "@/lib/garageTasks";
import { isAutoPlatform } from "@/lib/socialCopy";

/**
 * The social posting board in A&D Garage (/garage/social).
 *
 * Two tables in the Analytics base:
 *  - Posting Schedule: the repeating week, one row per slot (day, topic,
 *    platform, time window). Change the week there, no deploy needed.
 *  - Social Posts: the real posts, generated per week from the active slots.
 *    Assets, caption and drafts live on the row; posting stamps the link,
 *    who and when, and the TikTok test's 7-day numbers go on the same row.
 *
 * `Slot Key` = "<schedule record id>|<Monday>" stops a week being generated
 * twice. Marking a Trail Talk post as posted writes it into that week's
 * Newsletters row so the Thursday digest picks it up.
 */

const BASE_ID = process.env.AIRTABLE_ANALYTICS_BASE_ID || "appzbX0Mz3rXtc1GN";
const SCHEDULE = "Posting Schedule";
const POSTS = "Social Posts";
const NEWSLETTER_BASE_ID = process.env.AIRTABLE_NEWSLETTER_BASE_ID;
const NEWSLETTERS = process.env.AIRTABLE_NEWSLETTERS_TABLE || "Newsletters";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * The 6-week TikTok timing test (1 PM vs 7 PM), from Mon 2026-09-21. Each week
 * lists the slot for the four test posts in schedule order: Mon Feature
 * carousel, Thu Alternate carousel, Fri Feature clip, Sat Alternate clip.
 * Balanced so each weekday and format gets both times equally.
 */
const TEST_START = "2026-09-21";
const TEST_WEEKS: ("1 PM" | "7 PM")[][] = [
  ["1 PM", "1 PM", "7 PM", "7 PM"],
  ["7 PM", "7 PM", "1 PM", "1 PM"],
  ["1 PM", "7 PM", "1 PM", "7 PM"],
  ["7 PM", "1 PM", "7 PM", "1 PM"],
  ["1 PM", "7 PM", "7 PM", "1 PM"],
  ["7 PM", "1 PM", "1 PM", "7 PM"],
];

export type PostStatus = "Planned" | "Posted" | "Skipped";

export interface SocialAsset {
  url: string;
  thumb: string;
  filename: string;
  type: string;
}

export interface SocialPost {
  id: string;
  name: string;
  weekOf: string;
  due: string;
  window: string;
  topic: string;
  platform: string;
  asset: string;
  status: PostStatus;
  blogTitle: string;
  blogUrl: string;
  caption: string;
  hashtags: string;
  firstComment: string;
  drafts: string[];
  assets: SocialAsset[];
  postUrl: string;
  postedAt: string;
  postedBy: string;
  testSlot: string;
  stats: {
    views: number | null;
    forYou: number | null;
    shares: number | null;
    saves: number | null;
    follows: number | null;
    likes: number | null;
    replies: number | null;
    linkClicks: number | null;
    profileClicks: number | null;
  };
  /** The event this post promotes, as its slug. Blank for everything that
   *  isn't event promo, which is most posts. */
  event: string;
  /** X link test: where the blog link goes. Blank = in a reply. */
  linkPlacement: "" | "In post" | "In reply";
  notes: string;
  sort: number;
  /** Auto-posting: only approved posts go out on their own. */
  approved: boolean;
  approvedBy: string;
  autoStatus: "" | "Processing" | "Posted" | "Failed" | "Dry run";
  autoLog: string;
  autoState: string;
}

const escapeFormula = (v: string) => v.replace(/'/g, "\\'");
const num = (v: unknown) => (typeof v === "number" ? v : null);
const str = (v: unknown) => (typeof v === "string" ? v : "");

function toPost(r: { id: string; fields: AirtableFields }): SocialPost {
  const f = r.fields;
  return {
    id: r.id,
    name: str(f.Name),
    weekOf: str(f["Week Of"]).slice(0, 10),
    due: str(f.Due).slice(0, 10),
    window: str(f.Window),
    topic: str(f.Topic),
    platform: str(f.Platform),
    asset: str(f.Asset),
    status: (str(f.Status) as PostStatus) || "Planned",
    blogTitle: str(f["Blog Title"]),
    blogUrl: str(f["Blog URL"]),
    caption: str(f.Caption),
    hashtags: str(f.Hashtags).trim(),
    firstComment: str(f["First Comment"]).trim(),
    drafts: str(f.Drafts)
      .split(/\n\s*---\s*\n/)
      .map((d) => d.trim())
      .filter(Boolean),
    assets: ((f.Assets as { url: string; filename: string; type: string; thumbnails?: { large?: { url: string } } }[] | undefined) || []).map(
      (a) => ({ url: a.url, thumb: a.thumbnails?.large?.url || a.url, filename: a.filename, type: a.type }),
    ),
    postUrl: str(f["Post URL"]),
    postedAt: str(f["Posted At"]),
    postedBy: str(f["Posted By"]),
    testSlot: str(f["Test Slot"]),
    stats: {
      views: num(f["Views 7d"]),
      forYou: num(f["For You %"]),
      shares: num(f["Shares 7d"]),
      saves: num(f["Saves 7d"]),
      follows: num(f["Follows 7d"]),
      likes: num(f["Likes 7d"]),
      replies: num(f["Replies 7d"]),
      linkClicks: num(f["Link Clicks 7d"]),
      profileClicks: num(f["Profile Clicks 7d"]),
    },
    event: str(f.Event).trim(),
    linkPlacement: str(f["Link Placement"]) as SocialPost["linkPlacement"],
    notes: str(f.Notes),
    sort: 0,
    approved: f.Approved === true,
    approvedBy: str(f["Approved By"]),
    autoStatus: str(f["Auto Status"]) as SocialPost["autoStatus"],
    autoLog: str(f["Auto Log"]),
    autoState: str(f["Auto State"]),
  };
}

export function isSocialConfigured() {
  return isAirtableConfigured(BASE_ID);
}

/** A week's posts, in day order then schedule order. */
export async function getWeekPosts(monday: string): Promise<SocialPost[]> {
  if (!isSocialConfigured()) return [];
  const [posts, schedule] = await Promise.all([
    listRecords(POSTS, `IS_SAME({Week Of}, '${monday}', 'day')`, { baseId: BASE_ID }),
    listRecords(SCHEDULE, undefined, { baseId: BASE_ID }),
  ]);
  const sortBySlot = new Map(schedule.map((s) => [s.id, Number(s.fields.Sort || 0)]));
  return posts
    .map((r) => {
      const post = toPost(r);
      post.sort = sortBySlot.get(str(r.fields["Slot Key"]).split("|")[0]) ?? 999;
      return post;
    })
    .sort((a, b) => a.due.localeCompare(b.due) || a.sort - b.sort);
}

export async function getPost(id: string): Promise<SocialPost | null> {
  if (!isSocialConfigured() || !/^rec[A-Za-z0-9]{14}$/.test(id)) return null;
  const rows = await listRecords(POSTS, `RECORD_ID() = '${id}'`, { baseId: BASE_ID });
  return rows[0] ? toPost(rows[0]) : null;
}

/** Posts due today or overdue and still Planned, for the Garage home. */
export async function getPostsNeedingAttention(today = todayNY()): Promise<SocialPost[]> {
  if (!isSocialConfigured()) return [];
  const rows = await listRecords(
    POSTS,
    `AND({Status} = 'Planned', IS_BEFORE({Due}, DATEADD('${today}', 1, 'days')), IS_AFTER({Due}, DATEADD('${today}', -8, 'days')))`,
    { baseId: BASE_ID },
  );
  return (
    rows
      .map(toPost)
      // BY HAND ONLY. This is the "you have things to post" card on the home
      // screen, so an auto platform has no business in it — it told Jose to
      // post an Instagram Reel that Instagram's own auto-poster owns, and
      // would have said so every day forever (2026-09-23). An auto post that
      // is stuck surfaces as a failure notification and as a short count on
      // the week strip, not as somebody's to-do.
      .filter((p) => !isAutoPlatform(p.platform))
      .sort((a, b) => a.due.localeCompare(b.due))
  );
}

/**
 * Hold every unposted card promoting an event, because the event is off.
 *
 * Called when an event is cancelled or postponed. A cancellation notice and an
 * "it's this Saturday!" post landing on the same channel the same morning is
 * worse than either on its own.
 *
 * Only touches cards that have NOT gone out. An already-posted one is left
 * exactly as it is — that bell cannot be unrung, and the cancellation notice
 * reaches the same audience on the same channel anyway.
 *
 * Best-effort: this runs inside saving an event, and failing to tidy the
 * posting board must never stop the event itself being saved.
 */
export async function holdEventPromos(slug: string, reason: string): Promise<{ held: number }> {
  if (!slug || !isSocialConfigured()) return { held: 0 };
  try {
    const rows = await listRecords(POSTS, `AND({Event} = '${escapeFormula(slug)}', {Status} = 'Planned')`, { baseId: BASE_ID });
    let held = 0;
    for (const r of rows) {
      const note = [str(r.fields.Notes), `Held ${new Date().toISOString().slice(0, 10)}: ${reason}`].filter(Boolean).join("\n");
      await updateRecord(POSTS, r.id, { Status: "Skipped", Approved: false, Notes: note.slice(0, 2000) }, { baseId: BASE_ID });
      held++;
    }
    return { held };
  } catch (err) {
    console.error("couldn't hold event promos for", slug, err);
    return { held: 0 };
  }
}

/** The Feature and Alternate blog posts for a week, from its Newsletters row. */
async function weekBlogs(monday: string): Promise<{ feature: { title: string; url: string }; alternate: { title: string; url: string } }> {
  const empty = { feature: { title: "", url: "" }, alternate: { title: "", url: "" } };
  if (!isAirtableConfigured(NEWSLETTER_BASE_ID)) return empty;
  try {
    const rows = await listRecords(NEWSLETTERS, `IS_SAME({Week Of}, '${monday}', 'day')`, { baseId: NEWSLETTER_BASE_ID });
    const f = rows[0]?.fields;
    if (!f) return empty;
    const titleFor = (url: string) => getPostBySlug(url.split("/blog/")[1]?.split(/[?#/]/)[0] || "")?.title || "";
    const featureUrl = str(f["Feature - Post URL"]);
    const alternateUrl = str(f["Also This Week - URL"]);
    return {
      feature: { title: titleFor(featureUrl), url: featureUrl },
      alternate: { title: titleFor(alternateUrl) || str(f["Also This Week - Title"]), url: alternateUrl },
    };
  } catch {
    return empty;
  }
}

/**
 * X link test (approved 2026-09-22): four weeks from Mon 9/28, alternating
 * where the blog link goes on X — in the post itself, or in a reply under
 * it — so our own numbers settle whether links still cost reach. Outside the
 * test, the link stays in a reply.
 */
const LINK_TEST_START = "2026-09-28";
const LINK_TEST_WEEKS = 4;
function linkPlacementFor(monday: string): "In post" | "In reply" | "" {
  const weeks = Math.round((Date.parse(`${monday}T12:00:00Z`) - Date.parse(`${LINK_TEST_START}T12:00:00Z`)) / (7 * 86_400_000));
  if (weeks < 0 || weeks >= LINK_TEST_WEEKS) return "";
  return weeks % 2 === 0 ? "In post" : "In reply";
}

function testSlotsFor(monday: string): ("1 PM" | "7 PM")[] | null {
  const weeks = Math.round((Date.parse(`${monday}T12:00:00Z`) - Date.parse(`${TEST_START}T12:00:00Z`)) / (7 * 86_400_000));
  return weeks >= 0 && weeks < TEST_WEEKS.length ? TEST_WEEKS[weeks] : null;
}

/** Creates a week's posts from the active schedule. Safe to run repeatedly. */
export async function generateSocialWeek(reference = todayNY()): Promise<string[]> {
  if (!isSocialConfigured()) return [];
  const monday = weekOf(reference);
  const [schedule, existing, blogs] = await Promise.all([
    listRecords(SCHEDULE, `{Active} = TRUE()`, { baseId: BASE_ID }),
    listRecords(POSTS, `IS_SAME({Week Of}, '${monday}', 'day')`, { baseId: BASE_ID }),
    weekBlogs(monday),
  ]);
  const already = new Set(existing.map((r) => str(r.fields["Slot Key"])));

  // The week is usually built before Monday's Newsletters row names the
  // Feature and Alternate posts, so each run fills in any blog links still missing.
  for (const row of existing) {
    const topic = str(row.fields.Topic);
    const blog = topic === "Feature" ? blogs.feature : topic === "Alternate" ? blogs.alternate : null;
    if (!blog?.url || str(row.fields["Blog URL"])) continue;
    await updateRecord(POSTS, row.id, { "Blog URL": blog.url, ...(blog.title ? { "Blog Title": blog.title } : {}) }, { baseId: BASE_ID });
  }
  const testSlots = testSlotsFor(monday);
  let testIndex = 0;
  const made: string[] = [];

  for (const slot of schedule.sort((a, b) => Number(a.fields.Sort || 0) - Number(b.fields.Sort || 0))) {
    const f = slot.fields;
    const isTest = f["TikTok Test"] === true;
    const testSlot = isTest && testSlots ? testSlots[testIndex] : "";
    if (isTest) testIndex += 1;

    const key = `${slot.id}|${monday}`;
    if (already.has(key)) continue;

    const day = WEEKDAYS.indexOf(str(f.Weekday) || "Monday");
    const due = new Date(`${monday}T12:00:00Z`);
    due.setUTCDate(due.getUTCDate() + Math.max(day, 0));
    const topic = str(f.Topic);
    const blog = topic === "Feature" ? blogs.feature : topic === "Alternate" ? blogs.alternate : null;
    const linkPlacement = str(f.Platform) === "X" && str(f.Asset) === "X image" && blog ? linkPlacementFor(monday) : "";

    await createRecord(
      POSTS,
      {
        Name: str(f.Slot),
        "Slot Key": key,
        "Week Of": monday,
        Due: due.toISOString().slice(0, 10),
        Window: testSlot ? `${testSlot} (timing test)` : str(f.Window),
        Topic: topic,
        Platform: str(f.Platform),
        Asset: str(f.Asset),
        Status: "Planned",
        ...(testSlot ? { "Test Slot": testSlot } : {}),
        ...(linkPlacement ? { "Link Placement": linkPlacement } : {}),
        ...(blog?.title ? { "Blog Title": blog.title } : {}),
        ...(blog?.url ? { "Blog URL": blog.url } : {}),
        ...(f.Notes ? { Notes: str(f.Notes) } : {}),
      },
      { baseId: BASE_ID, typecast: true },
    );
    made.push(key);
  }
  return made;
}

/** "Title: ..." on the first line of a Trail Talk draft becomes the title. */
export function splitDraft(draft: string): { title: string; body: string } {
  const lines = draft.split("\n");
  const match = lines[0]?.match(/^title:\s*(.+)$/i);
  if (!match) return { title: "", body: draft.trim() };
  return { title: match[1].trim(), body: lines.slice(1).join("\n").replace(/^\s*body:\s*/i, "").trim() };
}

export async function markPosted(post: SocialPost, input: { url: string; by: string; draftIndex?: number }) {
  await updateRecord(
    POSTS,
    post.id,
    { Status: "Posted", "Post URL": input.url || null, "Posted At": new Date().toISOString(), "Posted By": input.by },
    { baseId: BASE_ID },
  );

  // The Facebook Group's Trail Talk feeds Thursday's newsletter. (The X
  // version of the same question is its own post and doesn't.)
  if (post.topic === "Trail Talk" && post.platform === "Facebook Group" && isAirtableConfigured(NEWSLETTER_BASE_ID)) {
    const draft = post.drafts[input.draftIndex ?? 0] || post.caption;
    const { title, body } = splitDraft(draft || "");
    const rows = await listRecords(NEWSLETTERS, `IS_SAME({Week Of}, '${post.weekOf}', 'day')`, { baseId: NEWSLETTER_BASE_ID });
    if (rows[0]) {
      await updateRecord(
        NEWSLETTERS,
        rows[0].id,
        {
          ...(title ? { "Trail Talk - Title": title } : {}),
          ...(body ? { "Trail Talk - Body": body } : {}),
          ...(input.url ? { "Trail Talk - Link": input.url } : {}),
        },
        { baseId: NEWSLETTER_BASE_ID },
      );
    }
  }
}

/** Approve (or un-approve) a post for the auto-poster. Un-approving clears a
 *  failed or dry-run note so the card starts clean. */
export async function setApproved(id: string, approved: boolean, by: string) {
  await updateRecord(
    POSTS,
    id,
    approved
      ? { Approved: true, "Approved By": by }
      : { Approved: false, "Approved By": null, "Auto Status": null, "Auto Log": null },
    { baseId: BASE_ID },
  );
}

/** What the auto-poster writes back after each attempt. */
export async function saveAutoResult(
  id: string,
  result: { status: SocialPost["autoStatus"]; log: string; state?: string | null },
) {
  await updateRecord(
    POSTS,
    id,
    {
      "Auto Status": result.status || null,
      "Auto Log": result.log,
      ...(result.state !== undefined ? { "Auto State": result.state } : {}),
    },
    { baseId: BASE_ID },
  );
}

/** Approved posts still waiting to go out, plus any mid-way through posting.
 *  Looks back two days so a post approved late in its window isn't lost. */
export async function getAutoPostQueue(today = todayNY()): Promise<SocialPost[]> {
  if (!isSocialConfigured()) return [];
  const rows = await listRecords(
    POSTS,
    `AND({Status} = 'Planned', {Approved}, IS_BEFORE({Due}, DATEADD('${today}', 1, 'days')), IS_AFTER({Due}, DATEADD('${today}', -3, 'days')))`,
    { baseId: BASE_ID },
  );
  return rows.map(toPost).sort((a, b) => a.due.localeCompare(b.due));
}

export async function setStatus(id: string, status: PostStatus) {
  await updateRecord(
    POSTS,
    id,
    status === "Planned" ? { Status: "Planned", "Posted At": null, "Posted By": null } : { Status: status },
    { baseId: BASE_ID },
  );
}

export async function saveStats(id: string, stats: Partial<SocialPost["stats"]>) {
  const map: Record<keyof SocialPost["stats"], string> = {
    views: "Views 7d",
    forYou: "For You %",
    shares: "Shares 7d",
    saves: "Saves 7d",
    follows: "Follows 7d",
    likes: "Likes 7d",
    replies: "Replies 7d",
    linkClicks: "Link Clicks 7d",
    profileClicks: "Profile Clicks 7d",
  };
  const fields: AirtableFields = {};
  // Only the numbers this card shows are sent; the rest are left alone.
  for (const [k, v] of Object.entries(stats)) if (v !== undefined) fields[map[k as keyof SocialPost["stats"]]] = v ?? null;
  await updateRecord(POSTS, id, fields, { baseId: BASE_ID });
}

export async function saveText(
  id: string,
  input: { caption?: string; hashtags?: string; firstComment?: string; drafts?: string; blogUrl?: string; blogTitle?: string },
) {
  const fields: AirtableFields = {};
  if (input.caption !== undefined) fields.Caption = input.caption;
  if (input.hashtags !== undefined) fields.Hashtags = input.hashtags;
  if (input.firstComment !== undefined) fields["First Comment"] = input.firstComment;
  if (input.drafts !== undefined) fields.Drafts = input.drafts;
  if (input.blogUrl !== undefined) fields["Blog URL"] = input.blogUrl || null;
  if (input.blogTitle !== undefined) fields["Blog Title"] = input.blogTitle;
  await updateRecord(POSTS, id, fields, { baseId: BASE_ID });
}

export async function addAsset(id: string, file: { filename: string; contentType: string; base64: string }) {
  await uploadAttachment(id, "Assets", file, { baseId: BASE_ID });
}
