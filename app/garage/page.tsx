import type { Metadata } from "next";
import Link from "next/link";
import { getSession, isGarageConfigured, canRunEvents, canSeeOwnerOnly } from "@/lib/garageAuth";
import { getPublishedEvents } from "@/lib/events";
import GarageTaskList from "@/components/GarageTaskList";
import { getTasksFor, todayNY, weekOf } from "@/lib/garageTasks";

/** The app name Google shows on its sign-in screen is "A and D Garage" (Google
 *  rejects "&"), so this page says the same thing in its title — that's what
 *  Google's branding check compares. */
/** Never served from a cache: the Garage is live data on a phone that stays
 *  open, and stale tasks or answers are worse than a moment's load. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "A and D Garage",
  description: "The Asphalt & Dirt crew app: events, Tailgate, photos and the team's own tools.",
  robots: { index: false, follow: false },
};

const ERRORS: Record<string, string> = {
  not_invited: "That Google account isn't on the crew list. Use the address Jose invited, or ask him to add you.",
  cancelled: "Sign-in was cancelled.",
  failed: "Something went wrong signing in. Try again.",
  setup: "The Garage isn't set up on this site yet.",
};

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export default async function GaragePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const session = await getSession();

  if (!session) {
    return (
      <div className="garage-signin">
        <div className="garage-signin-card">
          <span className="garage-wordmark">Garage</span>
          <p className="garage-signin-lead">Events, Tailgate, photos and the crew&apos;s own tools — all in one place.</p>
          {error && <p className="garage-error" role="alert">{ERRORS[error] || ERRORS.failed}</p>}
          {isGarageConfigured() ? (
            <a className="btn btn-primary garage-google" href="/api/auth/google">
              <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
                <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.6z" />
                <path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3C3.7 21.4 7.6 24 12 24z" />
                <path fill="#FBBC05" d="M5.6 14.7a7.2 7.2 0 0 1 0-4.6v-3H1.8a12 12 0 0 0 0 10.6l3.8-3z" />
                <path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.2 15.1 0 12 0 7.6 0 3.7 2.6 1.8 6.1l3.8 3C6.5 6.7 9 4.8 12 4.8z" />
              </svg>
              Continue with Google
            </a>
          ) : (
            <p className="garage-error">Sign-in isn&apos;t switched on for this site yet.</p>
          )}
          <p className="garage-signin-note">Invite only. Ask Jose if you need access.</p>
        </div>
      </div>
    );
  }

  const today = todayNY();
  const thisWeek = weekOf(today);
  const [events, allTasks] = await Promise.all([
    getPublishedEvents().catch(() => ({ upcoming: [], past: [] })),
    getTasksFor(session.email).catch(() => []),
  ]);
  // This week's work plus anything still open from before — nothing quietly
  // disappears just because the week rolled over.
  const tasks = allTasks.filter((t) => (t.due ? weekOf(t.due) <= thisWeek : true) && (!t.done || t.due >= today));
  const nextEvent = events.upcoming[0];
  const firstName = session.name.split(" ")[0] || "there";

  // `href: null` = built next; the tile shows "Coming soon" instead of leading
  // to a dead page.
  const tiles: { href: string | null; label: string; sub: string; img: string }[] = [
    { href: "/garage/events", label: "Events", sub: "Going, details, meetup spot", img: "/img/garage/tile-events.jpg" },
    ...(canRunEvents(session)
      ? [{ href: "/garage/tailgate", label: "Tailgate", sub: "Run the event chat", img: "/img/garage/tile-tailgate.jpg" }]
      : []),
    { href: "/garage/media", label: "Media", sub: "Star the good ones, flag the rest", img: "/img/garage/tile-media.jpg" },
    { href: null, label: "Crew", sub: "Your code, links and profile", img: "/img/garage/tile-crew.jpg" },
    ...(canSeeOwnerOnly(session)
      ? [{ href: null, label: "Team", sub: "Owners only", img: "/img/garage/tile-team.jpg" }]
      : []),
  ];

  return (
    <div className="garage">
      <header className="garage-header">
        <span className="garage-wordmark small">Garage</span>
        <div className="garage-who">
          {session.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.photoUrl} alt="" className="garage-avatar" />
          )}
          <span>{session.name}</span>
          <form action="/api/auth/signout" method="post">
            <button type="submit" className="garage-signout">Sign out</button>
          </form>
        </div>
      </header>

      <div className="garage-body">
        <h1 className="garage-hi">Hey {firstName}.</h1>

        {nextEvent ? (
          <Link href={`/garage/events/${nextEvent.slug}`} className="garage-next">
            <span className="garage-next-label">Next up</span>
            <strong>{nextEvent.title}</strong>
            <span className="garage-next-date">{formatDate(nextEvent.date)}{nextEvent.generalArea ? ` · ${nextEvent.generalArea}` : ""}</span>
          </Link>
        ) : (
          <p className="garage-empty">No events on the calendar yet.</p>
        )}

        <h2 className="garage-section">Your week</h2>
        <GarageTaskList tasks={tasks} today={today} />

        <h2 className="garage-section">The Garage</h2>
        <div className="garage-tiles">
          {tiles.map((tile) =>
            tile.href ? (
              <Link key={tile.label} href={tile.href} className="garage-tile" style={{ backgroundImage: `url(${tile.img})` }}>
                <span className="garage-tile-label">{tile.label}</span>
                <span className="garage-tile-sub">{tile.sub}</span>
              </Link>
            ) : (
              <div key={tile.label} className="garage-tile is-soon" style={{ backgroundImage: `url(${tile.img})` }}>
                <span className="garage-tile-label">{tile.label}</span>
                <span className="garage-tile-sub">{tile.sub}</span>
                <span className="garage-soon">Coming soon</span>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
