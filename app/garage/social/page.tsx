import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageSocialGenerate from "@/components/GarageSocialGenerate";
import GarageSocialPost from "@/components/GarageSocialPost";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { getWeekPosts, type SocialPost } from "@/lib/garageSocial";
import { todayNY, weekOf } from "@/lib/garageTasks";

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

export default async function GarageSocialPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeOwnerOnly(session)) redirect("/garage");

  const today = todayNY();
  const { week } = await searchParams;
  const monday = weekOf(week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : today);
  const posts = await getWeekPosts(monday).catch((): SocialPost[] | null => null);

  const byDay = new Map<string, SocialPost[]>();
  for (const p of posts || []) byDay.set(p.due, [...(byDay.get(p.due) || []), p]);
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
          </div>
          <nav className="garage-links garage-links-wrap" aria-label="Weeks">
            <Link href={`/garage/social?week=${shift(monday, -7)}`}>← Last week</Link>
            {monday !== weekOf(today) && <Link href="/garage/social">This week</Link>}
            <Link href={`/garage/social?week=${shift(monday, 7)}`}>Next week →</Link>
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
          [...byDay.entries()].map(([day, items]) => (
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
          ))
        )}
      </div>
    </div>
  );
}
