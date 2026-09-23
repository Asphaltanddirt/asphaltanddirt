import webpush from "web-push";
import { createRecord, deleteRecord, listRecords, updateRecord, isAirtableConfigured, type AirtableFields } from "@/lib/airtable";

/**
 * Web push for the Garage.
 *
 * Subscriptions are per DEVICE, not per person — Jose may install on more than
 * one phone, and each install gets its own endpoint from the push service.
 *
 * iOS only delivers these to an app that was added to the Home Screen, and
 * only after permission was granted from a real tap inside that installed app.
 * Push can also be delayed by Low Power Mode, which is why every caller has an
 * email fallback (see lib/notify.ts) rather than trusting the banner to land.
 */

const BASE_ID = process.env.AIRTABLE_GARAGE_BASE_ID || "apptUHYPJL0wjAuPe";
const TABLE = "Push Subscriptions";

export interface PushDevice {
  id: string;
  label: string;
  email: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  active: boolean;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Where tapping the banner lands. Relative to the site root. */
  url?: string;
  /** Collapses a repeat of the same thing instead of stacking banners. */
  tag?: string;
  /** Keep the banner up until it's dealt with. Used for failures only. */
  requireInteraction?: boolean;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

export function isPushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) && isAirtableConfigured(BASE_ID);
}

export function publicKey() {
  return process.env.VAPID_PUBLIC_KEY || "";
}

function configure() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error("Push is not configured (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).");
  // The subject must be a real contact so a push service can reach us about abuse.
  webpush.setVapidDetails("mailto:team@asphaltanddirt.com", pub, priv);
}

function toDevice(r: { id: string; fields: AirtableFields }): PushDevice {
  const f = r.fields;
  return {
    id: r.id,
    label: str(f.Label),
    email: str(f["User Email"]).trim().toLowerCase(),
    endpoint: str(f.Endpoint),
    p256dh: str(f.P256dh),
    auth: str(f.Auth),
    active: f.Active === true,
  };
}

export async function listDevices(email?: string): Promise<PushDevice[]> {
  if (!isAirtableConfigured(BASE_ID)) return [];
  const rows = await listRecords(TABLE, "{Active} = TRUE()", { baseId: BASE_ID });
  const all = rows.map(toDevice);
  if (!email) return all;
  const wanted = email.trim().toLowerCase();
  return all.filter((d) => d.email === wanted);
}

/** Upsert on endpoint — re-subscribing the same device must not create a second row. */
export async function saveDevice(input: { label: string; email: string; endpoint: string; p256dh: string; auth: string }) {
  if (!isAirtableConfigured(BASE_ID)) throw new Error("The A&D Garage base is not configured.");
  const rows = await listRecords(TABLE, "", { baseId: BASE_ID });
  const existing = rows.find((r) => str(r.fields.Endpoint) === input.endpoint);
  const fields: AirtableFields = {
    Label: input.label,
    "User Email": input.email,
    Endpoint: input.endpoint,
    P256dh: input.p256dh,
    Auth: input.auth,
    Active: true,
    "Last Error": "",
  };
  if (existing) {
    await updateRecord(TABLE, existing.id, fields, { baseId: BASE_ID });
    return existing.id;
  }
  const created = await createRecord(TABLE, { ...fields, "Created At": new Date().toISOString() }, { baseId: BASE_ID });
  return created.id;
}

export async function removeDevice(endpoint: string) {
  if (!isAirtableConfigured(BASE_ID)) return;
  const rows = await listRecords(TABLE, "", { baseId: BASE_ID });
  const existing = rows.find((r) => str(r.fields.Endpoint) === endpoint);
  if (existing) await deleteRecord(TABLE, existing.id, { baseId: BASE_ID });
}

async function retire(device: PushDevice, reason: string) {
  try {
    await updateRecord(TABLE, device.id, { Active: false, "Last Error": reason }, { baseId: BASE_ID });
  } catch {
    // Losing the bookkeeping must never take down the send.
  }
}

export interface SendResult {
  sent: number;
  failed: number;
  retired: number;
  errors: string[];
}

/**
 * Send to every active device for a person. A 404 or 410 means the browser
 * threw the subscription away (app deleted, permission revoked) — that device
 * is retired rather than retried forever.
 */
export async function sendToUser(email: string, payload: PushPayload): Promise<SendResult> {
  const result: SendResult = { sent: 0, failed: 0, retired: 0, errors: [] };
  if (!isPushConfigured()) {
    result.errors.push("Push is not configured.");
    return result;
  }
  configure();

  const devices = await listDevices(email);
  if (devices.length === 0) {
    result.errors.push("No active device.");
    return result;
  }

  const body = JSON.stringify(payload);
  for (const device of devices) {
    try {
      await webpush.sendNotification(
        { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
        body,
        { TTL: 3600, urgency: "high" },
      );
      result.sent += 1;
      try {
        await updateRecord(TABLE, device.id, { "Last Sent At": new Date().toISOString() }, { baseId: BASE_ID });
      } catch {
        // Bookkeeping only.
      }
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      const message = err instanceof Error ? err.message : String(err);
      result.failed += 1;
      result.errors.push(`${device.label || device.endpoint.slice(0, 40)}: ${message}`);
      if (status === 404 || status === 410) {
        await retire(device, `Gone (${status}) ${new Date().toISOString()}`);
        result.retired += 1;
      }
    }
  }
  return result;
}
