import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/garageAuth";
import { canSeeFinance, listTransactions, periodRange, toCsv } from "@/lib/garageFinance";
import { PERIODS, type PeriodKey } from "@/lib/financeConfig";

export const dynamic = "force-dynamic";

/** CSV of the chosen period, for taxes or a spreadsheet. */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !canSeeFinance(session)) return new NextResponse("Not available.", { status: 401 });
  const key = (PERIODS.find((p) => p.key === req.nextUrl.searchParams.get("period"))?.key || "this-month") as PeriodKey;
  const range = periodRange(key);
  const list = (await listTransactions()).filter((t) => t.date >= range.from && t.date <= range.to);
  return new NextResponse(toCsv(list), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ad-finance-${range.from}-to-${range.to}.csv"`,
    },
  });
}
