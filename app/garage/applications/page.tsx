import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { isWaiting, listApplications, type Application } from "@/lib/garageApplications";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Applications · A and D Garage",
  robots: { index: false, follow: false },
};

const SHORT: Record<string, string> = {
  "Accept — Road & Trail Member": "Accepted",
  "Hold / Second Review": "On hold",
  Decline: "Declined",
  "Exceptional Candidate / Crew Review": "Crew review",
};

function formatDate(iso: string) {
  return iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
}

function Row({ app }: { app: Application }) {
  return (
    <li>
      <Link href={`/garage/applications/${app.id}`} className="garage-app-row">
        {app.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={app.photo} alt="" className="garage-app-photo" />
        ) : (
          <span className="garage-app-photo" aria-hidden="true" />
        )}
        <span className="garage-app-main">
          <strong>{app.name}</strong>
          <span className="garage-roster-meta">
            {[app.location, app.facts.find((f) => f.label === "Vehicle / build")?.value, `applied ${formatDate(app.applied)}`]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
        <span className={app.decision ? "garage-tag" : "garage-tag garage-tag-new"}>
          {app.decision ? SHORT[app.decision] || app.decision : "New"}
        </span>
      </Link>
    </li>
  );
}

export default async function GarageApplicationsPage() {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeOwnerOnly(session)) redirect("/garage");

  const apps = await listApplications().catch(() => null);
  const waiting = apps?.filter(isWaiting) || [];
  const decided = apps?.filter((a) => !isWaiting(a)) || [];

  return (
    <div className="garage">
      <GarageBack title="Applications" />
      <div className="garage-body">
        <h1 className="garage-event-title">Road &amp; Trail Crew applications</h1>
        {!apps ? (
          <p className="garage-error">Couldn&apos;t read the Applications table.</p>
        ) : apps.length === 0 ? (
          <p className="garage-empty">No applications yet.</p>
        ) : (
          <>
            <section className="garage-panel">
              <h2>Waiting on a decision ({waiting.length})</h2>
              {waiting.length === 0 ? (
                <p className="garage-empty">Nothing waiting.</p>
              ) : (
                <ul className="garage-roster">{waiting.map((a) => <Row key={a.id} app={a} />)}</ul>
              )}
            </section>
            {decided.length > 0 && (
              <section className="garage-panel">
                <h2>Decided ({decided.length})</h2>
                <ul className="garage-roster">{decided.map((a) => <Row key={a.id} app={a} />)}</ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
