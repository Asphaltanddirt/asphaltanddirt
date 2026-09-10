/**
 * Post-purchase follow-up sequence for merch orders.
 *
 * Fourthwall sends the transactional emails (confirmation, payment,
 * shipping) but nothing after delivery. This fills that gap: once
 * Fourthwall marks an order DELIVERED, we send up to three engagement
 * emails — "your gear landed", the review/tag ask, and an optional
 * community nudge.
 *
 * Consent: only orders whose customer ticked the marketing box at
 * checkout (`emailMarketingOptIn`) are eligible. This sequence is
 * self-contained — its own unsubscribe, and buyers are never added to the
 * newsletter list.
 *
 * Delivery signal: Fourthwall's own order `status` (no third-party
 * tracking service). A daily cron syncs recent orders into the Orders
 * table and stamps Delivered Date the first time it sees `DELIVERED`.
 */
import {
  createRecord,
  isAirtableConfigured,
  listRecords,
  updateRecord,
  type AirtableFields,
} from "@/lib/airtable";
import { getRecentOrders, type FourthwallOrder } from "@/lib/fourthwall-platform";
import { sendEmail } from "@/lib/resendEmail";
import { socialLinks } from "@/lib/social";
import { SITE_URL } from "@/lib/site";

const BASE_ID = process.env.AIRTABLE_NEWSLETTER_BASE_ID;
const TABLE = process.env.AIRTABLE_ORDERS_TABLE || "Orders";

const FROM = process.env.ORDER_FROM_EMAIL || "Asphalt & Dirt <team@asphaltanddirt.com>";
const REPLY_TO = process.env.ORDER_REPLY_TO || "team@asphaltanddirt.com";
const MAILING_ADDRESS = process.env.NEWSLETTER_MAILING_ADDRESS || "";

// Resend free tier is 100/day account-wide and the welcome cron already
// uses part of that. Order follow-ups are a trickle (deliveries lag orders
// by ~a week), so a low cap is plenty of headroom.
const DAILY_CAP = 40;

// Days after Delivered Date for emails 1, 2, 3.
const SCHEDULE = [1, 6, 12] as const;
const STEPS = SCHEDULE.length;

// Only these Fourthwall statuses count as "in the customer's hands".
const DELIVERED_STATUSES = new Set(["DELIVERED"]);

/** Marketplace orders (TikTok Shop, Meta/Facebook Shop) route through
 *  Fourthwall with a relay address, not the buyer's real email, and no
 *  marketing consent on our side. */
function isRelayEmail(email: string): boolean {
  return /@fourthwall\.com$/i.test(email.trim());
}

/** How the order reached us. Only "Direct" is eligible for the sequence. */
function classifyChannel(order: FourthwallOrder): "Direct" | "TikTok/Meta Shop" | "Samples/Other" {
  if ((order.source?.type || "ORDER") !== "ORDER") return "Samples/Other";
  if (isRelayEmail(order.email || "")) return "TikTok/Meta Shop";
  return "Direct";
}

/** Best estimate of the delivery date: the order's last-updated date when
 *  we first see it DELIVERED (it's a terminal state, so updatedAt tracks
 *  it closely), never later than today. */
function deliveredDateFor(order: FourthwallOrder, now: Date): string {
  const today = todayISO(now);
  const updated = (order.updatedAt || "").slice(0, 10);
  return updated && updated < today ? updated : today;
}

const ORANGE = "#f86000";
const INK = "#f4f4f2";
const BG = "#0f0f0f";

function token() {
  return globalThis.crypto.randomUUID();
}

function esc(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** UTC whole-day difference: (toDate's date) - (fromISO's date). */
function daysBetween(fromISO: string, toDate: Date): number {
  const from = new Date(`${fromISO.slice(0, 10)}T00:00:00Z`).getTime();
  const to = Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate());
  return Math.floor((to - from) / 86_400_000);
}

