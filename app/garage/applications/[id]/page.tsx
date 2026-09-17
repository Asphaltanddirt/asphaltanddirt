import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageDecision from "@/components/GarageDecision";
import GarageOnboarding from "@/components/GarageOnboarding";
import { GarageInterview, GarageScoring } from "@/components/GarageScoring";
import { getAmbassadorRecord, toOnboarding } from "@/lib/ambassadorOnboarding";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { getApplication, suggestedBand } from "@/lib/garageApplications";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Application · A and D Garage",
  robots: { index: false, follow: false },
};

export default async function GarageApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeOwnerOnly(session)) redirect("/garage");

  const { id } = await params;
  const app = await getApplication(id).catch(() => null);
  if (!app) notFound();

  const accepted = app.decision === "Accept — Road & Trail Member";
  const ambassador = accepted && app.ambassadorId ? await getAmbassadorRecord(app.ambassadorId).catch(() => null) : null;

  const phoneDigits = app.phone.replace(/[^\d+]/g, "");

  return (
    <div className="garage">
      <GarageBack title="Application" back={{ href: "/garage/applications", label: "Applications" }} />
      <div className="garage-body">
        <div className="garage-app-head">
          {app.photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={app.photo} alt={`${app.name}'s photo`} className="garage-app-hero" />
          )}
          <div>
            <h1 className="garage-event-title">{app.name}</h1>
            <p className="garage-event-area">
              {[app.location, app.applied && `Applied ${new Date(`${app.applied}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric" })}`, app.score !== null && `Score ${app.score} (${suggestedBand(app.score).toLowerCase()})`]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="garage-links garage-links-wrap">
              {app.email && <a href={`mailto:${app.email}`}>{app.email}</a>}
              {phoneDigits && <a href={`tel:${phoneDigits}`}>{app.phone}</a>}
            </p>
          </div>
        </div>

        <section className="garage-panel">
          <h2>Score</h2>
          <GarageScoring id={app.id} initialScores={app.scores} initialNotes={app.reviewerNotes} />
        </section>

        <section className="garage-panel">
          <h2>Interview</h2>
          <GarageInterview id={app.id} initialDate={app.interviewDate} initialNotes={app.interviewNotes} />
        </section>

        <section className="garage-panel">
          <h2>Decision</h2>
          <GarageDecision id={app.id} current={app.decision} />
        </section>

        {accepted && (
          <section className="garage-panel">
            <h2>Onboarding</h2>
            {ambassador ? (
              <GarageOnboarding initial={toOnboarding(ambassador)} />
            ) : (
              <p className="garage-form-note">
                Airtable is still creating their Ambassador record. Pull down to refresh in a minute.
              </p>
            )}
          </section>
        )}

        <section className="garage-panel">
          <h2>Their application</h2>
          <dl className="garage-glance">
            {app.facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd style={{ whiteSpace: "pre-wrap" }}>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {app.buildPhotos.length > 0 && (
          <section className="garage-panel">
            <h2>Build photos</h2>
            <div className="garage-app-photos">
              {app.buildPhotos.map((src, i) => (
                <a key={i} href={src} target="_blank" rel="noopener">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Build photo ${i + 1}`} loading="lazy" />
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
