import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageFinanceEntry from "@/components/GarageFinanceEntry";
import { getSession } from "@/lib/garageAuth";
import { canSeeFinance, todayNY } from "@/lib/garageFinance";
import type { TransactionType } from "@/lib/financeConfig";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New entry · A and D Garage",
  robots: { index: false, follow: false },
};

export default async function GarageFinanceNewPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; date?: string; person?: string; amount?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeFinance(session)) redirect("/garage");
  const q = await searchParams;
  const type = (["Income", "Expense", "Settle-up"].includes(q.type || "") ? q.type : "Expense") as TransactionType;
  const me = session.name?.split(" ")[0] || "";

  return (
    <div className="garage">
      <GarageBack title="New entry" back={{ href: "/garage/finance", label: "Finance" }} />
      <div className="garage-body">
        <h1 className="garage-event-title">{type === "Settle-up" ? "Partner settle-up" : `New ${type.toLowerCase()}`}</h1>
        <GarageFinanceEntry
          initial={null}
          defaults={{
            type,
            date: /^\d{4}-\d{2}-\d{2}$/.test(q.date || "") ? q.date! : todayNY(),
            person: q.person === "Jose" || q.person === "Anthony" ? q.person : me === "Jose" || me === "Anthony" ? me : "",
            amount: /^\d+(\.\d{1,2})?$/.test(q.amount || "") ? q.amount! : "",
          }}
        />
      </div>
    </div>
  );
}
