/**
 * Small Airtable REST client. Server-side only — AIRTABLE_API_KEY must never
 * reach the browser.
 *
 * One shared Personal Access Token (AIRTABLE_API_KEY) is scoped to multiple
 * bases — each feature gets its own base (Road & Trail Crew, Testimonials,
 * and more to come) to spread record/attachment counts across the free
 * plan's per-base limits instead of stacking everything into one. Every
 * function here takes an explicit `baseId`; AIRTABLE_BASE_ID is only a
 * default for callers that don't pass one (kept for the original Road &
 * Trail Crew tables — Applications, Ambassadors, etc.).
 */

const BASE_URL = "https://api.airtable.com/v0";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AirtableFields = Record<string, any>;

export interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: AirtableFields;
}

function config(baseId?: string) {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const resolvedBaseId = baseId || process.env.AIRTABLE_BASE_ID;
  if (!apiKey || !resolvedBaseId) return null;
  return { apiKey, baseId: resolvedBaseId };
}

/** Pass a specific `baseId` to check a non-default base's config; omitted,
 *  checks the default Road & Trail Crew base. */
export function isAirtableConfigured(baseId?: string) {
  return config(baseId) !== null;
}

async function request(
  table: string,
  path = "",
  init: RequestInit & { revalidate?: number; baseId?: string } = {},
) {
  const { revalidate, baseId, ...fetchInit } = init;
  const cfg = config(baseId);
  if (!cfg) throw new Error("Airtable is not configured (missing AIRTABLE_API_KEY or a base ID).");

  const res = await fetch(`${BASE_URL}/${cfg.baseId}/${encodeURIComponent(table)}${path}`, {
    ...fetchInit,
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
      ...fetchInit.headers,
    },
    // Admin/tracking reads stay always-fresh (no-store) by default. Public-facing
    // reads (e.g. approved testimonials on a page every visitor hits) can pass
    // `revalidate` to use Next's fetch cache instead of hitting Airtable's API
    // on every single page load.
    ...(revalidate !== undefined ? { next: { revalidate } } : { cache: "no-store" as const }),
  });
  if (!res.ok) {
    throw new Error(`Airtable request failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/** Lists all records in a table, optionally filtered, following pagination (offset) automatically.
 *  Pass `revalidate` (seconds) for public-facing reads that should be cached rather than
 *  hitting Airtable fresh on every request. Pass `baseId` to target a base other than the
 *  default (AIRTABLE_BASE_ID). */
export async function listRecords(
  table: string,
  filterByFormula?: string,
  options?: { revalidate?: number; baseId?: string },
): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams();
    if (filterByFormula) params.set("filterByFormula", filterByFormula);
    if (offset) params.set("offset", offset);
    const query = params.toString();

    const data = (await request(table, query ? `?${query}` : "", {
      revalidate: options?.revalidate,
      baseId: options?.baseId,
    })) as {
      records: AirtableRecord[];
      offset?: string;
    };
    records.push(...data.records);
    offset = data.offset;
  } while (offset);

  return records;
}

export async function createRecord(
  table: string,
  fields: AirtableFields,
  options?: { baseId?: string },
): Promise<AirtableRecord> {
  return request(table, "", { method: "POST", body: JSON.stringify({ fields }), baseId: options?.baseId });
}

export async function updateRecord(
  table: string,
  recordId: string,
  fields: AirtableFields,
  options?: { baseId?: string },
): Promise<AirtableRecord> {
  return request(table, `/${recordId}`, {
    method: "PATCH",
    body: JSON.stringify({ fields }),
    baseId: options?.baseId,
  });
}

const CONTENT_BASE_URL = "https://content.airtable.com/v0";

/** Uploads a file directly to an attachment field on an existing record —
 *  Airtable's content API accepts the file inline as base64, no public URL
 *  needed. Call once per file for a multipleAttachments field; each call
 *  appends rather than replaces. */
export async function uploadAttachment(
  recordId: string,
  fieldName: string,
  file: { filename: string; contentType: string; base64: string },
  options?: { baseId?: string },
): Promise<void> {
  const cfg = config(options?.baseId);
  if (!cfg) throw new Error("Airtable is not configured (missing AIRTABLE_API_KEY or a base ID).");

  const res = await fetch(
    `${CONTENT_BASE_URL}/${cfg.baseId}/${recordId}/${encodeURIComponent(fieldName)}/uploadAttachment`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contentType: file.contentType, file: file.base64, filename: file.filename }),
    },
  );
  if (!res.ok) {
    throw new Error(`Airtable attachment upload failed: ${res.status} ${await res.text()}`);
  }
}
