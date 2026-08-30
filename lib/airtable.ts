/**
 * Small Airtable REST client for the Road & Trail Crew base.
 * Server-side only — AIRTABLE_API_KEY must never reach the browser.
 */

const BASE_URL = "https://api.airtable.com/v0";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AirtableFields = Record<string, any>;

export interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: AirtableFields;
}

function config() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!apiKey || !baseId) return null;
  return { apiKey, baseId };
}

export function isAirtableConfigured() {
  return config() !== null;
}

async function request(table: string, path = "", init: RequestInit = {}) {
  const cfg = config();
  if (!cfg) throw new Error("Airtable is not configured (missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID).");

  const res = await fetch(`${BASE_URL}/${cfg.baseId}/${encodeURIComponent(table)}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Airtable request failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/** Lists all records in a table, optionally filtered, following pagination (offset) automatically. */
export async function listRecords(table: string, filterByFormula?: string): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams();
    if (filterByFormula) params.set("filterByFormula", filterByFormula);
    if (offset) params.set("offset", offset);
    const query = params.toString();

    const data = (await request(table, query ? `?${query}` : "")) as { records: AirtableRecord[]; offset?: string };
    records.push(...data.records);
    offset = data.offset;
  } while (offset);

  return records;
}

export async function createRecord(table: string, fields: AirtableFields): Promise<AirtableRecord> {
  return request(table, "", { method: "POST", body: JSON.stringify({ fields }) });
}

export async function updateRecord(table: string, recordId: string, fields: AirtableFields): Promise<AirtableRecord> {
  return request(table, `/${recordId}`, { method: "PATCH", body: JSON.stringify({ fields }) });
}
