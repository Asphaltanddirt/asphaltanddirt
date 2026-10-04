/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import HeroCTAButton from "@/components/HeroCTAButton";
import { getRiderEmail } from "@/lib/rallyAuth";
import { RallyClaim, RallyProfile, RallySignIn, RallySignOut } from "@/components/RallyAccount";
import RallyLocker from "@/components/RallyLocker";
import {
  rallyLive,
  RANKS,
  POINTS,
  boardName,
  getBoard,
  getRider,
  getShelf,
  getStanding,
  isAdult,
  isRallyConfigured,
  type BoardRow,
  type Standing,
} from "@/lib/rally";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Rally Rewards",
    description: "Show up, earn Rally Points, trade them for gear you can't buy. Everyone starts out a Rookie, but around here, legends are made, not bought.",
    // Until launch (rallyLive) the page works by direct link only.
    robots: rallyLive() ? undefined : { index: false, follow: false },
  };
}

const RANK_FILE: Record<string, string> = { Rookie: "01-rookie", Regular: "02-regular", Mainstay: "03-mainstay", Legend: "04-legend" };
const LEGEND_MIN = RANKS[RANKS.length - 1].min;
/** A leaderboard: top 5, the rest behind "Show everyone" (Jose 10/4). */
const BOARD_TOP = 5;

/** Every way to earn, lowest to highest (Jose 10/4). */
const EARN = [
  { big: `+${POINTS.headStart}`, label: "Signing up", sub: "The day you join." },
  { big: `+${POINTS.birthday}`, label: "Birthday month", sub: "Every year." },
  { big: `+${POINTS.order}`, label: "A store order", sub: "Once a month." },
  { big: `+${POINTS.event}`, label: "Every A&D event", sub: "Asphalt or dirt. Check in." },
  { big: `+${POINTS.special}`, label: "Special events", sub: "The big ones count double." },
];

