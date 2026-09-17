import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageProfileForm from "@/components/GarageProfileForm";
import { getSession } from "@/lib/garageAuth";
import { getCrewMonths, getCrewProfile } from "@/lib/garageCrew";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Crew · A and D Garage",
  robots: { index: false, follow: false },
};

const money = (value: number) => `$${value.toFixed(2)}`;

export default async function GarageCrewPage() {
  const session = await getSession();
  if (!session) redirect("/garage");

  const profile = await getCrewProfile(session.email).catch(() => null);
  const months = profile ? await getCrewMonths(profile.id).catch(() => []) : [];

  return (
    <div className="garage">
      <GarageBack title="Crew" />
      <div className="garage-body">
        {!profile ? (
          <>
            <h1 className="garage-event-title">Crew</h1>
            <p className="garage-lead">
              This is where Road &amp; Trail Crew members find their code, link and earnings, and edit the
              bio that shows on the team page. Your account isn&apos;t linked to a crew record, so there&apos;s nothing
              here for you.
            </p>
          </>
        ) : (
          <>
            <h1 className="garage-event-title">{profile.name}</h1>
            <p className="garage-event-area">
              {[profile.tier, profile.status, profile.foundingCrew ? "Founding Crew" : ""].filter(Boolean).join(" · ")}
            </p>

            <section className="garage-panel">
              <h2>Your code</h2>
              {profile.promoCode ? (
                <>
                  <p className="garage-code">{profile.promoCode}</p>
                  {profile.commissionRate !== null && (
                    <p>You earn {Math.round(profile.commissionRate * 100)}% on orders that use it.</p>
                  )}
                </>
              ) : (
                <p>Your code isn&apos;t set up yet. Jose sets it once your agreement is signed.</p>
              )}
              {profile.trackingLink && (
                <p>
                  Your link: <a href={profile.trackingLink} target="_blank" rel="noopener">{profile.trackingLink.replace(/^https:\/\/www\./, "")}</a>
                  {" · "}
                  {profile.linkVisits === 1 ? "1 visit" : `${profile.linkVisits} visits`}. It applies your code at checkout, so
                  sales through it count too.
                </p>
              )}
              {!profile.agreementSigned && (
                <p>
                  <a href="/ambassadors/agreement" target="_blank" rel="noopener">Sign the crew agreement ↗</a> — your
                  code comes after that.
                </p>
              )}
            </section>

            <section className="garage-panel">
              <h2>Earnings</h2>
              {months.length === 0 ? (
                <p className="garage-empty">No months tracked yet.</p>
              ) : (
                <table className="garage-table">
                  <thead>
                    <tr>
                      <th scope="col">Month</th>
                      <th scope="col">Orders</th>
                      <th scope="col">You earned</th>
                      <th scope="col">Paid?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.map((m) => (
                      <tr key={m.month}>
                        <th scope="row">{m.month}</th>
                        <td>{m.orders}</td>
                        <td>{money(m.owed)}</td>
                        <td>{m.payoutStatus || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="garage-panel">
              <h2>Your build</h2>
              {profile.buildSlug ? (
                <p>
                  <a href={`/builds/${profile.buildSlug}`} target="_blank" rel="noopener">See your build page ↗</a>
                </p>
              ) : (
                <p>
                  <a href="/builds/submit" target="_blank" rel="noopener">Add your build ↗</a> — photos and mods, and
                  it gets the crew badge on the builds page.
                </p>
              )}
            </section>

            <section className="garage-panel">
              <h2>Your profile</h2>
              <GarageProfileForm
                initial={{
                  tagline: profile.tagline,
                  bio: profile.bio,
                  vehicle: profile.vehicle,
                  socials: profile.socials,
                }}
              />
            </section>
          </>
        )}

        {/* Always here, so an ambassador who lost the welcome email can still
            find the guide and media kit after signing in. */}
        <section className="garage-panel">
          <h2>Crew resources</h2>
          <p className="garage-links garage-links-wrap">
            <a href="/ambassadors/guide" target="_blank" rel="noopener">Crew Guide ↗</a>
            <a href="/ambassadors/media-kit" target="_blank" rel="noopener">Media Kit ↗</a>
            <a href="/ambassadors/agreement" target="_blank" rel="noopener">Agreement ↗</a>
          </p>
        </section>
      </div>
    </div>
  );
}
