import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageSwitch from "@/components/GarageSwitch";
import { getSession, listGarageUsers } from "@/lib/garageAuth";
import { canSeeControlRoom, getControlRoom } from "@/lib/garageControl";
import { getWeekTasks, todayNY } from "@/lib/garageTasks";
import { getAutoPostSwitch, platformReady } from "@/lib/autoPost";
import { AUTO_PLATFORMS } from "@/lib/socialCopy";
import { isReplySearchOn } from "@/lib/replyQueue";
import { isThreadsConnected } from "@/lib/threadsPost";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Control Room · A and D Garage",
  robots: { index: false, follow: false },
};

const OWNER_LINKS = [
  { label: "Airtable", href: "https://airtable.com" },
  { label: "Vercel", href: "https://vercel.com/team-1121/asphaltanddirt" },
  { label: "A&D Trail Runs (Drive)", href: "https://drive.google.com/drive/folders/0AKXjKBxcWmfuUk9PVA" },
  { label: "Fourthwall", href: "https://fourthwall.com" },
  { label: "Resend", href: "https://resend.com/emails" },
  { label: "YouTube Studio", href: "https://studio.youtube.com" },
  { label: "Search Console", href: "https://search.google.com/search-console" },
];

function ago(ms: number) {
  const minutes = Math.round((Date.now() - ms) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function Cell({
  label,
  value,
  detail,
  health,
  href,
}: {
  label: string;
  value: string;
  detail: string;
  health: "ok" | "warn" | "off" | "live";
  href?: string;
}) {
  const inner = (
    <>
      <span className="control-cell-label">
        <span className={`control-dot is-${health}`} aria-hidden="true" />
        {label}
      </span>
      <strong className="control-cell-value">{value}</strong>
      <span className="control-cell-detail">{detail}</span>
    </>
  );
  return href ? (
    <Link href={href} className="control-cell">
      {inner}
    </Link>
  ) : (
    <div className="control-cell">{inner}</div>
  );
}

export default async function ControlRoomPage({ searchParams }: { searchParams: Promise<{ threads?: string }> }) {
  const { threads: threadsMsg } = await searchParams;
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeControlRoom(session)) redirect("/garage");

  const today = todayNY();
  const [room, people, tasks, autoPost] = await Promise.all([
    getControlRoom(),
    listGarageUsers().catch(() => []),
    getWeekTasks().catch(() => []),
    getAutoPostSwitch().catch(() => null),
  ]);
  const replySearch = await isReplySearchOn().catch(() => null);
  const threadsConnected = await isThreadsConnected().catch(() => false);
  const autoReady = AUTO_PLATFORMS.map((p) => ({ platform: p, ready: platformReady(p) }));

  const { site, deploy, event, tailgate, queues, audience, store, systems } = room;
  const waiting = [
    { label: "Crew applications", count: queues.applications, href: "/garage/applications", external: false },
    { label: "Builds to approve", count: queues.builds, href: "/garage/review/builds", external: false },
    { label: "Reviews to approve", count: queues.reviews, href: "/garage/review/reviews", external: false },
    { label: "Flagged photos", count: queues.flagged, href: "/garage/media", external: false },
  ];
  const total = waiting.reduce((sum, row) => sum + (row.count || 0), 0);
  const broken = systems.filter((s) => s.health !== "ok");

  return (
    <div className="garage">
      <GarageBack title="Control Room" />
      <div className="garage-body">
        <h2 className="garage-section">Right now</h2>
        <div className="control-board">
          <Cell
            label="Site"
            value={site.ok ? "Up" : "Down"}
            detail={site.ok ? `Answered in ${site.ms} ms` : "No answer — check Vercel"}
            health={site.ok ? "ok" : "off"}
          />
          <Cell
            label="Last deploy"
            value={deploy ? (deploy.state === "READY" ? "Live" : deploy.state.toLowerCase()) : "—"}
            detail={deploy ? `${ago(deploy.at)}${deploy.message ? ` · ${deploy.message}` : ""}` : "Vercel not connected"}
            health={!deploy ? "off" : deploy.state === "READY" ? "ok" : deploy.state === "ERROR" ? "off" : "warn"}
          />
          <Cell
            label="Next event"
            value={
              event
                ? event.daysOut === 0
                  ? "Today"
                  : event.daysOut === 1
                    ? "Tomorrow"
                    : `${event.daysOut} days`
                : "None"
            }
            detail={event ? `${event.title} · ${event.rsvps ?? "–"} RSVP${event.rsvps === 1 ? "" : "s"} · ${event.crewGoing} crew` : "Nothing on the calendar"}
            health={event ? (event.daysOut <= 3 ? "live" : "ok") : "warn"}
            href={event ? `/garage/events/${event.slug}` : undefined}
          />
          <Cell
            label="Tailgate"
            value={tailgate ? tailgate.state : "Not set up"}
            detail={
              tailgate
                ? `${tailgate.signedUp ?? 0} signed up · ${tailgate.checkedIn ?? 0} checked in`
                : "No Tailgate row for the next event"
            }
            health={!tailgate ? "warn" : tailgate.state === "Open" || tailgate.state === "On trail" ? "live" : tailgate.state === "Off" ? "off" : "ok"}
            href={tailgate ? "/garage/tailgate" : undefined}
          />
          <Cell
            label="Store · 7 days"
            value={store ? String(store.orders) : "—"}
            detail={store ? `$${store.revenue.toFixed(2)} in orders` : "Order reporting is off"}
            health={store ? "ok" : "off"}
          />
          <Cell
            label="Lists"
            value={audience.newsletter !== null ? String(audience.newsletter) : "—"}
            detail={`newsletter · ${audience.eventUpdates ?? "–"} on event updates`}
            health={audience.newsletter !== null ? "ok" : "off"}
          />
        </div>

        <h2 className="garage-section">Waiting on you</h2>
        <div className="garage-panel">
          {total === 0 ? (
            <p className="garage-empty">Nothing in the queue. All clear.</p>
          ) : (
            <ul className="control-queue">
              {waiting
                .filter((row) => (row.count || 0) > 0)
                .map((row) =>
                  row.external ? (
                    <li key={row.label}>
                      <a href={row.href} target="_blank" rel="noopener">
                        <span className="control-count">{row.count}</span> {row.label} ↗
                      </a>
                    </li>
                  ) : (
                    <li key={row.label}>
                      <Link href={row.href}>
                        <span className="control-count">{row.count}</span> {row.label}
                      </Link>
                    </li>
                  ),
                )}
            </ul>
          )}
          {waiting.some((row) => row.count === null) && (
            <p className="garage-form-note">A dash means that base didn&apos;t answer — it doesn&apos;t mean zero.</p>
          )}
        </div>

        {event && (
          <>
            <h2 className="garage-section">Switches</h2>
            <div className="garage-panel">
              <h2>Tailgate · {event.title}</h2>
              <p>{tailgate ? tailgate.detail : "There's no Tailgate row for this event yet, so there's nothing to switch."}</p>
              {tailgate && (
                <>
                  {tailgate.state === "Off" ? (
                    <GarageSwitch
                      label="Switch Tailgate on"
                      armedLabel="Tap again to switch it on"
                      warning="Turns it back on for its own schedule. It still opens by itself the night before."
                      body={{ action: "tailgate-open", slug: tailgate.slug }}
                    />
                  ) : (
                    <GarageSwitch
                      label="Switch Tailgate off"
                      armedLabel="Tap again to switch it off"
                      warning="Nobody can get into the chat while it's off, including people already in it. The reminder email won't go out either."
                      body={{ action: "tailgate-close", slug: tailgate.slug }}
                      danger
                    />
                  )}
                  {tailgate.state === "Armed" && (
                    <GarageSwitch
                      label="Open it now"
                      armedLabel="Tap again to open it now"
                      warning="Starts the 48-hour window from this moment and skips the reminder email — only do this if you're opening early on purpose."
                      body={{ action: "tailgate-open", slug: tailgate.slug }}
                    />
                  )}
                </>
              )}
            </div>
          </>
        )}

        {event && (
          <div className="garage-panel">
            <h2>Crew answers</h2>
            <p>
              <strong>{event.crewGoing}</strong> going · <strong>{event.crewSilent}</strong> haven&apos;t answered
            </p>
            <p className="garage-form-note">Everyone sees the event on their own Garage home screen.</p>
          </div>
        )}

        <h2 className="garage-section">Auto-posting</h2>
        <div className="garage-panel">
          <h2>{autoPost?.on ? "On: approved posts go out on their own" : "Off: approved posts are only dry-run"}</h2>
          <p>
            {autoReady.map((r, i) => (
              <span key={r.platform}>
                {i > 0 && " · "}
                {r.platform} {r.ready ? "ready" : "needs its keys"}
              </span>
            ))}
          </p>
          {autoPost?.changedBy && (
            <p className="garage-form-note">
              Last changed by {autoPost.changedBy.split(" ")[0]}
              {autoPost.changedAt &&
                ` · ${new Date(autoPost.changedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })}`}
            </p>
          )}
          {!autoPost ? (
            <p className="garage-error">Couldn&apos;t read the switch.</p>
          ) : autoPost.on ? (
            <GarageSwitch
              label="Switch auto-posting off"
              armedLabel="Tap again to switch it off"
              warning="Approved posts stop going out and are only dry-run until you switch it back on. Anything already posted stays up."
              body={{ action: "autopost-off" }}
              danger
            />
          ) : (
            <GarageSwitch
              label="Switch auto-posting on"
              armedLabel="Tap again to switch it on"
              warning="Every approved post on the board goes out on its own at the start of its window, to the real accounts. Unapproved posts are never touched."
              body={{ action: "autopost-on" }}
            />
          )}
          <p>Threads: {threadsConnected ? "connected" : "not connected"}</p>
          <a className="btn btn-outline btn-sm" href="/api/threads/connect">
            {threadsConnected ? "Reconnect Threads" : "Connect Threads"}
          </a>
          {threadsMsg && <p className="garage-form-note" role="status">Threads: {threadsMsg}</p>}
          <p className="garage-form-note">
            Approve posts on the <Link href="/garage/social">posting board</Link>. TikTok (TikTok Studio) and the Facebook Group stay by hand.
          </p>
        </div>

        <div className="garage-panel">
          <h2>X reply search: {replySearch === null ? "—" : replySearch ? "on" : "off"}</h2>
          <p>
            Twice a day it finds posts worth replying to and puts them in <Link href="/garage/replies">Replies</Link>. It costs about
            $3 a month; it&apos;s a test until the podcast launches.
          </p>
          {replySearch !== null &&
            (replySearch ? (
              <GarageSwitch
                label="Switch reply search off"
                armedLabel="Tap again to switch it off"
                warning="Stops the searches (and their cost). The queue you already have stays."
                body={{ action: "replysearch-off" }}
                danger
              />
            ) : (
              <GarageSwitch
                label="Switch reply search on"
                armedLabel="Tap again to switch it on"
                warning="Runs twice a day, at about $0.05 a run."
                body={{ action: "replysearch-on" }}
              />
            ))}
        </div>

        <h2 className="garage-section">This week</h2>
        {people.map((person) => {
          const theirs = tasks.filter((t) => t.assignee === person.email);
          if (theirs.length === 0) return null;
          const done = theirs.filter((t) => t.done).length;
          return (
            <div key={person.id} className="garage-panel">
              <h2>
                {person.name || person.email} · {done} of {theirs.length} done
              </h2>
              <ul className="garage-tasks">
                {theirs.map((task) => (
                  <li key={task.id} className={task.done ? "garage-task is-done" : "garage-task"}>
                    <Link href={`/garage/tasks/${task.id}`} className="garage-task-main">
                      <span className="garage-task-title">{task.title}</span>
                    </Link>
                    <span className={!task.done && task.due < today ? "garage-task-when late" : "garage-task-when"}>
                      {task.done ? "Done" : task.due < today ? "Overdue" : task.due === today ? "Today" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        <h2 className="garage-section">Systems</h2>
        <div className="garage-panel">
          {broken.length === 0 && <p>Everything the site depends on is switched on.</p>}
          <ul className="control-systems">
            {systems.map((row) => (
              <li key={row.name} className={row.health === "ok" ? "" : "is-broken"}>
                <span className={`control-dot is-${row.health}`} aria-hidden="true" />
                <span className="control-system-name">{row.name}</span>
                <span className="control-system-note">{row.note}</span>
              </li>
            ))}
          </ul>
          <p className="garage-form-note">
            Keys live in Vercel and the Website APIs base — this only says whether each one is set.
          </p>
        </div>

        <h2 className="garage-section">Open somewhere else</h2>
        <div className="garage-panel">
          <p className="garage-links garage-links-wrap">
            {OWNER_LINKS.map((link) => (
              <a key={link.label} href={link.href} target="_blank" rel="noopener">
                {link.label} ↗
              </a>
            ))}
          </p>
        </div>
      </div>
    </div>
  );
}
