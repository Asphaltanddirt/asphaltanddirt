import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageFinanceEntry from "@/components/GarageFinanceEntry";
import { getSession } from "@/lib/garageAuth";
import { canSeeFinance, getTransaction } from "@/lib/garageFinance";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entry · A and D Garage",
  robots: { index: false, follow: false },
};

export default async function GarageFinanceEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ receipt?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeFinance(session)) redirect("/garage");
  const [{ id }, { receipt }] = await Promise.all([params, searchParams]);
  const t = await getTransaction(id).catch(() => null);
  if (!t) notFound();

  return (
    <div className="garage">
      <GarageBack title="Entry" back={{ href: "/garage/finance", label: "Finance" }} />
      <div className="garage-body">
        <h1 className="garage-event-title">{t.description || t.category}</h1>
        {receipt === "failed" && <p className="garage-error" role="alert">Saved, but the receipt didn&apos;t upload. Add it again below.</p>}
        {t.source !== "Manual" && (
          <p className="garage-form-note">
            Added automatically ({t.source.toLowerCase()}). {t.person ? "" : "Pick who paid or received it so the balance is right."}
          </p>
        )}
        {t.enteredBy && t.enteredBy !== "automatic" && <p className="garage-form-note">Entered by {t.enteredBy}</p>}
        <GarageFinanceEntry initial={t} defaults={{ type: t.type, date: t.date, person: t.person, amount: "" }} />
      </div>
    </div>
  );
}
