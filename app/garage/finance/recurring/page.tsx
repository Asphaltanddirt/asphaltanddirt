import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageRecurringCosts from "@/components/GarageRecurringCosts";
import { getSession } from "@/lib/garageAuth";
import { canSeeFinance, listRecurring } from "@/lib/garageFinance";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Recurring costs · A and D Garage",
  robots: { index: false, follow: false },
};

export default async function GarageRecurringPage() {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeFinance(session)) redirect("/garage");
  const items = await listRecurring().catch(() => null);

  return (
    <div className="garage">
      <GarageBack title="Recurring" back={{ href: "/garage/finance", label: "Finance" }} />
      <div className="garage-body">
        <h1 className="garage-event-title">Recurring costs</h1>
        <section className="garage-panel">
          {items ? <GarageRecurringCosts items={items} /> : <p className="garage-error">Couldn&apos;t read the Recurring table.</p>}
        </section>
      </div>
    </div>
  );
}