function todayISO(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function firstNameFrom(order: FourthwallOrder): string {
  return (order.billing?.address?.name || "").trim().split(/\s+/)[0] || "";
}

function summarizeItems(offers: FourthwallOrder["offers"]): string {
  const names = (offers || []).map((o) => (o?.name || "").trim()).filter(Boolean);
  if (names.length === 0) return "your order";
  if (names.length === 1) return names[0];
  return `${names[0]} + ${names.length - 1} more`;
}

// ---------------------------------------------------------------------------
// Sync — pull recent Fourthwall orders into the Orders table
// ---------------------------------------------------------------------------

export interface OrderSyncResult {
  fetched: number;
  created: number;
  newlyDelivered: number;
}

export async function syncOrders(now = new Date()): Promise<OrderSyncResult> {
  if (!isAirtableConfigured(BASE_ID)) {
    return { fetched: 0, created: 0, newlyDelivered: 0 };
  }

  const orders = await getRecentOrders(45);
  const existing = await listRecords(TABLE, undefined, { baseId: BASE_ID });
  const byFwId = new Map(
    existing.map((r) => [String(r.fields["Fourthwall Order ID"] || ""), r] as const),
  );

  let created = 0;
  let newlyDelivered = 0;

  for (const o of orders) {
    const delivered = DELIVERED_STATUSES.has(o.status);
    const channel = classifyChannel(o);
    const row = byFwId.get(o.id);

    if (!row) {
      const fields: AirtableFields = {
        Order: o.friendlyId || o.id,
        "Fourthwall Order ID": o.id,
        Email: o.email || "",
        "First Name": firstNameFrom(o),
        Items: summarizeItems(o.offers),
        "Order Date": o.createdAt.slice(0, 10),
        "Fourthwall Status": o.status,
        Channel: channel,
        "Marketing Opt-In": Boolean(o.emailMarketingOptIn),
        "Followup Step": 0,
        "Unsub Token": token(),
      };
      if (delivered) {
        fields["Delivered Date"] = deliveredDateFor(o, now);
        newlyDelivered += 1;
      }
      await createRecord(TABLE, fields, { baseId: BASE_ID });
      created += 1;
      continue;
    }

    const patch: AirtableFields = {};
    if (row.fields["Fourthwall Status"] !== o.status) patch["Fourthwall Status"] = o.status;
    if (row.fields["Channel"] !== channel) patch["Channel"] = channel;
    if (Boolean(row.fields["Marketing Opt-In"]) !== Boolean(o.emailMarketingOptIn)) {
      patch["Marketing Opt-In"] = Boolean(o.emailMarketingOptIn);
    }
    if (delivered && !row.fields["Delivered Date"]) {
      patch["Delivered Date"] = deliveredDateFor(o, now);
      newlyDelivered += 1;
    }
    if (!row.fields["Unsub Token"]) patch["Unsub Token"] = token();
    if (Object.keys(patch).length > 0) {
      await updateRecord(TABLE, row.id, patch, { baseId: BASE_ID });
    }
  }

  return { fetched: orders.length, created, newlyDelivered };
}

// ---------------------------------------------------------------------------
// Emails
// ---------------------------------------------------------------------------

function unsubscribeUrl(tok: string) {
  return `${SITE_URL}/api/order-followup/unsubscribe?token=${encodeURIComponent(tok)}`;
}

function link(text: string, url: string) {
  return `<a href="${url}" style="color:${ORANGE};font-weight:bold;text-decoration:none;">${esc(text)}</a>`;
}

function wrapOrderEmail(innerHtml: string, opts: { unsubscribeUrl: string; previewText: string }) {
  if (!MAILING_ADDRESS) {
    throw new Error("NEWSLETTER_MAILING_ADDRESS must be set before sending order emails (CAN-SPAM).");
  }
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light">
</head>
<body style="margin:0;padding:24px 0;background:#000;-webkit-text-size-adjust:100%;">
<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${esc(opts.previewText)}</span>
<div style="max-width:560px;margin:0 auto;background:${BG};border-radius:10px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
  <div style="background:#000;padding:22px 24px;">
    <span style="font-family:Arial,sans-serif;font-size:20px;font-weight:900;color:${INK};letter-spacing:.02em;">ASPHALT <span style="color:${ORANGE};">&amp;</span> DIRT</span>
  </div>
  <div style="padding:28px 24px;color:${INK};font-size:15px;line-height:1.65;">
    ${innerHtml}
  </div>
  <div style="padding:20px 24px;border-top:1px solid #2a2824;color:#8a8178;font-size:12px;line-height:1.7;">
    <p style="margin:0 0 6px;">You're getting this because you ordered from <a href="${SITE_URL}" style="color:#8a8178;">asphaltanddirt.com</a> and opted in to hear from us.</p>
    <p style="margin:0 0 6px;"><a href="${opts.unsubscribeUrl}" style="color:#8a8178;text-decoration:underline;">Unsubscribe from these</a> — you'll still get order &amp; shipping updates.</p>
    <p style="margin:0;">${esc(MAILING_ADDRESS)}</p>
  </div>
</div>
</body></html>`;
}

// Instagram and TikTok share the exact handle; the hashtag catches the
// rest (Facebook, X).
const TAG_HANDLES = `<b>@asphaltanddirtpodcast</b> on Instagram or TikTok`;
const TAG_LINE = `Tag ${TAG_HANDLES}, or drop <b>#AsphaltAndDirt</b> anywhere`;

interface EmailContext {
  name: string;
  items: string;
}

/** Builds one follow-up email. `step` is 1-indexed (1, 2, 3). */
export function buildFollowupEmail(step: number, ctx: EmailContext): {
  subject: string;
  previewText: string;
  innerHtml: string;
} {
  const hi = ctx.name ? `Hey ${esc(ctx.name)},` : "Hey,";
  const items = esc(ctx.items);
  const p = (html: string) => `<p style="margin:0 0 16px;">${html}</p>`;

  if (step === 1) {
    return {
      subject: "Your Asphalt & Dirt order landed",
      previewText: "Give it a look — and if it's right, show it off.",
      innerHtml:
        p(hi) +
        p(`Your <b>${items}</b> should be in your hands by now. Pull it out, give it a look, make sure everything's right.`) +
        p(`Wrong item, or a print or quality issue? ${link("Reach out", `${SITE_URL}/returns-faq`)} and we'll make it good.`) +
        p(`If it's good, we'd love to see it — on the trail, in the garage, wherever. ${TAG_LINE} and we'll find it.`) +
        p("Thanks for repping it.<br>— The Asphalt &amp; Dirt crew"),
    };
  }

  if (step === 2) {
    return {
      subject: "How's the gear holding up?",
      previewText: "A quick review or a photo goes a long way for a small brand.",
      innerHtml:
        p(hi) +
        p(`About a week in — how's the <b>${items}</b> treating you?`) +
        p(`If it's earned a spot in the rotation, two things would genuinely help us out:`) +
        `<p style="margin:0 0 16px;">1. ${link("Leave a quick review", `${SITE_URL}/reviews/submit`)} — approved ones go up on the site.<br>2. Post a photo or clip and tag ${TAG_HANDLES} — we repost the good ones.</p>` +
        p("Every review and tag helps a small brand get seen. Appreciate you.<br>— The A&amp;D crew"),
    };
  }

  return {
    subject: "You've got the gear — might as well be in the room",
    previewText: "Where the rides, builds, and events actually get planned.",
    innerHtml:
      p(hi) +
      p("One more thing and we'll leave you alone.") +
      p(`The Asphalt &amp; Dirt group is where it all actually happens — ride planning, build threads, event drops, and the crew. If you're into the gear, you'll be into the room.`) +
      p(`&rarr; ${link("Join the private group", socialLinks.facebookGroup)}`) +
      p(`Want first look at new drops? ${link("Subscribe to the newsletter", `${SITE_URL}/#subscribe`)} — no spam, just the good stuff.`) +
      p("See you in there.<br>— The A&amp;D crew"),
  };
}

// ---------------------------------------------------------------------------
// Sweep — send the next due email
// ---------------------------------------------------------------------------

export interface FollowupSweepResult {
  checked: number;
  sent: { email: string; step: number }[];
  cappedAt?: number;
}

export async function processOrderFollowups(now = new Date()): Promise<FollowupSweepResult> {
  if (!isAirtableConfigured(BASE_ID)) return { checked: 0, sent: [] };

  // Safety gate — the daily sync always runs, but real emails only go out
  // once ORDER_FOLLOWUP_ENABLED is "true" in the environment. Lets us ship
  // and watch the Orders table fill up before anything reaches a customer.
  if (process.env.ORDER_FOLLOWUP_ENABLED !== "true") {
    return { checked: 0, sent: [] };
  }

  if (!MAILING_ADDRESS) {
    throw new Error("NEWSLETTER_MAILING_ADDRESS must be set before sending order emails (CAN-SPAM).");
  }

  const rows = await listRecords(
    TABLE,
    "AND({Channel} = 'Direct', {Marketing Opt-In}, NOT({Unsubscribed}), {Followup Step} < 3)",
    { baseId: BASE_ID },
  );

  const sent: { email: string; step: number }[] = [];

  for (const row of rows) {
    if (sent.length >= DAILY_CAP) return { checked: rows.length, sent, cappedAt: DAILY_CAP };

    const f = row.fields;
    const deliveredRaw = f["Delivered Date"];
    if (!deliveredRaw || typeof deliveredRaw !== "string") continue;

    const email = String(f["Email"] || "").trim();
    if (!email || isRelayEmail(email)) continue;

    const step = Number(f["Followup Step"]) || 0; // 0..2
    if (step >= STEPS) continue;
    const nextStep = step + 1; // 1..3

    if (daysBetween(deliveredRaw, now) < SCHEDULE[step]) continue; // not due yet

    const built = buildFollowupEmail(nextStep, {
      name: String(f["First Name"] || "").trim(),
      items: String(f["Items"] || "your order").trim(),
    });
    const html = wrapOrderEmail(built.innerHtml, {
      unsubscribeUrl: unsubscribeUrl(String(f["Unsub Token"] || "")),
      previewText: built.previewText,
    });

    await sendEmail({ to: email, subject: built.subject, html, from: FROM, replyTo: REPLY_TO });
    await updateRecord(
      TABLE,
      row.id,
      { "Followup Step": nextStep, "Last Followup Sent": todayISO(now) },
      { baseId: BASE_ID },
    );
    sent.push({ email, step: nextStep });
  }

  return { checked: rows.length, sent };
}

// ---------------------------------------------------------------------------
// Unsubscribe
// ---------------------------------------------------------------------------

export async function unsubscribeOrderByToken(tok: string): Promise<"ok" | "not-found"> {
  if (!isAirtableConfigured(BASE_ID) || !tok) return "not-found";
  const rows = await listRecords(TABLE, `{Unsub Token} = "${tok.replace(/"/g, "")}"`, {
    baseId: BASE_ID,
  });
  if (rows.length === 0) return "not-found";
  await Promise.all(
    rows.map((r) => updateRecord(TABLE, r.id, { Unsubscribed: true }, { baseId: BASE_ID })),
  );
  return "ok";
}
