import { listRecords, createRecord, updateRecord, isAirtableConfigured, type AirtableFields } from "@/lib/airtable";
import { todayNY } from "@/lib/garageTasks";

/**
 * Dated nudges on the Garage home screen — the things that aren't weekly work
 * but must not be forgotten (the monthly AI citation check, the retention
 * cleanup the privacy policy promises).
 *
 * A reminder shows from a week before its date. Marking it done either retires
 * it or rolls the date forward, so a repeating one never needs re-adding.
 */

const BASE_ID = process.env.AIRTABLE_GARAGE_BASE_ID;
const TABLE = "Reminders";
const SHOW_DAYS_AHEAD = 7;

export type ReminderRepeat = "None" | "Monthly" | "Quarterly" | "Yearly";
export type ReminderFor = "Owners" | "Everyone" | "Just me";

export interface GarageReminder {
  id: string;
  title: string;
  date: string;
  repeat: ReminderRepeat;
  audience: ReminderFor;
  ownerEmail: string;
  notes: string;
}

function toReminder(r: { id: string; fields: AirtableFields }): GarageReminder {
  return {
    id: r.id,
    title: (r.fields.Title as string) || "",
    date: ((r.fields.Date as string) || "").slice(0, 10),
    repeat: (r.fields.Repeat as ReminderRepeat) || "None",
    audience: (r.fields.For as ReminderFor) || "Owners",
    ownerEmail: ((r.fields["Owner Email"] as string) || "").trim().toLowerCase(),
    notes: (r.fields.Notes as string) || "",
  };
}

/** What this person should see today: theirs, plus the ones for their role,
 *  from a week before the date onwards. */
export async function getDueReminders(email: string, isOwner: boolean): Promise<GarageReminder[]> {
  if (!isAirtableConfigured(BASE_ID)) return [];
  const records = await listRecords(TABLE, `{Active} = TRUE()`, { baseId: BASE_ID });
  const today = todayNY();
  const horizon = new Date(`${today}T12:00:00Z`);
  horizon.setUTCDate(horizon.getUTCDate() + SHOW_DAYS_AHEAD);
  const until = horizon.toISOString().slice(0, 10);
  const me = email.trim().toLowerCase();

  return records
    .map(toReminder)
    .filter((r) => r.date && r.date <= until)
    .filter((r) =>
      r.audience === "Everyone" ||
      (r.audience === "Owners" && isOwner) ||
      (r.audience === "Just me" && r.ownerEmail === me),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function addReminder(input: {
  title: string;
  date: string;
  repeat: ReminderRepeat;
  audience: ReminderFor;
  notes: string;
  ownerEmail: string;
}): Promise<void> {
  if (!isAirtableConfigured(BASE_ID)) throw new Error("A&D Garage base is not configured.");
  await createRecord(
    TABLE,
    {
      Title: input.title.slice(0, 120),
      Date: input.date,
      Repeat: input.repeat,
      For: input.audience,
      Notes: input.notes.slice(0, 1000),
      "Owner Email": input.ownerEmail,
      Active: true,
    },
    { baseId: BASE_ID, typecast: true },
  );
}

function rollForward(date: string, repeat: ReminderRepeat): string | null {
  if (repeat === "None") return null;
  const next = new Date(`${date}T12:00:00Z`);
  if (repeat === "Monthly") next.setUTCMonth(next.getUTCMonth() + 1);
  if (repeat === "Quarterly") next.setUTCMonth(next.getUTCMonth() + 3);
  if (repeat === "Yearly") next.setUTCFullYear(next.getUTCFullYear() + 1);
  return next.toISOString().slice(0, 10);
}

/** Done: a one-off switches off, a repeating one moves to its next date. */
export async function completeReminder(id: string): Promise<void> {
  if (!isAirtableConfigured(BASE_ID)) throw new Error("A&D Garage base is not configured.");
  const records = await listRecords(TABLE, `RECORD_ID() = '${id}'`, { baseId: BASE_ID });
  const record = records[0];
  if (!record) return;
  const reminder = toReminder(record);
  const next = rollForward(reminder.date, reminder.repeat);
  await updateRecord(
    TABLE,
    id,
    next ? { Date: next, "Last Done": todayNY() } : { Active: false, "Last Done": todayNY() },
    { baseId: BASE_ID },
  );
}
