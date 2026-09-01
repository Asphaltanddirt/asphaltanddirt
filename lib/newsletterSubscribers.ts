import { upsertRecords, isAirtableConfigured, type AirtableFields } from "@/lib/airtable";

// Own base (not Road & Trail Crew, Testimonials, or Build Submissions) —
// keeps its record count independent on the free plan.
const BASE_ID = process.env.AIRTABLE_NEWSLETTER_BASE_ID;
const TABLE = process.env.AIRTABLE_NEWSLETTER_TABLE || "Subscribers";

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
 *  base, matched on Kit ID. Returns the count synced. Throws on failure —
 *  callers (the admin route) surface that to whoever clicked the button. */
export async function syncNewsletterSubscribers(): Promise<number> {
  const kitApiKey = process.env.KIT_API_KEY;
  if (!kitApiKey) throw new Error("Kit is not configured (missing KIT_API_KEY).");
  if (!isAirtableConfigured(BASE_ID)) throw new Error("Newsletter base is not configured (missing AIRTABLE_NEWSLETTER_BASE_ID).");

  const subscribers = await fetchAllKitSubscribers(kitApiKey);
  const now = new Date().toISOString();

  const records: { fields: AirtableFields }[] = subscribers.map((s) => ({
    fields: {
      Email: s.email_address,
      "First Name": s.first_name || "",
      "Kit ID": s.id,
      State: KIT_STATE_LABELS[s.state] || undefined,
      "Subscribed Date": s.created_at.slice(0, 10), // ISO date, no time component
      "Last Synced": now,
    },
  }));

  await upsertRecords(TABLE, records, ["Kit ID"], { baseId: BASE_ID });
  return records.length;
}
