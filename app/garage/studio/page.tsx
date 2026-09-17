import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageQuickIdea from "@/components/GarageQuickIdea";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { listStudioRecords } from "@/lib/garageStudio";
import { STUDIO_ORDER, STUDIO_TABLES } from "@/lib/studioConfig";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Studio · A and D Garage",
  robots: { index: false, follow: false },
};

/** Podcast and video production: ideas, episodes, guests, sponsors. */
export default async function GarageStudioPage() {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeOwnerOnly(session)) redirect("/garage");

  const lists = await Promise.all(STUDIO_ORDER.map((key) => listStudioRecords(key).catch(() => null)));

  return (
    <div className="garage">
      <GarageBack title="Studio" />
      <div className="garage-body">
        <h1 className="garage-event-title">Studio</h1>

        <section className="garage-panel">
          <h2>New video idea</h2>
          <GarageQuickIdea />
        </section>

        <section className="garage-panel">
          <ul className="garage-roster">
            {STUDIO_ORDER.map((key, i) => {
              const t = STUDIO_TABLES[key];
              const records = lists[i];
              const counts = records
                ? t.groups.map((g) => [g, records.filter((r) => r.group === g).length] as const).filter(([, n]) => n > 0)
                : [];
              return (
                <li key={key}>
                  <Link href={`/garage/studio/${key}`} className="garage-app-row">
                    <span className="garage-app-main">
                      <strong>{t.label}</strong>
                      <span className="garage-roster-meta">
                        {!records ? "Couldn't load" : counts.length ? counts.map(([g, n]) => `${n} ${g.toLowerCase()}`).join(" · ") : "None yet"}
                      </span>
                    </span>
                    <span aria-hidden="true">›</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
