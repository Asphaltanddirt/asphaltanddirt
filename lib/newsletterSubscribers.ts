import {
  listRecords,
  createRecord,
  updateRecord,
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

export type SubscribeOutcome = "subscribed" | "already-subscribed" | "resubscribed" | "topics-updated";

/** The two standing lists a subscriber can be on. Newsletter = weekly digest
 *  + welcome drip. Event Updates = general "notify me about new meetups"
 *  interest — separate from RSVPing to one specific event. */
export type Topic = "Newsletter" | "Event Updates";
export const ALL_TOPICS: Topic[] = ["Newsletter", "Event Updates"];

export interface NewsletterRecipient {
  email: string;
  firstName: string;
  token: string;
}

export interface SubscriberPreferences {
  email: string;
  firstName: string;
  phone: string;
  topics: Topic[];
  state: "Active" | "Cancelled" | "Bounced" | string;
}

export interface AddSubscriberResult {
  outcome: SubscribeOutcome;
  /** The subscriber's record id + unsubscribe token — present on
   *  "subscribed" and "resubscribed" so the caller can fire welcome email 1. */
  id?: string;
  token?: string;
}

/** Adds (or reactivates) a subscriber. Idempotent — safe to call for an
 *  email that's already on the list. Matches on (Email, Brand). Topics are
 *  merged into whatever the record already has, never replaced — someone
 *  re-subscribing to Newsletter keeps their existing Event Updates opt-in. */
export async function addSubscriber(input: {
  email: string;
  source?: string;
  firstName?: string;
  phone?: string;
  topics?: Topic[];
  brand?: string;
}): Promise<AddSubscriberResult> {
  assertConfigured();
  const email = input.email.trim().toLowerCase();
  const brand = input.brand || DEFAULT_BRAND;
  const topics = input.topics && input.topics.length > 0 ? input.topics : (["Newsletter"] as Topic[]);

  const existing = await listRecords(
    TABLE,
    `AND(LOWER({Email}) = '${escapeFormulaString(email)}', {Brand} = '${escapeFormulaString(brand)}')`,
    { baseId: BASE_ID },
  );
  const record = existing[0];

  if (record) {
    const existingTopics = (record.fields.Topics as Topic[]) || [];
    const mergedTopics = Array.from(new Set([...existingTopics, ...topics]));
    const alreadyActive = (record.fields.State as string) === "Active";
    const gainedNewTopic = mergedTopics.length > existingTopics.length;

    if (alreadyActive && !gainedNewTopic) return { outcome: "already-subscribed" };

    const token = (record.fields["Unsubscribe Token"] as string) || newToken();
    await updateRecord(
      TABLE,
      record.id,
      {
        State: "Active",
        Topics: mergedTopics,
        ...(alreadyActive ? {} : { "Subscribed Date": todayISODate(), "Unsubscribed Date": null }),
        ...(record.fields["Unsubscribe Token"] ? {} : { "Unsubscribe Token": token }),
        ...(input.source ? { Source: input.source } : {}),
        ...(input.firstName && !record.fields["First Name"] ? { "First Name": input.firstName } : {}),
        ...(input.phone ? { Phone: input.phone } : {}),
      },
      { baseId: BASE_ID },
    );
    // Reactivating from Cancelled/Bounced counts as "resubscribed" (may
    // re-enter the welcome drip); merely adding a topic to an already-Active
    // subscriber is "topics-updated" — it must NOT re-trigger welcome email 1.
    return { outcome: alreadyActive ? "topics-updated" : "resubscribed", id: record.id, token };
  }

  const token = newToken();
  const fields: AirtableFields = {
    Email: email,
    Brand: brand,
    State: "Active",
    Topics: topics,
    "Subscribed Date": todayISODate(),
    "Unsubscribe Token": token,
    "Welcome Step": 0,
  };
  if (input.source) fields.Source = input.source;
  if (input.firstName) fields["First Name"] = input.firstName;
  if (input.phone) fields.Phone = input.phone;

  const created = await createRecord(TABLE, fields, { baseId: BASE_ID, typecast: true });
  return { outcome: "subscribed", id: created.id, token };
}

/** Every Active subscriber on `topic` for a brand, with the token used to
 *  build their personal unsubscribe link. Rows missing an email or token
 *  are dropped. Topic defaults to Newsletter (the weekly digest list). */
export async function listActiveRecipients(
  brand: string = DEFAULT_BRAND,
  topic: Topic = "Newsletter",
): Promise<NewsletterRecipient[]> {
  assertConfigured();
  const records = await listRecords(
    TABLE,
    `AND({State} = 'Active', {Brand} = '${escapeFormulaString(brand)}', FIND('${escapeFormulaString(topic)}', ARRAYJOIN({Topics})))`,
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
    `AND({State} = 'Active', FIND('Newsletter', ARRAYJOIN({Topics})), OR({Welcome Step} = BLANK(), {Welcome Step} < ${maxStep}))`,
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

/** Flips a subscriber to Cancelled (drops every topic) by their unsubscribe
 *  token. Idempotent. This is the RFC 8058 one-click target referenced by
 *  List-Unsubscribe headers — it must stay a single, total unsubscribe with
 *  no extra interaction. For "drop just one topic," see updateTopicsByToken. */
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
      { State: "Cancelled", Topics: [], "Unsubscribed Date": todayISODate() },
      { baseId: BASE_ID },
    );
  }
  return { ok: true, email: (record.fields.Email as string) || undefined };
}

/** Looks up a subscriber by their token for the /manage preferences page. */
export async function getSubscriberByToken(token: string): Promise<SubscriberPreferences | null> {
  assertConfigured();
  const clean = token.trim();
  if (!clean) return null;

  const records = await listRecords(
    TABLE,
    `{Unsubscribe Token} = '${escapeFormulaString(clean)}'`,
    { baseId: BASE_ID },
  );
  const record = records[0];
  if (!record) return null;

  return {
    email: (record.fields.Email as string) || "",
    firstName: (record.fields["First Name"] as string) || "",
    phone: (record.fields.Phone as string) || "",
    topics: (record.fields.Topics as Topic[]) || [],
    state: (record.fields.State as string) || "Cancelled",
  };
}

/** Sets a subscriber's topic list exactly (not merged) by their token — the
 *  /manage page's "save my choices" action. Dropping to zero topics is the
 *  same as unsubscribing from everything; State reflects that. */
export async function updateTopicsByToken(
  token: string,
  topics: Topic[],
): Promise<{ ok: boolean; email?: string }> {
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

  const active = topics.length > 0;
  await updateRecord(
    TABLE,
    record.id,
    {
      Topics: topics,
      State: active ? "Active" : "Cancelled",
      ...(active ? {} : { "Unsubscribed Date": todayISODate() }),
    },
    { baseId: BASE_ID },
  );
  return { ok: true, email: (record.fields.Email as string) || undefined };
}
