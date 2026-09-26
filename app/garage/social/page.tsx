import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageSocialGenerate from "@/components/GarageSocialGenerate";
import GarageSocialPost from "@/components/GarageSocialPost";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { getPost, getWeekPosts, type SocialPost } from "@/lib/garageSocial";
import { todayNY, weekOf } from "@/lib/garageTasks";
import { isAutoPlatform } from "@/lib/socialCopy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Posting · A and D Garage",
  robots: { index: false, follow: false },
};

const shift = (monday: string, days: number) => {
  const d = new Date(`${monday}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const label = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });

export default async function GarageSocialPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; all?: string; card?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeOwnerOnly(session)) redirect("/garage");

  const today = todayNY();
  const { week, all, card } = await searchParams;
  // ?card=<id> (notifications, the Planning Calendar): open the card's own
  // week with every day showing, scrolled to that card.
  if (card && /^rec[A-Za-z0-9]{14}$/.test(card)) {
    const post = await getPost(card).catch(() => null);
    if (post) redirect(`/garage/social?week=${weekOf(post.due)}&all=1#card-${post.id}`);
  }
  const monday = weekOf(week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : today);
  const posts = await getWeekPosts(monday).catch((): SocialPost[] | null => null);

  // Two sections (Jose 9/22): what he posts by hand on top, then the
  // auto-posts he only approves. Each stays grouped by day.
  // By Thursday the top of the board is Monday's finished work, and you scroll
  // past three days of ticks to reach anything you can act on (Jose, 9/23).
  // A past day whose items are all Posted or Skipped is done with; it folds
  // away unless ?all=1. A past day still holding something Planned stays —
  // overdue work must never be the thing that got hidden.
  const showAll = all === "1";
  const finished = (p: SocialPost) => p.status === "Posted" || p.status === "Skipped";
  const spent = (items: SocialPost[], day: string) => day < today && items.every(finished);

  const groupByDay = (list: SocialPost[]) => {
    const m = new Map<string, SocialPost[]>();
    for (const p of list) m.set(p.due, [...(m.get(p.due) || []), p]);
    return [...m.entries()].filter(([day, items]) => showAll || !spent(items, day));
  };
  const hiddenDays = showAll
    ? 0
    : [...new Set((posts || []).map((p) => p.due))].filter((day) =>
        spent((posts || []).filter((p) => p.due === day), day),
      ).length;
  const byHand = groupByDay((posts || []).filter((p) => !isAutoPlatform(p.platform)));
  const auto = groupByDay((posts || []).filter((p) => isAutoPlatform(p.platform)));
  const openHand = (posts || []).filter((p) => !isAutoPlatform(p.platform) && p.status === "Planned" && !p.scheduledAt).length;
  const toApprove = (posts || []).filter((p) => isAutoPlatform(p.platform) && p.status === "Planned" && !p.approved).length;
  const posted = posts?.filter((p) => p.status === "Posted").length ?? 0;
  const open = posts?.filter((p) => p.status === "Planned").length ?? 0;

  return (
    <div className="garage">
      <GarageBack title="Posting" />
      <div className="garage-body garage-body-wide">
        <div className="garage-social-top">
          <div>
            <h1 className="garage-event-title">Posting board</h1>
            <p className="garage-event-area">
              Week of {label(monday, { month: "long", day: "numeric" })}
              {posts && posts.length > 0 && ` · ${posted} posted · ${open} to go`}
            </p>
            {hiddenDays > 0 && (
              <p className="garage-form-note">
                {hiddenDays} finished {hiddenDays === 1 ? "day is" : "days are"} folded away ·{" "}
                <Link href={`/garage/social?week=${monday}&all=1`}>Show the whole week</Link>
              </p>
            )}
            {showAll && (
              <p className="garage-form-note">
                Showing every day · <Link href={`/garage/social?week=${monday}`}>Just what&apos;s left</Link>
              </p>
            )}
          </div>
          <nav className="garage-links garage-links-wrap" aria-label="Weeks">
            <Link href={`/garage/social?week=${shift(monday, -7)}`}>← Last week</Link>
            {monday !== weekOf(today) && <Link href="/garage/social">This week</Link>}
            <Link href={`/garage/social?week=${shift(monday, 7)}`}>Next week →</Link>
            <Link href="/garage/replies">X replies</Link>
          </nav>
        </div>

        {!posts ? (
          <p className="garage-error">Couldn&apos;t read the posting board.</p>
        ) : posts.length === 0 ? (
          <section className="garage-panel">
            <h2>Nothing planned yet</h2>
            <p>The week builds itself from the Posting Schedule every morning. Build it now to start adding captions and images.</p>
            <GarageSocialGenerate week={monday} />
          </section>
        ) : (
          (
            [
              ["By hand", `You post these yourself (TikTok Studio, the Facebook Group, YouTube). ${openHand} still to do.`, byHand],
              ["Auto-posts", `These post themselves once approved (X, Threads, Facebook Page, Instagram). ${toApprove} waiting for Approve.`, auto],
            ] as const
          ).map(([title, note, days]) =>
            days.length === 0 ? null : (
              <div key={title}>
                <h2 className="garage-event-title garage-social-part">{title}</h2>
                <p className="garage-form-note">{note}</p>
                {days.map(([day, items]) => (
                  <section key={day} className={day === today ? "garage-social-day is-today" : "garage-social-day"}>
                    <h2 className="garage-section">
                      {label(day, { weekday: "long", month: "short", day: "numeric" })}
                      {day === today && " · Today"}
                    </h2>
                    <div className="garage-social-grid">
                      {items.map((item) => (
                        <GarageSocialPost key={item.id} item={item} today={today} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ),
          )
        )}
      </div>
    </div>
  );
}
