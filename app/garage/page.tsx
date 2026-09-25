import type { Metadata } from "next";
import Link from "next/link";
import { getSession, isGarageConfigured, canRunEvents, canSeeOwnerOnly } from "@/lib/garageAuth";
import { canSeeControlRoom } from "@/lib/garageControl";
import { canSeeFinance } from "@/lib/garageFinance";
import { getCrewEvents, getRsvpSummaries } from "@/lib/events";
import { crewPicture, getEventResponses } from "@/lib/garageEvents";
import GarageTaskList from "@/components/GarageTaskList";
import { getTasksFor, todayNY, weekOf } from "@/lib/garageTasks";
import GarageReminders from "@/components/GarageReminders";
import { getDueReminders } from "@/lib/garageReminders";
import GaragePlan from "@/components/GaragePlan";
import { getPlan } from "@/lib/garagePlan";

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
  // Everything that doesn't depend on anything else goes in ONE wave. Each
  // Airtable round trip is ~250 ms, and this screen is opened dozens of times a
  // day on a phone — the posting fetch used to wait for the first three to
  // finish for no reason, which is a quarter of a second of nothing, every time.
  // Only the head count below genuinely has to wait (it needs the event id).
  const [events, allTasks, reminders, plan] = await Promise.all([
    getCrewEvents().catch(() => ({ upcoming: [], past: [] })),
    getTasksFor(session.email).catch(() => []),
    getDueReminders(session.email, canSeeOwnerOnly(session)).catch(() => []),
    // The Planning Calendar: owners for now (Jose + Anthony). The crew and
    // ambassadors get their own view later, once what they see is decided.
    canSeeOwnerOnly(session) ? getPlan(today).catch(() => null) : Promise.resolve(null),
  ]);
  // The head count everyone asks about first, on the card they already look at.
  const [rsvps, crewGoing] = events.upcoming[0]
    ? await Promise.all([
        // Crew rides take no RSVPs, so there's no count to show.
        events.upcoming[0].crewOnly
          ? Promise.resolve(null)
          : getRsvpSummaries([events.upcoming[0].id])
              .then((m) => m.get(events.upcoming[0].id)?.count ?? null)
              .catch(() => null),
        getEventResponses([events.upcoming[0].slug])
          .then((r) => crewPicture([], r, events.upcoming[0].slug).going.length)
          .catch(() => 0),
      ])
    : [null, 0];
  // This week's work plus anything still open from before — nothing quietly
  // disappears just because the week rolled over.
  const tasks = allTasks.filter((t) => (t.due ? weekOf(t.due) <= thisWeek : true) && (!t.done || t.due >= today));
  const nextEvent = events.upcoming[0];
  const firstName = session.name.split(" ")[0] || "there";

  // `href: null` = built next; the tile shows "Coming soon" instead of leading
  // to a dead page.
  const tiles: { href: string | null; label: string; sub: string; img: string }[] = [
    { href: "/garage/events", label: "Events", sub: "Going, details, meetup spot", img: "/img/garage/tile-events.webp" },
    ...(canRunEvents(session)
      ? [{ href: "/garage/tailgate", label: "Tailgate", sub: "Run the event chat", img: "/img/garage/tile-tailgate.webp" }]
      : []),
    { href: "/garage/upload", label: "Upload", sub: "Photos, videos and vlogs to Drive", img: "/img/garage/tile-upload.webp" },
    { href: "/garage/media", label: "Media", sub: "Star the good ones, flag the rest", img: "/img/garage/tile-media.webp" },
    // No tile art of its own yet, so it borrows Media's until there is some.
    { href: "/garage/library", label: "Library", sub: "Find any clip, save it to your phone", img: "/img/garage/tile-library.webp" },
    { href: "/garage/crew", label: "Crew", sub: "Your code, links and profile", img: "/img/garage/tile-crew.webp" },
    ...(canSeeOwnerOnly(session)
      ? [
          { href: "/garage/team", label: "Team", sub: "Everyone's week, the review queue", img: "/img/garage/tile-team.webp" },
          { href: "/garage/social", label: "Posting", sub: "This week's social posts", img: "/img/garage/tile-posting.webp" },
          { href: "/garage/replies", label: "X Replies", sub: "Posts worth replying to, twice a day", img: "/img/garage/tile-replies.webp" },
          { href: "/garage/comments", label: "Comments", sub: "Questions and debates from YouTube", img: "/img/garage/tile-comments.webp" },
          { href: "/garage/applications", label: "Applications", sub: "Crew applicants: hold, accept, decline", img: "/img/garage/tile-applications.webp" },
          { href: "/garage/review", label: "Review", sub: "Builds, reviews, what the site features", img: "/img/garage/tile-review.webp" },
          { href: "/garage/studio", label: "Studio", sub: "Video ideas, episodes, guests, sponsors", img: "/img/garage/tile-studio.webp" },
          { href: "/garage/newsletter", label: "Newsletter", sub: "This week's Dirt Line: fill, test, send", img: "/img/garage/tile-newsletter.webp" },
        ]
      : []),
    ...(canSeeFinance(session)
      ? [{ href: "/garage/finance", label: "Finance", sub: "Money in and out, P&L, who owes whom", img: "/img/garage/tile-finance.webp" }]
      : []),
    ...(canSeeControlRoom(session)
      ? [{ href: "/garage/control", label: "Control Room", sub: "Is it all running, and what needs you", img: "/img/garage/tile-control.webp" }]
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
            {rsvps !== null && (
              <span className="garage-next-rsvp">
                {rsvps} RSVP{rsvps === 1 ? "" : "s"} · {crewGoing} crew going · See who&apos;s coming →
              </span>
            )}
          </Link>
        ) : (
          <p className="garage-empty">No events on the calendar yet.</p>
        )}

        {plan && (
          <>
            <h2 className="garage-section">Plan</h2>
            <GaragePlan plan={plan} me={session.email.trim().toLowerCase()} />
          </>
        )}

        <h2 className="garage-section">Your week</h2>
        <GarageTaskList tasks={tasks} today={today} />

        <h2 className="garage-section">Reminders</h2>
        <GarageReminders reminders={reminders} today={today} />

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
