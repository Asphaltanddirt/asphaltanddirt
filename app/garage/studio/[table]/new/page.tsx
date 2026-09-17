import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageStudioForm from "@/components/GarageStudioForm";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { getLinkOptions } from "@/lib/garageStudio";
import { STUDIO_TABLES, isStudioTable } from "@/lib/studioConfig";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Studio · A and D Garage",
  robots: { index: false, follow: false },
};

export default async function GarageStudioNewPage({ params }: { params: Promise<{ table: string }> }) {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeOwnerOnly(session)) redirect("/garage");
  const { table } = await params;
  if (!isStudioTable(table)) notFound();
  const t = STUDIO_TABLES[table];
  const linkOptions = await getLinkOptions(table).catch(() => ({}));

  return (
    <div className="garage">
      <GarageBack title={`Add ${t.singular}`} />
      <div className="garage-body">
        <h1 className="garage-event-title">Add {t.singular}</h1>
        <GarageStudioForm tableKey={table} record={null} linkOptions={linkOptions} />
      </div>
    </div>
  );
}
