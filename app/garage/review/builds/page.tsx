import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageReviewActions from "@/components/GarageReviewActions";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { listBuildSubmissions, type BuildSubmission } from "@/lib/garageReview";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Builds · A and D Garage",
  robots: { index: false, follow: false },
};

const day = (iso: string) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");

function BuildCard({ b }: { b: BuildSubmission }) {
  return (
    <article className="garage-panel garage-review-card">
      {b.photos.length > 0 && (
        <div className="garage-review-photos">
          {b.photos.map((p, i) => (
            <a key={i} href={p.full} target="_blank" rel="noopener">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumb} alt={`${b.rigName || "Build"} photo ${i + 1}`} loading="lazy" />
            </a>
          ))}
        </div>
      )}
      <h2>{b.rigName || "(no rig name)"}</h2>
      <p className="garage-roster-meta">
        {[b.vehicle, b.category, b.name && `from ${b.name}`, b.handle, day(b.created)].filter(Boolean).join(" · ")}
      </p>
      {b.oneLine && <p>{b.oneLine}</p>}
      {b.missing.length > 0 && (
        <p className="garage-form-note garage-warn">Missing {b.missing.join(", ")}, so the site can&apos;t show it even if approved.</p>
      )}
      {(b.specs.length > 0 || b.about) && (
        <details>
          <summary>Specs and story</summary>
          {b.specs.length > 0 && (
            <dl className="garage-glance">
              {b.specs.map((s) => (
                <div key={s.label}>
                  <dt>{s.label}</dt>
                  <dd style={{ whiteSpace: "pre-wrap" }}>{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {b.about && <p style={{ whiteSpace: "pre-wrap" }}>{b.about}</p>}
        </details>
      )}
      {b.email && (
        <p className="garage-links">
          <a href={`mailto:${b.email}`}>{b.email}</a>
        </p>
      )}
      <GarageReviewActions
        kind="build"
        id={b.id}
        state={b.state}
        toggle={{ field: "ambassador", label: "Road & Trail Crew build", help: "Crew badge, listed right after the host builds.", value: b.ambassador }}
      />
    </article>
  );
}

export default async function GarageReviewBuildsPage() {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeOwnerOnly(session)) redirect("/garage");
  const builds = await listBuildSubmissions().catch(() => null);
  const waiting = builds?.filter((b) => b.state === "waiting") || [];
  const approved = builds?.filter((b) => b.state === "approved") || [];
  const declined = builds?.filter((b) => b.state === "declined") || [];

  return (
    <div className="garage">
      <GarageBack title="Builds" />
      <div className="garage-body">
        <h1 className="garage-event-title">Build submissions</h1>
        {!builds ? (
          <p className="garage-error">Couldn&apos;t read the Build Submissions table.</p>
        ) : (
          <>
            <h2 className="garage-section">Waiting ({waiting.length})</h2>
            {waiting.length === 0 ? <p className="garage-empty">Nothing waiting.</p> : waiting.map((b) => <BuildCard key={b.id} b={b} />)}

            <details className="garage-review-group">
              <summary>
                <h2 className="garage-section">On the site ({approved.length})</h2>
              </summary>
              {approved.map((b) => <BuildCard key={b.id} b={b} />)}
            </details>

            {declined.length > 0 && (
              <details className="garage-review-group">
                <summary>
                  <h2 className="garage-section">Declined ({declined.length})</h2>
                </summary>
                {declined.map((b) => <BuildCard key={b.id} b={b} />)}
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
}
