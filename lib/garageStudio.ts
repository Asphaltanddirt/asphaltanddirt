import { createRecord, listRecords, updateRecord, isAirtableConfigured, type AirtableRecord } from "@/lib/airtable";
import { STUDIO_TABLES, type StudioField, type StudioTableKey } from "@/lib/studioConfig";

/** Reads and writes the Podcast Production base for the Garage Studio
 *  screens, using the field lists in lib/studioConfig.ts. Owners only. */

const BASE_ID = process.env.AIRTABLE_PODCAST_PRODUCTION_BASE_ID;

export type StudioValue = string | boolean | string[];
export interface StudioRecord {
  id: string;
  title: string;
  group: string;
  values: Record<string, StudioValue>;
}
export interface LinkOption {
  id: string;
  name: string;
}

function assertConfigured() {
  if (!isAirtableConfigured(BASE_ID)) throw new Error("Podcast Production base is not configured.");
}

function readValue(field: StudioField, raw: unknown): StudioValue {
  if (field.kind === "checkbox") return raw === true;
  if (field.kind === "links") return Array.isArray(raw) ? (raw as string[]) : [];
  if (field.kind === "number") return typeof raw === "number" ? String(raw) : "";
  if (field.kind === "date") return typeof raw === "string" ? raw.slice(0, 10) : "";
  return typeof raw === "string" ? raw : "";
}

function toStudioRecord(key: StudioTableKey, r: AirtableRecord): StudioRecord {
  const t = STUDIO_TABLES[key];
  return {
    id: r.id,
    title: typeof r.fields[t.titleField] === "string" ? (r.fields[t.titleField] as string) : "",
    group: typeof r.fields[t.groupField] === "string" ? (r.fields[t.groupField] as string) : "",
    values: Object.fromEntries(t.fields.map((f) => [f.key, readValue(f, r.fields[f.field])])),
  };
}

export async function listStudioRecords(key: StudioTableKey): Promise<StudioRecord[]> {
  assertConfigured();
  const records = await listRecords(STUDIO_TABLES[key].table, undefined, { baseId: BASE_ID });
  return records.map((r) => toStudioRecord(key, r));
}

export async function getStudioRecord(key: StudioTableKey, id: string): Promise<StudioRecord | null> {
  assertConfigured();
  if (!/^rec[A-Za-z0-9]{14}$/.test(id)) return null;
  const [record] = await listRecords(STUDIO_TABLES[key].table, `RECORD_ID() = '${id}'`, { baseId: BASE_ID });
  return record ? toStudioRecord(key, record) : null;
}

/** Id + name of every record in the tables this one links to. */
export async function getLinkOptions(key: StudioTableKey): Promise<Record<string, LinkOption[]>> {
  const targets = [...new Set(STUDIO_TABLES[key].fields.filter((f) => f.kind === "links").map((f) => f.linkTo!))];
  const lists = await Promise.all(
    targets.map(async (target) => {
      const records = await listStudioRecords(target);
      return [target, records.map((r) => ({ id: r.id, name: r.title || "(untitled)" })).sort((a, b) => a.name.localeCompare(b.name))] as const;
    }),
  );
  return Object.fromEntries(lists);
}

/** Checks the form's values against the table's field list and turns them
 *  into Airtable fields. Returns an error message or the fields. */
export async function toAirtableFields(key: StudioTableKey, values: Record<string, unknown>): Promise<Record<string, unknown> | string> {
  const t = STUDIO_TABLES[key];
  const options = await getLinkOptions(key);
  const out: Record<string, unknown> = {};
  for (const f of t.fields) {
    if (!(f.key in values)) continue;
    const v = values[f.key];
    switch (f.kind) {
      case "checkbox":
        out[f.field] = v === true;
        break;
      case "links": {
        const known = new Set((options[f.linkTo!] || []).map((o) => o.id));
        out[f.field] = Array.isArray(v) ? v.filter((id): id is string => typeof id === "string" && known.has(id)) : [];
        break;
      }
      case "select": {
        const s = typeof v === "string" ? v : "";
        if (s && !f.options!.includes(s)) return `Pick a ${f.label.toLowerCase()} from the list.`;
        out[f.field] = s || null;
        break;
      }
      case "number": {
        const s = typeof v === "string" ? v.trim() : "";
        if (s && !Number.isFinite(Number(s))) return `${f.label} should be a number.`;
        out[f.field] = s ? Number(s) : null;
        break;
      }
      case "date": {
        const s = typeof v === "string" ? v.trim() : "";
        if (s && !/^\d{4}-\d{2}-\d{2}$/.test(s)) return `Pick a real ${f.label.toLowerCase()}.`;
        out[f.field] = s || null;
        break;
      }
      default: {
        const s = typeof v === "string" ? v.trim().slice(0, f.kind === "textarea" ? 100000 : 500) : "";
        if (f.required && !s) return `${f.label} is needed.`;
        if (s && f.kind === "url" && !/^https?:\/\//i.test(s)) return `${f.label} should start with https://`;
        if (s && f.kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return `${f.label} doesn't look like an email.`;
        if (s && f.key === "slug" && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)) return "The slug is lowercase letters, numbers and hyphens.";
        out[f.field] = s || null;
      }
    }
  }
  return out;
}

export async function saveStudioRecord(key: StudioTableKey, id: string | null, fields: Record<string, unknown>): Promise<StudioRecord> {
  assertConfigured();
  const t = STUDIO_TABLES[key];
  const record = id
    ? await updateRecord(t.table, id, fields, { baseId: BASE_ID })
    : await createRecord(t.table, { ...t.defaults, ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null)) }, { baseId: BASE_ID });
  return toStudioRecord(key, record);
}
