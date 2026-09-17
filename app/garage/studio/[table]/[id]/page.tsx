import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageStudioForm from "@/components/GarageStudioForm";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { getLinkOptions, getStudioRecord } from "@/lib/garageStudio";
import { STUDIO_TABLES, isStudioTable } from "@/lib/studioConfig";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Studio · A and D Garage",
  robots: { index: false, follow: false },
};

export default async function GarageStudioRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ table: string; id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeOwnerOnly(session)) redirect("/garage");
  const [{ table, id }, { created }] = await Promise.all([params, searchParams]);
  if (!isStudioTable(table)) notFound();
  const t = STUDIO_TABLES[table];
  const [record, linkOptions] = await Promise.all([getStudioRecord(table, id).catch(() => null), getLinkOptions(table).catch(() => ({}))]);
  if (!record) notFound();

  return (
    <div className="garage">
      <GarageBack title={t.label} back={{ href: `/garage/studio/${table}`, label: t.label }} />
      <div className="garage-body">
        <h1 className="garage-event-title">{record.title || "(untitled)"}</h1>
        {created && <p className="garage-form-note" role="status">Added.</p>}
        <GarageStudioForm tableKey={table} record={record} linkOptions={linkOptions} />
      </div>
    </div>
  );
}
