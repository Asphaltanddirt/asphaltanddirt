import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageSocialGenerate from "@/components/GarageSocialGenerate";
import GarageSocialPost from "@/components/GarageSocialPost";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { getPost, getWeekPosts, type SocialPost } from "@/lib/garageSocial";
import { todayNY, weekOf } from "@/lib/garageTasks";
import { isAutoPlatform, topicLabel } from "@/lib/socialCopy";

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
  searchParams: Promise<{ week?: string; all?: string; card?: string; open?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeOwnerOnly(session)) redirect("/garage");

  const today = todayNY();
  const { week, all, card, open } = await searchParams;
  // ?card=<id> (notifications, the Planning Calendar): open the card's own
  // week with every day showing, scrolled to that card.
  if (card && /^rec[A-Za-z0-9]{14}$/.test(card)) {
    const post = await getPost(card).catch(() => null);
    if (post) redirect(`/garage/social?week=${weekOf(post.due)}&all=1&open=${post.id}#card-${post.id}`);
  }
  const monday = weekOf(week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : today);
  const posts = await getWeekPosts(monday).catch((): SocialPost[] | null => null);

  // Needs you / All set (Jose 9/29: "on mobile, i am scrolling for days past
  // things that are done to get to the one that isn't"). To him a card is done
  // once it's handled: approved (auto), scheduled (by hand), posted or
  // skipped. Every card that still needs a person floats to the top, soonest
  // first, full size; handled ones shrink to one line below, grouped by day,
  // and open with a tap. A past day that's all Posted/Skipped still folds away
  // unless ?all=1. Overdue work is never the thing that gets hidden: a Planned
  // card that's past due, or an auto card that failed, is always in Needs you.
  const showAll = all === "1";
  const finished = (p: SocialPost) => p.status === "Posted" || p.status === "Skipped";
  const handled = (p: SocialPost) =>
    finished(p) || (isAutoPlatform(p.platform) ? p.approved && p.autoStatus !== "Failed" : Boolean(p.scheduledAt));
  const spent = (items: SocialPost[], day: string) => day < today && items.every(finished);

  const needsYou = (posts || []).filter((p) => !handled(p));
  const allSet = (posts || []).filter(handled);
  const setDays = (() => {
    const m = new Map<string, SocialPost[]>();
    for (const p of allSet) m.set(p.due, [...(m.get(p.due) || []), p]);
    return [...m.entries()].filter(([day]) => showAll || !spent((posts || []).filter((p) => p.due === day), day));
  })();
  const hiddenDays = showAll
    ? 0
    : [...new Set((posts || []).map((p) => p.due))].filter((day) =>
        spent((posts || []).filter((p) => p.due === day), day),
      ).length;
  const stateOf = (p: SocialPost) =>
    p.status === "Posted" ? "Posted" : p.status === "Skipped" ? "Skipped" : isAutoPlatform(p.platform) ? "Approved" : "Scheduled";

  return (
    <div className="garage">
      <GarageBack title="Posting" />
      <div className="garage-body garage-body-wide">
        <div className="garage-social-top">
          <div>
            <h1 className="garage-event-title">Posting board</h1>
            <p className="garage-event-area">
              Week of {label(monday, { month: "long", day: "numeric" })}
              {posts && posts.length > 0 && ` · ${needsYou.length} need you · ${allSet.length} all set`}
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
          <>
            <section className="garage-social-day">
              <h2 className="garage-event-title garage-social-part">Needs you</h2>
              {needsYou.length === 0 ? (
                <p className="garage-form-note">Nothing needs you this week. Everything below is approved, scheduled or done.</p>
              ) : (
                <>
                  <p className="garage-form-note">Soonest first. Approve an auto-post, or schedule or post a by-hand one, and it moves down to All set.</p>
                  <div className="garage-social-grid">
                    {needsYou.map((item) => (
                      <GarageSocialPost key={item.id} item={item} today={today} />
                    ))}
                  </div>
                </>
              )}
            </section>
            {setDays.length > 0 && (
              <div>
                <h2 className="garage-event-title garage-social-part">All set</h2>
                <p className="garage-form-note">Approved, scheduled or done. Tap one to open it.</p>
                {setDays.map(([day, items]) => (
                  <section key={day} className={day === today ? "garage-social-day is-today" : "garage-social-day"}>
                    <h2 className="garage-section">
                      {label(day, { weekday: "long", month: "short", day: "numeric" })}
                      {day === today && " · Today"}
                    </h2>
                    <div className="garage-social-done-rows">
                      {items.map((item) => (
                        <details key={item.id} className="garage-social-done-row" open={item.id === open}>
                          <summary>
                            <span className="garage-social-done-check" aria-hidden="true">✓</span>
                            <span className="garage-social-done-what">
                              <strong>{item.platform}</strong> · {topicLabel(item.topic, item.weekOf)}
                              {item.window && <span className="garage-social-done-when"> · {item.window}</span>}
                            </span>
                            <span className="garage-plan-pill">{stateOf(item)}</span>
                          </summary>
                          <div className="garage-social-done-body">
                            <GarageSocialPost item={item} today={today} />
                          </div>
                        </details>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
