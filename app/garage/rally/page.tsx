import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import { AdjustForm, ClaimButtons, SweepButton } from "@/components/GarageRallyActions";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { rallyLive, allStandings, boardName, isRallyConfigured, listClaims, listRiders } from "@/lib/rally";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Rally Rewards · A and D Garage",
  robots: { index: false, follow: false },
};

/** Owners only: claims to fulfil, every rider's points, adjustments. */
export default async function GarageRallyPage() {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeOwnerOnly(session)) redirect("/garage");

  if (!isRallyConfigured()) {
    return (
      <div className="garage">
        <GarageBack title="Rally Rewards" />
        <div className="garage-body">
          <p className="garage-empty">The Rally Rewards base isn&apos;t connected.</p>
        </div>
      </div>
    );
  }

  const [claims, riders, standings] = await Promise.all([listClaims(), listRiders(), allStandings()]);
  const open = claims.filter((c) => c.status === "New" || c.status === "In progress");
  const rows = [...riders.values()]
    .filter((r) => !r.founder)
    .map((r) => ({ r, s: standings.get(r.email) }))
    .sort((a, b) => (b.s?.lifetime || 0) - (a.s?.lifetime || 0));

  return (
    <div className="garage">
      <GarageBack title="Rally Rewards" />
      <div className="garage-body">
        <section className="garage-panel">
          <h2>Status</h2>
          <p>
            {rallyLive() ? "Live: riders see it in emails and on the site." : "Not launched: points are counted, but no email mentions it and /rally is link-only."}{" "}
            <Link href="/rally">Open /rally</Link>
          </p>
          <SweepButton />
          <p className="garage-form-note">
            Counts every day at 12:30 PM. Rank-ups push here so you can celebrate them in the FB Group (rank squares: Drive → 8. Events Page → Trail Rating → Rally Rewards marks → social).
          </p>
        </section>

        <h2 className="garage-section">Claims to fulfil ({open.length})</h2>
        <div className="garage-panel">
          {claims.length === 0 ? (
            <p className="garage-empty">No claims yet.</p>
          ) : (
            <ul className="garage-tasks">
              {claims.slice(0, 40).map((c) => (
                <li key={c.id} className={c.status === "Done" || c.status === "Cancelled" ? "garage-task is-done" : "garage-task"}>
                  <span className="garage-task-main">
                    <span className="garage-task-title">
                      {c.item}
                      {c.choice ? ` (${c.choice})` : ""}
                      {c.size ? ` · ${c.size}` : ""} · {c.points} pts
                    </span>
                    <span className="garage-form-note">
                      {c.email} · {c.status}
                    </span>
                  </span>
                  <ClaimButtons id={c.id} status={c.status} />
                </li>
              ))}
            </ul>
          )}
          <p className="garage-form-note">Gear: make a one-time 100%-off code in Fourthwall for that item (shipping not covered) and email it. Experience: reach out and set it up.</p>
        </div>

        <h2 className="garage-section">Riders ({rows.length})</h2>
        <div className="garage-panel">
          {rows.length === 0 ? (
            <p className="garage-empty">Nobody yet. Riders appear from the Mud Run on.</p>
          ) : (
            <ul className="garage-tasks">
              {rows.map(({ r, s }) => (
                <li key={r.id} className="garage-task">
                  <span className="garage-task-main">
                    <span className="garage-task-title">
                      {boardName(r) || r.email} · {s?.rank || "Rookie"}
                    </span>
                    <span className="garage-form-note">
                      {r.email} · {s?.balance ?? 0} to spend · {s?.lifetime ?? 0} lifetime
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <h2 className="garage-section">Add or take points</h2>
        <div className="garage-panel">
          <AdjustForm />
          <p className="garage-form-note">For a walk-up recorded late, or a correction. A no-show at an event without Tailgate: tick No Show on their RSVP in Airtable instead.</p>
        </div>
      </div>
    </div>
  );
}
