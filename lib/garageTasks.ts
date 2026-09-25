import { listRecords, createRecord, updateRecord, isAirtableConfigured, type AirtableFields } from "@/lib/airtable";

/**
 * A&D Garage tasks. Two tables in the Garage base:
 *  - Task Templates: the repeating week (the blog sequence). One row per job,
 *    with the weekday it's due and who owns it.
 *  - Tasks: the real, tickable work. Each Monday the week's tasks are generated
 *    from the active templates; ticking this week off never touches next week.
 *
 * Generated rows carry `Template Key` = "<template key>|<Monday's date>", which
 * is what stops a second run of the generator creating duplicates.
 */

const BASE_ID = process.env.AIRTABLE_GARAGE_BASE_ID;
const TASKS = "Tasks";
const TEMPLATES = "Task Templates";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface GarageTask {
  id: string;
  title: string;
  assignee: string;
  due: string;
  done: boolean;
  details: string;
  link: string;
  /** The template it came from, e.g. "gt-codex". Blank for one-off tasks. */
  templateKey: string;
}

function toTask(r: { id: string; fields: AirtableFields }): GarageTask {
  return {
    id: r.id,
    title: (r.fields.Title as string) || "",
    assignee: ((r.fields.Assignee as string) || "").trim().toLowerCase(),
    due: ((r.fields.Due as string) || "").slice(0, 10),
    done: r.fields.Status === "Done",
    details: (r.fields.Details as string) || "",
    link: (r.fields.Link as string) || "",
    templateKey: (((r.fields["Template Key"] as string) || "").split("|")[0] || "").trim(),
  };
}

/** New York's "today", so a task due Friday stops being today's job at
 *  midnight here rather than at UTC midnight (7 or 8 PM local). */
export function todayNY(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

/** The Monday on or before a date — the week a generated task belongs to. */
export function weekOf(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00Z`);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - ((day + 6) % 7));
  return date.toISOString().slice(0, 10);
}

export async function getTasksFor(email: string): Promise<GarageTask[]> {
  if (!isAirtableConfigured(BASE_ID) || !email) return [];
  // Ask Airtable for this person's rows only. It used to download every task
  // ever made and filter here, on every Garage home load.
  const who = email.trim().toLowerCase().replace(/'/g, "\\'");
  const records = await listRecords(TASKS, `LOWER(TRIM({Assignee})) = '${who}'`, { baseId: BASE_ID });
  return records
    .map(toTask)
    .filter((t) => t.assignee === email.trim().toLowerCase())
    .sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
}

/** Everyone's tasks for the current week — the owners' view of who's behind. */
export async function getWeekTasks(): Promise<GarageTask[]> {
  if (!isAirtableConfigured(BASE_ID)) return [];
  const monday = weekOf(todayNY());
  const sunday = new Date(Date.parse(`${monday}T12:00:00Z`) + 6 * 86_400_000).toISOString().slice(0, 10);
  const records = await listRecords(TASKS, `AND(NOT(IS_BEFORE({Due}, '${monday}')), NOT(IS_AFTER({Due}, '${sunday}')))`, { baseId: BASE_ID });
  return records
    .map(toTask)
    .filter((t) => t.due && weekOf(t.due) === monday)
    .sort((a, b) => a.due.localeCompare(b.due));
}

/** Everyone's tasks due between two dates (inclusive), for the Planning Calendar. */
export async function getTasksBetween(from: string, to: string): Promise<GarageTask[]> {
  if (!isAirtableConfigured(BASE_ID)) return [];
  const records = await listRecords(TASKS, `AND(NOT(IS_BEFORE({Due}, '${from}')), NOT(IS_AFTER({Due}, '${to}')))`, { baseId: BASE_ID });
  return records.map(toTask).sort((a, b) => a.due.localeCompare(b.due));
}

export async function setTaskDone(id: string, done: boolean): Promise<void> {
  if (!isAirtableConfigured(BASE_ID)) throw new Error("A&D Garage base is not configured.");
  await updateRecord(
    TASKS,
    id,
    { Status: done ? "Done" : "To do", "Done At": done ? new Date().toISOString() : null },
    { baseId: BASE_ID },
  );
}

export async function getTask(id: string): Promise<GarageTask | null> {
  if (!isAirtableConfigured(BASE_ID)) return null;
  const records = await listRecords(TASKS, `RECORD_ID() = '${id}'`, { baseId: BASE_ID });
  return records[0] ? toTask(records[0]) : null;
}

/** Creates this week's tasks from the active templates. Safe to run daily:
 *  anything already generated for the week is skipped. Returns what it made. */
export async function generateWeek(reference = todayNY()): Promise<string[]> {
  if (!isAirtableConfigured(BASE_ID)) return [];
  const monday = weekOf(reference);
  const [templates, existing] = await Promise.all([
    listRecords(TEMPLATES, `{Active} = TRUE()`, { baseId: BASE_ID }),
    listRecords(TASKS, undefined, { baseId: BASE_ID }),
  ]);
  const already = new Set(existing.map((r) => (r.fields["Template Key"] as string) || ""));
  const made: string[] = [];

  for (const template of templates.sort((a, b) => Number(a.fields.Sort || 0) - Number(b.fields.Sort || 0))) {
    const key = `${template.fields.Key as string}|${monday}`;
    if (!template.fields.Key || already.has(key)) continue;

    const dayIndex = WEEKDAYS.indexOf((template.fields.Weekday as string) || "Monday");
    const due = new Date(`${monday}T12:00:00Z`);
    due.setUTCDate(due.getUTCDate() + ((dayIndex + 6) % 7));

    await createRecord(
      TASKS,
      {
        Title: template.fields.Title,
        Assignee: template.fields.Assignee,
        Due: due.toISOString().slice(0, 10),
        Status: "To do",
        Details: template.fields.Details || "",
        ...(template.fields.Link ? { Link: template.fields.Link } : {}),
        "Template Key": key,
      },
      { baseId: BASE_ID, typecast: true },
    );
    made.push(key);
  }
  return made;
}
