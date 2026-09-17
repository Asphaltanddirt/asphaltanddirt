import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { listStudioRecords } from "@/lib/garageStudio";
import { STUDIO_TABLES, isStudioTable } from "@/lib/studioConfig";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Studio · A and D Garage",
  robots: { index: false, follow: false },
};

const day = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** One Studio table as a board: a section per status, cards to tap into. */
export default async function GarageStudioTablePage({ params }: { params: Promise<{ table: string }> }) {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeOwnerOnly(session)) redirect("/garage");
  const { table } = await params;
  if (!isStudioTable(table)) notFound();

  const t = STUDIO_TABLES[table];
  const records = await listStudioRecords(table).catch(() => null);
  const groups = [...t.groups, ""];

  return (
    <div className="garage">
      <GarageBack title={t.label} />
      <div className="garage-body">
        <h1 className="garage-event-title">{t.label}</h1>
        <p className="garage-links">
          <Link href={`/garage/studio/${table}/new`} className="btn btn-primary btn-sm">Add {t.singular}</Link>
        </p>
        {!records ? (
          <p className="garage-error">Couldn&apos;t read the {t.table} table.</p>
        ) : records.length === 0 ? (
          <p className="garage-empty">None yet.</p>
        ) : (
          groups.map((g) => {
            const inGroup = records.filter((r) => (g ? r.group === g : !t.groups.includes(r.group)));
            if (!inGroup.length) return null;
            return (
              <section key={g || "none"} className="garage-panel">
                <h2>{g || "No status"} ({inGroup.length})</h2>
                <ul className="garage-roster">
                  {inGroup.map((r) => {
                    const meta = t.fields
                      .filter((f) => f.onCard)
                      .map((f) => {
                        const v = r.values[f.key];
                        if (!v || (Array.isArray(v) && !v.length)) return "";
                        if (f.kind === "date") return day(String(v));
                        if (f.kind === "number") return `$${v}`;
                        if (f.kind === "textarea") return String(v).split("\n")[0].slice(0, 90);
                        return String(v);
                      })
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <li key={r.id}>
                        <Link href={`/garage/studio/${table}/${r.id}`} className="garage-app-row">
                          <span className="garage-app-main">
                            <strong>{r.title || "(untitled)"}</strong>
                            {meta && <span className="garage-roster-meta">{meta}</span>}
                          </span>
                          <span aria-hidden="true">›</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
