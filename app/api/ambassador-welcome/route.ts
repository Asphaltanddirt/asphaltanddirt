import { NextRequest, NextResponse } from "next/server";
import { isAirtableConfigured } from "@/lib/airtable";
import {
  findAmbassador,
  sendAmbassadorWelcome,
  type WelcomeSendResult,
} from "@/lib/ambassadorWelcomeSend";

export const dynamic = "force-dynamic";

/**
 * Sends a Road & Trail Crew welcome email.
 *
 *   POST /api/ambassador-welcome            -> JSON response (Airtable cron / scripts)
 *   GET  /api/ambassador-welcome            -> styled HTML page (Airtable button field)
 *
 *   Auth: Authorization: Bearer <ADMIN_API_SECRET>   or   ?key=<ADMIN_API_SECRET>
 *   Params (query, or JSON body on POST):
 *     recordId  Ambassador record id
 *     email     alternative lookup key
 *     part      1 (on approval, no code) | 2 (code reveal). Default 1.
 *     test      "1" / true -> send to NEWSLETTER_TEST_EMAIL, don't touch the record
 *
 * Idempotent. Part 2 needs Agreement Signed + Promo Code + Tracking Link on
 * the record; otherwise it's skipped (with a reason), never sent early.
 */

interface Resolved {
  httpStatus: number;
  result?: WelcomeSendResult;
  error?: string;
  part: 1 | 2;
}

async function resolve(req: NextRequest, bodyParams: Record<string, unknown>): Promise<Resolved> {
  const adminSecret = process.env.ADMIN_API_SECRET;
  const q = req.nextUrl.searchParams;
  const part: 1 | 2 = String(bodyParams.part ?? q.get("part") ?? "1") === "2" ? 2 : 1;

  if (!adminSecret) return { httpStatus: 500, error: "Admin actions are not configured.", part };

  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    q.get("key") ||
    (typeof bodyParams.key === "string" ? bodyParams.key : "") ||
    "";
  if (provided !== adminSecret) return { httpStatus: 401, error: "Unauthorized.", part };
  if (!isAirtableConfigured()) return { httpStatus: 500, error: "Airtable is not configured.", part };

  const recordId = String(bodyParams.recordId || q.get("recordId") || "");
  const email = String(bodyParams.email || q.get("email") || "").trim();
  const test = bodyParams.test === true || q.get("test") === "1";

  if (!recordId && !email) return { httpStatus: 400, error: "recordId or email is required.", part };

  let ambassador;
  try {
    ambassador = await findAmbassador({ recordId: recordId || undefined, email: email || undefined });
  } catch (err) {
    console.error("ambassador-welcome lookup error", err);
    return { httpStatus: 502, error: "Lookup failed.", part };
  }
  if (!ambassador) return { httpStatus: 404, error: "No ambassador record found.", part };

  try {
    const result = await sendAmbassadorWelcome(ambassador, part, { test });
    return { httpStatus: result.status === "skipped" ? 409 : 200, result, part };
  } catch (err) {
    console.error("ambassador-welcome send error", err);
    return { httpStatus: 502, error: "Send failed.", part };
  }
}

async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const raw = await req.text();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  const r = await resolve(req, await readBody(req));
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.httpStatus });
  return NextResponse.json(r.result, { status: r.httpStatus });
}

// GET — for an Airtable button field. Formula:
//   'https://asphaltanddirt.com/api/ambassador-welcome?part=1&key=<ADMIN_API_SECRET>&recordId=' & RECORD_ID()
export async function GET(req: NextRequest) {
  const r = await resolve(req, {});
  return htmlPage(r);
}

function htmlPage(r: Resolved): NextResponse {
  const partLabel = r.part === 1 ? "Welcome Email 1" : "Welcome Email 2 (code reveal)";
  let heading = "";
  let detail = "";
  let tone: "ok" | "warn" | "bad" = "ok";

  if (r.error) {
    tone = "bad";
    heading = "Couldn't send";
    detail = r.error;
  } else if (r.result?.status === "sent") {
    heading = `${partLabel} sent`;
    detail = `To ${r.result.name || "the ambassador"}.`;
  } else if (r.result?.status === "already-sent") {
    tone = "warn";
    heading = "Already sent";
    detail = `${partLabel} already went out to ${r.result.name || "this ambassador"} — nothing sent.`;
  } else if (r.result?.status === "skipped") {
    tone = "warn";
    heading = "Not sent";
    detail =
      r.result.reason === "agreement not signed"
        ? "Part 2 holds the code — it can't go out before the agreement is signed."
        : r.result.reason === "promo code or tracking link not set"
          ? "Set Promo Code and Tracking Link on the record first, then send Part 2."
          : `Skipped: ${r.result.reason}.`;
  }

  const color = tone === "ok" ? "#2f8f4e" : tone === "warn" ? "#a56a09" : "#c0392b";
  const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${heading}</title></head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#0f0f0f;color:#f4f4f2;display:flex;min-height:100vh;align-items:center;justify-content:center;">
  <div style="max-width:420px;padding:40px 28px;text-align:center;">
    <p style="font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#f86000;margin:0 0 18px;">Road &amp; Trail Crew</p>
    <h1 style="font-size:22px;margin:0 0 10px;color:${color};">${heading}</h1>
    <p style="font-size:15px;line-height:1.6;color:#bbb1aa;margin:0 0 22px;">${detail}</p>
    <p style="font-size:13px;color:#877f75;margin:0;">You can close this tab.</p>
  </div>
</body></html>`;
  return new NextResponse(html, {
    status: r.error ? r.httpStatus : 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
