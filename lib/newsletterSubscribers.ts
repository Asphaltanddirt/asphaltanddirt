import {
  listRecords,
  createRecord,
  updateRecord,
  upsertRecords,
  isAirtableConfigured,
  type AirtableFields,
} from "@/lib/airtable";

// Own base (not Road & Trail Crew, Testimonials, or Build Submissions) —
// keeps its record count independent on the free plan. Airtable is the
// source of truth for the subscriber list; email is sent from our own
// code over this list (see lib/newsletterSend.ts), not from a third-party
// ESP's contact store.
const BASE_ID = process.env.AIRTABLE_NEWSLETTER_BASE_ID;
const TABLE = process.env.AIRTABLE_NEWSLETTER_TABLE || "Subscribers";

/** The list is multi-brand — one row per (email, brand). This is the only
 *  brand today; siblings get their own value when they come online. */
export const DEFAULT_BRAND = "Asphalt & Dirt";

function assertConfigured() {
  if (!isAirtableConfigured(BASE_ID)) {
    throw new Error("Newsletter base is not configured (missing AIRTABLE_NEWSLETTER_BASE_ID).");
  }
}

/** filterByFormula string literals are single-quoted — escape any quote in
 *  the interpolated value so it can't break out of the literal. */
function escapeFormulaString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function newToken() {
  return globalThis.crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// Subscribe / unsubscribe — Airtable as source of truth
// ---------------------------------------------------------------------------

export type SubscribeOutcome = "subscribed" | "already-subscribed" | "resubscribed";

export interface NewsletterRecipient {
  email: string;
  firstName: string;
  token: string;
}

export interface AddSubscriberResult {
  outcome: SubscribeOutcome;
  /** The subscriber's record id + unsubscribe token — present on
   *  "subscribed" and "resubscribed" so the caller can fire welcome email 1. */
  id?: string;
  token?: string;
}

/** Adds (or reactivates) a subscriber. Idempotent — safe to call for an
 *  email that's already on the list. Matches on (Email, Brand). */
export async function addSubscriber(input: {
  email: string;
  source?: string;
  firstName?: string;
  brand?: string;
}): Promise<AddSubscriberResult> {
  assertConfigured();
  const email = input.email.trim().toLowerCase();
  const brand = input.brand || DEFAULT_BRAND;

  const existing = await listRecords(
    TABLE,
    `AND(LOWER({Email}) = '${escapeFormulaString(email)}', {Brand} = '${escapeFormulaString(brand)}')`,
    { baseId: BASE_ID },
  );
  const record = existing[0];

  if (record) {
    if ((record.fields.State as string) === "Active") return { outcome: "already-subscribed" };
    // Cancelled or Bounced -> reactivate, keeping the existing unsubscribe token if it has one.
    const token = (record.fields["Unsubscribe Token"] as string) || newToken();
    await updateRecord(
      TABLE,
      record.id,
      {
        State: "Active",
        "Subscribed Date": todayISODate(),
        "Unsubscribed Date": null,
        ...(record.fields["Unsubscribe Token"] ? {} : { "Unsubscribe Token": token }),
        ...(input.source ? { Source: input.source } : {}),
      },
      { baseId: BASE_ID },
    );
    return { outcome: "resubscribed", id: record.id, token };
  }

  const token = newToken();
  const fields: AirtableFields = {
    Email: email,
    Brand: brand,
    State: "Active",
    "Subscribed Date": todayISODate(),
    "Unsubscribe Token": token,
    "Welcome Step": 0,
  };
  if (input.source) fields.Source = input.source;
  if (input.firstName) fields["First Name"] = input.firstName;

  const created = await createRecord(TABLE, fields, { baseId: BASE_ID, typecast: true });
  return { outcome: "subscribed", id: created.id, token };
}

/** Every Active subscriber for a brand, with the token used to build their
 *  personal unsubscribe link. Rows missing an email or token are dropped. */
export async function listActiveRecipients(brand: string = DEFAULT_BRAND): Promise<NewsletterRecipient[]> {
  assertConfigured();
  const records = await listRecords(
    TABLE,
    `AND({State} = 'Active', {Brand} = '${escapeFormulaString(brand)}')`,
    { baseId: BASE_ID },
  );
  return records
    .map((r) => ({
      email: ((r.fields.Email as string) || "").trim(),
      firstName: ((r.fields["First Name"] as string) || "").trim(),
      token: (r.fields["Unsubscribe Token"] as string) || "",
    }))
    .filter((r) => r.email && r.token);
}

export interface WelcomeCandidate {
  id: string;
  email: string;
  firstName: string;
  token: string;
  brand: string;
  welcomeStep: number;
  subscribedDate: string; // YYYY-MM-DD
}

/** Active subscribers who haven't finished the welcome sequence
 *  (Welcome Step < `maxStep`). The cron paces the rest. */
export async function listWelcomeCandidates(maxStep: number): Promise<WelcomeCandidate[]> {
  assertConfigured();
  const records = await listRecords(
    TABLE,
    `AND({State} = 'Active', OR({Welcome Step} = BLANK(), {Welcome Step} < ${maxStep}))`,
    { baseId: BASE_ID },
  );
  return records
    .map((r) => ({
      id: r.id,
      email: ((r.fields.Email as string) || "").trim(),
      firstName: ((r.fields["First Name"] as string) || "").trim(),
      token: (r.fields["Unsubscribe Token"] as string) || "",
      brand: (r.fields.Brand as string) || DEFAULT_BRAND,
      welcomeStep: (r.fields["Welcome Step"] as number) || 0,
      subscribedDate: ((r.fields["Subscribed Date"] as string) || "").slice(0, 10),
    }))
    .filter((r) => r.email && r.token && r.subscribedDate);
}

/** Records that welcome-sequence email `step` was sent to a subscriber. */
export async function stampWelcomeStep(recordId: string, step: number): Promise<void> {
  assertConfigured();
  await updateRecord(
    TABLE,
    recordId,
    { "Welcome Step": step, "Last Welcome Sent": todayISODate() },
    { baseId: BASE_ID },
  );
}

/** Flips a subscriber to Cancelled by their unsubscribe token. Idempotent. */
export async function unsubscribeByToken(token: string): Promise<{ ok: boolean; email?: string }> {
  assertConfigured();
  const clean = token.trim();
  if (!clean) return { ok: false };

  const records = await listRecords(
    TABLE,
    `{Unsubscribe Token} = '${escapeFormulaString(clean)}'`,
    { baseId: BASE_ID },
  );
  const record = records[0];
  if (!record) return { ok: false };

  if ((record.fields.State as string) !== "Cancelled") {
    await updateRecord(
      TABLE,
      record.id,
      { State: "Cancelled", "Unsubscribed Date": todayISODate() },
      { baseId: BASE_ID },
    );
  }
  return { ok: true, email: (record.fields.Email as string) || undefined };
}

// ---------------------------------------------------------------------------
// One-time Kit -> Airtable migration
// ---------------------------------------------------------------------------
// Kept only to pull the existing Kit subscribers into Airtable once. After
// that migration, Airtable is authoritative and /api/subscribe writes here
// directly — Kit is out of the loop.

const KIT_STATE_LABELS: Record<string, string> = {
  active: "Active",
  cancelled: "Cancelled",
  bounced: "Bounced",
};

interface KitSubscriber {
  id: number;
  state: string;
  first_name: string | null;
  email_address: string;
  created_at: string;
}

interface KitSubscribersResponse {
  subscribers: KitSubscriber[];
  pagination: { has_next_page: boolean; end_cursor: string | null };
}

async function fetchAllKitSubscribers(apiKey: string): Promise<KitSubscriber[]> {
  const subscribers: KitSubscriber[] = [];
  let after: string | undefined;

  do {
    const params = new URLSearchParams({ per_page: "500" });
    if (after) params.set("after", after);

    const res = await fetch(`https://api.kit.com/v4/subscribers?${params}`, {
      headers: { "X-Kit-Api-Key": apiKey },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Kit subscribers request failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as KitSubscribersResponse;
    subscribers.push(...data.subscribers);
    after = data.pagination.has_next_page ? (data.pagination.end_cursor ?? undefined) : undefined;
  } while (after);

  return subscribers;
}

/** Pulls every subscriber from Kit and upserts them into the Newsletter
 *  base, matched on Kit ID. Assigns the current brand and a fresh
 *  unsubscribe token to any row that doesn't have one yet. Returns the
 *  count synced. */
export async function syncNewsletterSubscribers(): Promise<number> {
  const kitApiKey = process.env.KIT_API_KEY;
  if (!kitApiKey) throw new Error("Kit is not configured (missing KIT_API_KEY).");
  assertConfigured();

  const subscribers = await fetchAllKitSubscribers(kitApiKey);
  const now = new Date().toISOString();

  // Existing rows keyed by Kit ID so we only mint a token / set brand once.
  const existing = await listRecords(TABLE, undefined, { baseId: BASE_ID });
  const byKitId = new Map<number, (typeof existing)[number]>();
  for (const r of existing) {
    const kitId = r.fields["Kit ID"] as number | undefined;
    if (typeof kitId === "number") byKitId.set(kitId, r);
  }

  const records: { fields: AirtableFields }[] = subscribers.map((s) => {
    const prior = byKitId.get(s.id);
    return {
      fields: {
        Email: s.email_address,
        "First Name": s.first_name || "",
        "Kit ID": s.id,
        Brand: (prior?.fields.Brand as string) || DEFAULT_BRAND,
        State: KIT_STATE_LABELS[s.state] || undefined,
        "Subscribed Date": s.created_at.slice(0, 10),
        "Unsubscribe Token": (prior?.fields["Unsubscribe Token"] as string) || newToken(),
        "Last Synced": now,
      },
    };
  });

  await upsertRecords(TABLE, records, ["Kit ID"], { baseId: BASE_ID });
  return records.length;
}
