import type { Metadata } from "next";
import Link from "next/link";
import { getRiderEmail } from "@/lib/rallyAuth";
import { RallyClaim, RallyProfile, RallySignIn, RallySignOut } from "@/components/RallyAccount";
import {
  RALLY_LIVE,
  RANKS,
  POINTS,
  getBoard,
  getRider,
  getShelf,
  getStanding,
  isAdult,
  standingLine,
  isRallyConfigured,
  type Standing,
} from "@/lib/rally";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rally Rewards",
  description: "Show up, earn Rally Points, trade them for gear you can't buy. Everyone starts out a Rookie, but around here, legends are made, not bought.",
  // Until launch (RALLY_LIVE) the page works by direct link only.
  robots: RALLY_LIVE ? undefined : { index: false, follow: false },
};

const RANK_FILE: Record<string, string> = { Rookie: "01-rookie", Regular: "02-regular", Mainstay: "03-mainstay", Legend: "04-legend" };

function fmtDate(d: string) {
  if (!d) return "";
  return new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default async function RallyPage({ searchParams }: { searchParams: Promise<{ signin?: string }> }) {
  const { signin } = await searchParams;
  const configured = isRallyConfigured();
  const email = await getRiderEmail();
  const [shelf, board, rider, standing] = await Promise.all([
    configured ? getShelf().catch(() => []) : [],
    configured ? getBoard().catch(() => ({ founders: [], riders: [] })) : { founders: [], riders: [] },
    email && configured ? getRider(email).catch(() => null) : null,
    email && configured ? getStanding(email).catch(() => null) : (null as Standing | null),
  ]);
  const legends = board.riders.filter((r) => r.rank === "Legend");

  return (
    <>
      <section className="section-pt-tight">
        <div className="container" style={{ maxWidth: 820, marginInline: "auto" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rally/rally-rewards.svg" alt="Rally Rewards by Asphalt & Dirt. Earned. Not given." style={{ width: "100%", maxWidth: 640, height: "auto" }} />
          <p className="lead mt-2" style={{ maxWidth: "60ch" }}>
            We&apos;re keeping score, because here, points are earned, not given. Show up, be a part of the community, support each other, and we&apos;ll move you up the ranks. Everyone starts out a Rookie, but around here, legends are made, not bought.
          </p>
        </div>
      </section>

      {/* Your account */}
      <section className="section-pt-tight">
        <div className="container" style={{ maxWidth: 820, marginInline: "auto" }}>
          <div className="eyebrow accent">Your Rally Points</div>
          {!email || !rider || !standing ? (
            <div className="mt-2">
              <p>See your points, set your birthday and claim gear. No password: we email you a link.</p>
              <RallySignIn expired={signin === "expired"} />
            </div>
          ) : rider.founder ? (
            <div className="mt-2">
              <p>You&apos;re on the team that runs this. Nothing to earn here.</p>
              <RallySignOut />
            </div>
          ) : (
            <div className="mt-2" style={{ display: "grid", gap: "var(--sp-4)" }}>
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/rally/${RANK_FILE[standing.rank]}.svg`} alt={`Rank: ${standing.rank}`} style={{ width: "100%", maxWidth: 420, height: "auto" }} />
                <h2 className="mt-2">{standingLine(standing)}</h2>
                <p className="form-section-hint" style={{ marginTop: 4 }}>
                  Lifetime: {standing.lifetime} points. Spending never lowers your rank.
                </p>
              </div>

              <div>
                <h3>Your details</h3>
                <RallyProfile
                  firstName={rider.firstName}
                  lastName={rider.lastName}
                  birthMonth={rider.birthMonth}
                  birthYear={rider.birthYear}
                  boardOptOut={rider.boardOptOut}
                />
              </div>

              <div>
                <h3>Claim from the shelf</h3>
                <RallyClaim
                  items={shelf.map((i) => ({ id: i.id, item: i.item, points: i.points, type: i.type, sizes: i.sizes }))}
                  balance={standing.balance}
                  rank={standing.rank}
                  canClaim={isAdult(rider)}
                />
              </div>

              {standing.entries.length > 0 && (
                <div>
                  <h3>History</h3>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
                    {standing.entries
                      .filter((e) => e.points !== 0)
                      .map((e) => (
                        <li key={e.key} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 }}>
                          <span>
                            {e.label} <span style={{ color: "var(--text-dim)" }}>· {fmtDate(e.date)}</span>
                          </span>
                          <strong style={{ color: e.points > 0 ? "var(--accent)" : "var(--text-muted)" }}>
                            {e.points > 0 ? "+" : ""}
                            {e.points}
                          </strong>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              <div>
                <RallySignOut />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="section-pt-tight">
        <div className="container" style={{ maxWidth: 820, marginInline: "auto" }}>
          <div className="eyebrow accent">How you earn</div>
          <ul className="mt-2" style={{ lineHeight: 1.8 }}>
            <li>
              <strong>{POINTS.event} points</strong> for every A&amp;D event you come to, asphalt or dirt. Special events count double.
            </li>
            <li>
              <strong>{POINTS.headStart} points</strong> to start, {POINTS.birthday} in your birthday month, and {POINTS.order} for a store order (once a month).
            </li>
            <li>Points never expire.</li>
          </ul>

          <div className="eyebrow accent mt-4">The ranks</div>
          <p className="mt-2">Your rank comes from every point you&apos;ve ever earned.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--sp-3)", marginTop: "var(--sp-2)" }}>
            {RANKS.map((r) => (
              <div key={r.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/rally/${RANK_FILE[r.name]}.svg`} alt={r.name} style={{ width: "100%", height: "auto" }} />
                <p className="form-section-hint" style={{ marginTop: 4 }}>{r.min === 0 ? "Where everyone starts" : `${r.min} lifetime points`}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The shelf */}
      {shelf.length > 0 && (
        <section className="section-pt-tight">
          <div className="container" style={{ maxWidth: 820, marginInline: "auto" }}>
            <div className="eyebrow accent">The shelf</div>
            <p className="mt-2">Gear you can&apos;t buy. Rank gear: claim your rank or any below it.</p>
            <div className="grid mt-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              {shelf.map((i) => (
                <div className="card" key={i.id}>
                  {i.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.image} alt="" style={{ width: "100%", height: "auto", marginBottom: 8 }} />
                  )}
                  <h3>{i.item}</h3>
                  <p>
                    <strong style={{ color: "var(--accent)" }}>{i.points} points</strong>
                  </p>
                  {i.blurb && <p style={{ marginTop: 6 }}>{i.blurb}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Points board */}
      <section className="section-pt-tight">
        <div className="container" style={{ maxWidth: 820, marginInline: "auto" }}>
          <div className="eyebrow accent">Points board</div>
          {board.riders.length === 0 && board.founders.length === 0 ? (
            <p className="mt-2">The board fills up after our next event. Your name could be first.</p>
          ) : (
            <table className="mt-2" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", fontSize: 13, color: "var(--text-dim)" }}>
                  <th style={{ padding: "6px 0" }}>Rider</th>
                  <th style={{ padding: "6px 0" }}>Rank</th>
                  <th style={{ padding: "6px 0", textAlign: "right" }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {[...board.founders, ...board.riders].map((r) => (
                  <tr key={`${r.name}-${r.rank}`} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 0" }}>{r.name}</td>
                    <td style={{ padding: "10px 0" }}>
                      {r.rank === "Founder" ? (
                        <strong>FOUNDER</strong>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/rally/compact-${RANK_FILE[r.rank]}.svg`} alt={r.rank} style={{ height: 22, width: "auto", verticalAlign: "middle" }} />
                      )}
                    </td>
                    <td style={{ padding: "10px 0", textAlign: "right" }}>{r.rank === "Founder" ? "" : r.lifetime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="form-section-hint mt-2">First name and last initial only. Don&apos;t want to be on it? Sign in and tick &ldquo;Keep me off the points board&rdquo;.</p>
        </div>
      </section>

      {/* Legends */}
      <section className="section-pt-tight section-pb-tight">
        <div className="container" style={{ maxWidth: 820, marginInline: "auto" }}>
          <div className="eyebrow accent">Legends</div>
          {legends.length === 0 ? (
            <p className="mt-2">No Legends yet. The first one gets the interview.</p>
          ) : (
            <ul className="mt-2">
              {legends.map((l) => (
                <li key={l.name}>{l.name}</li>
              ))}
            </ul>
          )}
          <p className="mt-4">
            <Link href="/rally/rules">The rules</Link>
          </p>
        </div>
      </section>
    </>
  );
}
