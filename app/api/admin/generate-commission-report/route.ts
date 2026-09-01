import { NextRequest, NextResponse } from "next/server";
import { getOrdersInRange } from "@/lib/fourthwall-platform";
import { listRecords, createRecord, updateRecord, isAirtableConfigured } from "@/lib/airtable";

const AMBASSADORS_TABLE = process.env.AIRTABLE_AMBASSADORS_TABLE || "Ambassadors";
const SNAPSHOTS_TABLE = process.env.AIRTABLE_SNAPSHOTS_TABLE || "Monthly Commission Snapshots";

/** Airtable "percent" fields return a 0-1 fraction; a plain Number field holding "10"
 *  means 10%. Handle either without needing to know which the user picked. */
function normalizeRate(rate: number): number {
  return rate > 1 ? rate / 100 : rate;
}

function monthRange(month: string): { start: Date; end: Date } {
  const [year, mo] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, mo - 1, 1));
  const end = new Date(Date.UTC(year, mo, 1));
  return { start, end };
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function POST(req: NextRequest) {
  const adminSecret = process.env.ADMIN_API_SECRET;
  if (!adminSecret) {
    return NextResponse.json({ error: "Admin reporting is not configured." }, { status: 500 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isAirtableConfigured()) {
    return NextResponse.json({ error: "Airtable is not configured." }, { status: 500 });
  }

  const month = req.nextUrl.searchParams.get("month") || currentMonth();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month must be in YYYY-MM format." }, { status: 400 });
  }
  const { start, end } = monthRange(month);

  // 1. Pull every non-cancelled order for the month and aggregate by promotion (promo code).
  let orders;
  try {
    orders = await getOrdersInRange(start, end);
  } catch (err) {
    console.error("Fourthwall order fetch failed", err);
    return NextResponse.json({ error: "Failed to fetch Fourthwall orders." }, { status: 502 });
  }

  const byPromotion = new Map<string, { count: number; netSubtotal: number }>();
  for (const order of orders) {
    if (order.status === "CANCELLED") continue;
    if (!order.promotionId) continue;

    const subtotal = order.amounts.subtotal?.value ?? 0;
    const discount = order.amounts.discount?.value ?? 0;
    const net = subtotal - discount;

    const existing = byPromotion.get(order.promotionId) ?? { count: 0, netSubtotal: 0 };
    existing.count += 1;
    existing.netSubtotal += net;
    byPromotion.set(order.promotionId, existing);
  }

  // 2. Pull active ambassadors and their commission rates/codes.
  let ambassadors;
  try {
    ambassadors = await listRecords(AMBASSADORS_TABLE, "{Status}='Active'");
  } catch (err) {
    console.error("Airtable ambassadors fetch failed", err);
    return NextResponse.json({ error: "Failed to fetch ambassadors from Airtable." }, { status: 502 });
  }

  // 3. Pull any existing snapshots for this month so we update rather than duplicate.
  let existingSnapshots;
  try {
    existingSnapshots = await listRecords(SNAPSHOTS_TABLE, `{Month}='${month}'`);
  } catch (err) {
    console.error("Airtable snapshots fetch failed", err);
    return NextResponse.json({ error: "Failed to fetch existing snapshots from Airtable." }, { status: 502 });
  }

  const results = [];
  for (const ambassador of ambassadors) {
    const promotionId = ambassador.fields["Fourthwall Promotion ID"] as string | undefined;
    const commissionRateRaw = Number(ambassador.fields["Commission Rate"] ?? 0);
    const commissionRate = normalizeRate(commissionRateRaw);

    const activity = promotionId ? byPromotion.get(promotionId) : undefined;
    const ordersCount = activity?.count ?? 0;
    const netSubtotal = Math.round((activity?.netSubtotal ?? 0) * 100) / 100;
    const commissionOwed = Math.round(netSubtotal * commissionRate * 100) / 100;

    const snapshotFields = {
      Ambassador: [ambassador.id],
      Month: month,
      "Tracked Orders Count": ordersCount,
      "Net Merch Subtotal": netSubtotal,
      "Commission Owed": commissionOwed,
    };

    const existing = existingSnapshots.find((s) => {
      const linked = (s.fields.Ambassador as string[] | undefined) || [];
      return linked.includes(ambassador.id);
    });

    try {
      if (existing) {
        await updateRecord(SNAPSHOTS_TABLE, existing.id, snapshotFields);
      } else {
        await createRecord(SNAPSHOTS_TABLE, { ...snapshotFields, "Payout Status": "Pending" });
      }
    } catch (err) {
      console.error(`Airtable snapshot write failed for ${ambassador.fields.Name}`, err);
      continue;
    }

    results.push({
      name: ambassador.fields.Name,
      tier: ambassador.fields.Tier,
      promoCode: ambassador.fields["Promo Code"] || null,
      ordersCount,
      netSubtotal,
      commissionRate,
      commissionOwed,
    });
  }

  return NextResponse.json({ month, ambassadors: results });
}
