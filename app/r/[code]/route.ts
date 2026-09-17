import { NextRequest, NextResponse, after } from "next/server";
import { listRecords, updateRecord, isAirtableConfigured } from "@/lib/airtable";
import { REF_COOKIE, REF_DAYS, isValidPromoCode, normalizePromoCode } from "@/lib/ambassadorReferral";

export const dynamic = "force-dynamic";

const AMBASSADORS_TABLE = process.env.AIRTABLE_AMBASSADORS_TABLE || "Ambassadors";
const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|slack|curl|wget|python|headless/i;

/**
 * An ambassador's link, /r/CODE. Sends the visitor to the ambassador's crew
 * page if it's live on /team (otherwise the merch page), remembers the code
 * for checkout, tags the landing with UTM values for site analytics, and adds
 * one to Link Visits on their Ambassador record (bots and same-day repeat
 * visits from the same browser aren't counted).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = normalizePromoCode(raw);
  const merch = new URL("/merch", req.nextUrl.origin);

  if (!isValidPromoCode(code) || !isAirtableConfigured()) return NextResponse.redirect(merch, 302);

  let ambassador;
  try {
    [ambassador] = await listRecords(
      AMBASSADORS_TABLE,
      `AND(UPPER({Promo Code}) = '${code}', {Status} != 'Inactive')`,
    );
  } catch (err) {
    console.error("referral lookup failed", err);
  }
  if (!ambassador) return NextResponse.redirect(merch, 302);

  const f = ambassador.fields;
  const photos = f["Profile Photo"] as unknown[] | undefined;
  const crewPageLive =
    f["Featured on Team Page"] === true && f.Status === "Active" && Boolean(f.Slug && f.Name && f["Public Bio"] && photos?.length);
  const dest = crewPageLive ? new URL(`/team/${f.Slug as string}`, req.nextUrl.origin) : merch;
  dest.searchParams.set("utm_source", "ambassador");
  dest.searchParams.set("utm_medium", "referral");
  dest.searchParams.set("utm_campaign", code.toLowerCase());

  const res = NextResponse.redirect(dest, 302);
  res.cookies.set(REF_COOKIE, code, { maxAge: REF_DAYS * 86_400, path: "/", sameSite: "lax", secure: true });

  const today = new Date().toISOString().slice(0, 10);
  const seenKey = `${code}:${today}`;
  const alreadyCounted = req.cookies.get(`${REF_COOKIE}_seen`)?.value === seenKey;
  const isBot = BOT_UA.test(req.headers.get("user-agent") || "") || req.method !== "GET";
  if (!alreadyCounted && !isBot) {
    res.cookies.set(`${REF_COOKIE}_seen`, seenKey, { maxAge: 86_400, path: "/", sameSite: "lax", secure: true, httpOnly: true });
    after(async () => {
      try {
        // Read fresh so two visits a moment apart don't overwrite each other's count.
        const [fresh] = await listRecords(AMBASSADORS_TABLE, `RECORD_ID() = '${ambassador.id}'`);
        const visits = Number(fresh?.fields["Link Visits"]) || 0;
        await updateRecord(AMBASSADORS_TABLE, ambassador.id, { "Link Visits": visits + 1, "Last Link Visit": today });
      } catch (err) {
        console.error("referral visit count failed", err);
      }
    });
  }
  return res;
}
