import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import { getSession } from "@/lib/garageAuth";
import { canSeeFinance, listTransactions, periodRange, profitAndLoss, settleUp, todayNY } from "@/lib/garageFinance";
import { PERIODS, money, type PeriodKey } from "@/lib/financeConfig";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Finance · A and D Garage",
  robots: { index: false, follow: false },
};

const day = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const rangeText = (from: string, to: string) =>
  `${new Date(`${from}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${new Date(`${to}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

function Row({ label, amount, lastYear, strong, showLastYear }: { label: string; amount: number; lastYear?: number; strong?: boolean; showLastYear: boolean }) {
  return (
    <tr className={strong ? "is-total" : ""}>
      <th scope="row">{label}</th>
      <td>{money(amount)}</td>
      {showLastYear && <td className="garage-pl-ly">{lastYear === undefined ? "" : money(lastYear)}</td>}
    </tr>
  );
}

/** Money in, money out, the P&L and who owes whom. Jose + Anthony only. */
export default async function GarageFinancePage({ searchParams }: { searchParams: Promise<{ period?: string; saved?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeFinance(session)) redirect("/garage");

  const { period, saved } = await searchParams;
  const key = (PERIODS.find((p) => p.key === period)?.key || "this-month") as PeriodKey;
  const range = periodRange(key);
  const all = await listTransactions().catch(() => null);
  const pl = all ? profitAndLoss(all, range) : null;
  const balance = all ? settleUp(all) : null;
  const inPeriod = all?.filter((t) => t.date >= range.from && t.date <= range.to) || [];
  const needsPerson = all?.filter((t) => !t.person) || [];
  const noReceipt = inPeriod.filter((t) => t.type === "Expense" && !t.receipts.length && t.source === "Manual").length;
  const today = todayNY();

  return (
    <div className="garage">
      <GarageBack title="Finance" />
      <div className="garage-body">
        <h1 className="garage-event-title">Finance</h1>
        {saved && <p className="garage-form-note" role="status">Saved.</p>}

        <p className="garage-links garage-links-wrap">
          <Link href={`/garage/finance/new?type=Expense&date=${today}`} className="btn btn-primary btn-sm">+ Expense</Link>
          <Link href={`/garage/finance/new?type=Income&date=${today}`} className="btn btn-outline btn-sm">+ Income</Link>
        </p>

        {!all ? (
          <p className="garage-error">Couldn&apos;t read the Finance base.</p>
        ) : (
          <>
            <section className="garage-panel">
              <h2>Who owes whom</h2>
              {balance ? (
                <>
                  <p className="garage-count">
                    {money(balance.amount)} <span>{balance.owes} owes {balance.to}</span>
                  </p>
                  <p className="garage-form-note">Everything since September 2026, split 50/50.</p>
                  <p className="garage-links">
                    <Link
                      href={`/garage/finance/new?type=Settle-up&person=${balance.owes}&amount=${balance.amount.toFixed(2)}&date=${today}`}
                      className="btn btn-outline btn-sm"
                    >
                      Record that {balance.owes} paid {balance.to}
                    </Link>
                  </p>
                </>
              ) : (
                <p>Even. Nobody owes anybody.</p>
              )}
              {needsPerson.length > 0 && (
                <p className="garage-form-note garage-warn">
                  {needsPerson.length} automatic {needsPerson.length === 1 ? "entry needs" : "entries need"} a name before this is right (below, marked “who?”).
                </p>
              )}
            </section>

            <nav className="garage-period-nav" aria-label="Period">
              {PERIODS.map((p) => (
                <Link key={p.key} href={`/garage/finance?period=${p.key}`} aria-current={p.key === key ? "page" : undefined}>
                  {p.label}
                </Link>
              ))}
            </nav>

            <section className="garage-panel">
              <h2>Profit &amp; loss</h2>
              <p className="garage-form-note">{rangeText(range.from, range.to)}</p>
              {pl && (
                <table className="garage-pl">
                  {pl.hasLastYear && (
                    <thead>
                      <tr>
                        <td />
                        <th scope="col">{range.label}</th>
                        <th scope="col">A year before</th>
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    <tr className="is-heading"><th scope="rowgroup" colSpan={3}>Income</th></tr>
                    {pl.income.map((r) => <Row key={r.category} label={r.category} amount={r.amount} lastYear={r.lastYear} showLastYear={pl.hasLastYear} />)}
                    <Row label="Total income" amount={pl.totalIncome} strong showLastYear={pl.hasLastYear} />
                    <tr className="is-heading"><th scope="rowgroup" colSpan={3}>Expenses</th></tr>
                    {pl.expenses.map((r) => <Row key={r.category} label={r.category} amount={r.amount} lastYear={r.lastYear} showLastYear={pl.hasLastYear} />)}
                    <Row label="Total expenses" amount={pl.totalExpenses} strong showLastYear={pl.hasLastYear} />
                    <Row label={pl.net >= 0 ? "Profit" : "Loss"} amount={pl.net} lastYear={pl.hasLastYear ? pl.lastYearNet : undefined} strong showLastYear={pl.hasLastYear} />
                  </tbody>
                </table>
              )}
              {pl && (
                <p className="garage-form-note">
                  Each partner&apos;s half: {pl.shares.map((s) => `${s.name} ${money(s.amount)}`).join(" · ")}
                </p>
              )}
              <p className="garage-links garage-links-wrap">
                <a href={`/garage/finance/export?period=${key}`}>Download spreadsheet (CSV)</a>
                <Link href="/garage/finance/recurring">Recurring costs</Link>
              </p>
            </section>

            <section className="garage-panel">
              <h2>Entries ({inPeriod.length})</h2>
              {noReceipt > 0 && <p className="garage-form-note">{noReceipt} expense{noReceipt === 1 ? "" : "s"} without a receipt.</p>}
              {inPeriod.length === 0 ? (
                <p className="garage-empty">Nothing in this period.</p>
              ) : (
                <ul className="garage-roster">
                  {inPeriod.map((t) => (
                    <li key={t.id}>
                      <Link href={`/garage/finance/${t.id}`} className="garage-app-row">
                        <span className="garage-app-main">
                          <strong>{t.description || t.category}</strong>
                          <span className="garage-roster-meta">
                            {[day(t.date), t.type === "Settle-up" ? "Settle-up" : t.category, t.person || "who?", t.receipts.length ? "receipt" : ""]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                        <span className={`garage-amount is-${t.type.toLowerCase()}`}>
                          {t.type === "Expense" ? "−" : t.type === "Income" ? "+" : ""}
                          {money(t.amount)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
        <p className="garage-form-note">A running record for Jose and Anthony, not tax advice.</p>
      </div>
    </div>
  );
}