function fmtDate(d: string) {
  if (!d) return "";
  return new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function initials(name: string) {
  return name.replace(/\./g, "").split(/\s+/).map((p) => p.charAt(0)).join("").slice(0, 2).toUpperCase();
}

function BoardRows({ rows, start }: { rows: BoardRow[]; start: number }) {
  return (
    <table className="rally-board">
      <colgroup>
        <col />
        <col className="rally-col-rank" />
        <col className="rally-col-pts" />
      </colgroup>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.name}-${start + i}`}>
            <td>
              <span className="pos">{String(start + i + 1).padStart(2, "0")}</span>
              <span className="who">{r.name}</span>
            </td>
            <td className="rank">
              {r.rank === "Founder" ? <strong>FOUNDER</strong> : <img src={`/rally/compact-${RANK_FILE[r.rank]}.svg`} alt={r.rank} />}
            </td>
            <td className="pts">{r.rank === "Founder" ? "" : r.lifetime}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function RallyPage({ searchParams }: { searchParams: Promise<{ signin?: string }> }) {
  const { signin } = await searchParams;
  const configured = isRallyConfigured();
  const email = await getRiderEmail();
  const [locker, board, rider, standing] = await Promise.all([
    configured ? getShelf().catch(() => []) : [],
    configured ? getBoard().catch(() => ({ founders: [], riders: [] })) : { founders: [], riders: [] },
    email && configured ? getRider(email).catch(() => null) : null,
    email && configured ? getStanding(email).catch(() => null) : (null as Standing | null),
  ]);
  const signedIn = Boolean(email && rider && standing && !rider.founder);
  // Shelf photos win; until the Fourthwall products exist, Robin's shots stand in (Jose 10/4).
  const fallbackPhoto = (item: string, type: string) =>
    type === "Experience" ? "/rally/locker-experience.webp" : /hoodie/i.test(item) ? "/rally/locker-rank-hoodie.webp" : /tee|shirt/i.test(item) ? "/rally/locker-rank-tee.webp" : "/rally/locker-tumbler.webp";
  const lockerItems = locker.map((i) => ({ id: i.id, item: i.item, points: i.points, blurb: i.blurb, image: i.image || fallbackPhoto(i.item, i.type), experience: i.type === "Experience" }));
  const everyone = [...board.founders, ...board.riders];
  const top = everyone.slice(0, BOARD_TOP);
  const rest = everyone.slice(BOARD_TOP);
  const legends = board.riders.filter((r) => r.rank === "Legend");

  return (
    <>
      <section className="hero rally-hero">
        <img src="/rally/hero.webp" className="hero-bg" alt="Riders hanging out at sunset by their street cars and muddy 4x4s, parked side by side" />
        <div className="hero-scrim" />
        <div className="container hero-inner">
          <div className="hero-content">
            <h1 style={{ margin: 0 }}>
              <img src="/rally/rally-rewards.svg" className="rally-hero-mark" alt="Rally Rewards by Asphalt & Dirt. Earned. Not given." />
            </h1>
            <p className="lead mt-4">
              We&apos;re keeping score, because here, points are earned, not given. Show up, be a part of the community, support each other, and we&apos;ll move you up the ranks. Everyone starts out a Rookie, but around here, legends are made, not bought.
            </p>
            <HeroCTAButton href="#board" label={signedIn ? "My Points" : "See My Points"} />
          </div>
        </div>
      </section>

      {/* Ranks, then how you earn, then the board: one run, no headings needed. */}
      <section className="section-pt-tight section-pb-tight">
        <div className="container">
          <div className="grid grid-4">
            {RANKS.map((r) => (
              <div className="card rally-rank-card" key={r.name}>
                <img src={`/rally/${RANK_FILE[r.name]}.svg`} alt={r.name} />
                <p>{r.min === 0 ? "Where everyone starts" : `${r.min} lifetime points`}</p>
              </div>
            ))}
          </div>

          <div className="rally-earn-strip mt-4" aria-label="How you earn Rally Points">
            {EARN.map((e) => (
              <div className="rally-earn-item" key={e.label}>
                <div className="rally-big">{e.big}</div>
                <strong>{e.label}</strong>
                <span>{e.sub}</span>
              </div>
            ))}
          </div>
          <p className="rally-note">Points never expire. Spending them never lowers your rank.</p>

          <div className="rally-board-head" id="board">
            <div>
              <div className="eyebrow">The Community, Showing Up.</div>
              <h2 className="rally-board-title">Points Board</h2>
            </div>
            {signedIn && rider && standing ? (
              <a href="#account" className="rally-me">
                <span className="rally-me-name">{boardName(rider) || "You"}</span>
                <img src={`/rally/compact-${RANK_FILE[standing.rank]}.svg`} alt={standing.rank} />
                <span className="rally-me-pts">{standing.balance} pts</span>
                <span className="rally-me-next">{standing.next ? `${standing.next.need} to ${standing.next.name}` : "Top rank"} ↓</span>
              </a>
            ) : email && rider?.founder ? (
              <div className="rally-me">
                <span className="rally-me-name">You run this.</span>
                <RallySignOut />
              </div>
            ) : (
              <RallySignIn expired={signin === "expired"} />
            )}
          </div>

          <div className="rally-panel-board">
            {everyone.length === 0 ? (
              <p className="rally-board-empty">The board fills up after our next event. Your name could be first.</p>
            ) : (
              <>
                <div className="rally-board-labels" aria-hidden="true">
                  <span>Member</span>
                  <span>Rank</span>
                  <span>Lifetime Points</span>
                </div>
                <BoardRows rows={top} start={0} />
                {rest.length > 0 && (
                  <details className="rally-board-more">
                    <summary>
                      <span className="rally-more-closed">Show everyone ({everyone.length})</span>
                      <span className="rally-more-open">Show top {BOARD_TOP}</span>
                    </summary>
                    <BoardRows rows={rest} start={BOARD_TOP} />
                  </details>
                )}
              </>
            )}
          </div>
          <p className="rally-note">
            First name and last initial only. Don&apos;t want to be on it? Sign in and tick &ldquo;Keep me off the points board.&rdquo;
          </p>
        </div>
      </section>

      <section className="section-alt section-pt-tight section-pb-tight rally-locker-section" id="locker">
        <div className="container">
          <h2 className="rally-tagline">
            <span>Earned.</span> <span className="accent-text">Not Given.</span>
          </h2>
          <p className="rally-tagline-sub">Show up. Put in the work. Take from the Locker.</p>
          <RallyLocker items={lockerItems} />
        </div>
      </section>

      {signedIn && rider && standing && (
        <section className="section-pt-tight section-pb-tight" id="account">
          <div className="container">
            <div className="eyebrow accent">Your Account</div>
            <h2 className="mt-2 mb-0">{boardName(rider) || "Your Points"}</h2>
            <div className="grid grid-2 mt-4" style={{ alignItems: "start" }}>
              <div className="card rally-panel">
                <div className="eyebrow">Claim From The Locker</div>
                <div className="mt-2">
                  <RallyClaim
                    items={locker.map((i) => ({ id: i.id, item: i.item, points: i.points, type: i.type, sizes: i.sizes }))}
                    balance={standing.balance}
                    rank={standing.rank}
                    canClaim={isAdult(rider)}
                  />
                </div>
              </div>
              <div className="card rally-panel">
                <div className="eyebrow">Your Details</div>
                <div className="mt-2">
                  <RallyProfile
                    firstName={rider.firstName}
                    lastName={rider.lastName}
                    birthMonth={rider.birthMonth}
                    birthYear={rider.birthYear}
                    boardOptOut={rider.boardOptOut}
                  />
                </div>
              </div>
            </div>
            {standing.entries.some((e) => e.points !== 0) && (
              <details className="legal-full mt-4">
                <summary>Points history</summary>
                <div className="legal-full-body">
                  <table className="rally-board">
                    <tbody>
                      {standing.entries
                        .filter((e) => e.points !== 0)
                        .map((e) => (
                          <tr key={e.key}>
                            <td className="who">{e.label}</td>
                            <td style={{ color: "var(--text-dim)" }}>{fmtDate(e.date)}</td>
                            <td className="pts" style={{ color: e.points > 0 ? "var(--accent)" : "var(--text-muted)" }}>
                              {e.points > 0 ? "+" : ""}
                              {e.points}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
            <div className="mt-4">
              <RallySignOut />
            </div>
          </div>
        </section>
      )}

      <section className="hero rally-legends" id="legends">
        <img src="/rally/legends.webp" className="hero-bg" alt="A muddy rider smiling next to his built 4x4 at sunset" />
        <div className="hero-scrim" />
        <div className="container hero-inner">
          <div className="rally-legends-copy">
            <div className="eyebrow accent">A Place In The Story.</div>
            <h2 className="rally-legends-title mt-2">
              Legends Are Made,
              <br />
              <span className="accent-text">Not Bought.</span>
            </h2>
            <p className="lead mt-2">
              {LEGEND_MIN} lifetime points. Every Legend gets their story told here: the interview, the rig, the rides that got them there.
            </p>
            <div className="rally-legend-slots mt-4">
              {legends.length === 0 ? (
                <div className="rally-legend-card rally-legend-open">
                  <div className="rally-legend-media">
                    <span className="rally-slashes" aria-hidden="true">
                      <i /><i /><i /><i />
                    </span>
                  </div>
                  <div className="rally-legend-body">
                    <div className="eyebrow">Legend No. 01</div>
                    <h3>This Spot&apos;s Open.</h3>
                    <p>The first one gets the interview.</p>
                  </div>
                </div>
              ) : (
                legends.map((l, i) => (
                  <div className="rally-legend-card" key={l.name}>
                    <div className="rally-legend-media">
                      <span className="rally-initials" aria-hidden="true">{initials(l.name)}</span>
                    </div>
                    <div className="rally-legend-body">
                      <div className="eyebrow">Legend No. {String(i + 1).padStart(2, "0")}</div>
                      <h3>{l.name}</h3>
                      <p>{l.lifetime} lifetime points · interview coming</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section-pt-tight section-pb-tight">
        <div className="container" style={{ textAlign: "center" }}>
          <Link href="/rally/rules" className="view-all">
            The Rules
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
        </div>
      </section>
    </>
  );
}
