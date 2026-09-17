import {
  createRecord,
  deleteRecord,
  listRecords,
  updateRecord,
  uploadAttachment,
  isAirtableConfigured,
  type AirtableRecord,
} from "@/lib/airtable";
import type { GarageSession } from "@/lib/garageAuth";
import {
  EXPENSE_CATEGORIES,
  FINANCE_PEOPLE,
  FINANCE_START,
  INCOME_CATEGORIES,
  PERIODS,
  RECURRING_CATEGORIES,
  type FinancePerson,
  type PeriodKey,
  type TransactionType,
} from "@/lib/financeConfig";

/**
 * Garage → Finance: A&D's money in and out, a P&L, and who owes whom on the
 * 50/50 split (A&D has no bank account of its own yet, so money moves through
 * Jose's and Anthony's own accounts). Storage is the A&D Finance base.
 * Jose + Anthony only (FINANCE_ACCESS below), not every Owner.
 */

// Base IDs aren't secret; the env var wins if it's ever set.
const BASE_ID = process.env.AIRTABLE_FINANCE_BASE_ID || "appgMKCOmQCeps8Ja";
const TRANSACTIONS = "Transactions";
const RECURRING = "Recurring";

const FINANCE_ACCESS = ["jrodrigues1278@gmail.com", "anthony.sed@icloud.com"];

export function canSeeFinance(session: GarageSession | null): boolean {
  return Boolean(session && FINANCE_ACCESS.includes(session.email.trim().toLowerCase()));
}

export interface Transaction {
  id: string;
  description: string;
  date: string;
  type: TransactionType;
  amount: number;
  category: string;
  person: FinancePerson | "";
  receipts: { url: string; name: string }[];
  notes: string;
  source: string;
  enteredBy: string;
}

export interface RecurringCost {
  id: string;
  name: string;
  amount: number;
  category: string;
  cadence: "Monthly" | "Yearly";
  nextDate: string;
  person: FinancePerson | "";
  active: boolean;
  notes: string;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const personOf = (v: unknown): FinancePerson | "" =>
  FINANCE_PEOPLE.some((p) => p.name === v) ? (v as FinancePerson) : "";

function assertConfigured() {
  if (!isAirtableConfigured(BASE_ID)) throw new Error("Finance base is not configured.");
}

function toTransaction(r: AirtableRecord): Transaction {
  const f = r.fields;
  return {
    id: r.id,
    description: str(f.Description),
    date: str(f.Date).slice(0, 10),
    type: (["Income", "Expense", "Settle-up"].includes(str(f.Type)) ? str(f.Type) : "Expense") as TransactionType,
    amount: Math.abs(Number(f.Amount) || 0),
    category: str(f.Category),
    person: personOf(f.Person),
    receipts: ((f.Receipt as { url: string; filename?: string }[] | undefined) || []).map((a) => ({ url: a.url, name: a.filename || "receipt" })),
    notes: str(f.Notes),
    source: str(f.Source) || "Manual",
    enteredBy: str(f["Entered By"]),
  };
}

function toRecurring(r: AirtableRecord): RecurringCost {
  const f = r.fields;
  return {
    id: r.id,
    name: str(f.Name),
    amount: Math.abs(Number(f.Amount) || 0),
    category: str(f.Category),
    cadence: f.Cadence === "Yearly" ? "Yearly" : "Monthly",
    nextDate: str(f["Next Date"]).slice(0, 10),
    person: personOf(f.Person),
    active: f.Active === true,
    notes: str(f.Notes),
  };
}

export async function listTransactions(): Promise<Transaction[]> {
  assertConfigured();
  const records = await listRecords(TRANSACTIONS, undefined, { baseId: BASE_ID });
  return records.map(toTransaction).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  assertConfigured();
  if (!/^rec[A-Za-z0-9]{14}$/.test(id)) return null;
  const [r] = await listRecords(TRANSACTIONS, `RECORD_ID() = '${id}'`, { baseId: BASE_ID });
  return r ? toTransaction(r) : null;
}

export interface TransactionInput {
  description: string;
  date: string;
  type: TransactionType;
  amount: number;
  category: string;
  person: FinancePerson | "";
  notes: string;
}

/** Checks a form's values. Returns an error message or the clean input. */
export function cleanTransaction(body: Record<string, unknown>): TransactionInput | string {
  const text = (k: string, max = 500) => (typeof body[k] === "string" ? (body[k] as string).trim().slice(0, max) : "");
  const type = text("type") as TransactionType;
  if (!["Income", "Expense", "Settle-up"].includes(type)) return "Pick income, expense or settle-up.";
  const amount = Math.round(Number(String(body.amount ?? "").replace(/[$,\s]/g, "")) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) return "Enter an amount above $0.";
  if (amount > 1_000_000) return "That amount looks too big. Check it.";
  const date = text("date", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Pick the date.";
  const person = personOf(text("person"));
  if (!person) return type === "Income" ? "Who received it?" : "Who paid?";
  const category = type === "Settle-up" ? "Settle-up" : text("category");
  const allowed: readonly string[] = type === "Income" ? INCOME_CATEGORIES : type === "Expense" ? EXPENSE_CATEGORIES : ["Settle-up"];
  if (!allowed.includes(category)) return "Pick a category.";
  const description = text("description", 200);
  if (!description && type !== "Settle-up") return "Add a short description.";
  return {
    description: description || `${person} settle-up`,
    date,
    type,
    amount,
    category,
    person,
    notes: text("notes", 5000),
  };
}

export async function saveTransaction(id: string | null, input: TransactionInput, enteredBy: string): Promise<Transaction> {
  assertConfigured();
  const fields = {
    Description: input.description,
    Date: input.date,
    Type: input.type,
    Amount: input.amount,
    Category: input.category,
    Person: input.person,
    Notes: input.notes || null,
  };
  const record = id
    ? await updateRecord(TRANSACTIONS, id, fields, { baseId: BASE_ID })
    : await createRecord(TRANSACTIONS, { ...fields, Source: "Manual", "Entered By": enteredBy }, { baseId: BASE_ID });
  return toTransaction(record);
}

export async function deleteTransaction(id: string): Promise<void> {
  assertConfigured();
  await deleteRecord(TRANSACTIONS, id, { baseId: BASE_ID });
}

export async function addReceipt(id: string, file: { filename: string; contentType: string; base64: string }): Promise<Transaction> {
  assertConfigured();
  await uploadAttachment(id, "Receipt", file, { baseId: BASE_ID });
  const t = await getTransaction(id);
  if (!t) throw new Error("Transaction disappeared after the upload.");
  return t;
}

// ---------------------------------------------------------------------------
// Recurring costs
// ---------------------------------------------------------------------------

export async function listRecurring(): Promise<RecurringCost[]> {
  assertConfigured();
  const records = await listRecords(RECURRING, undefined, { baseId: BASE_ID });
  return records.map(toRecurring).sort((a, b) => Number(b.active) - Number(a.active) || a.nextDate.localeCompare(b.nextDate));
}

export function cleanRecurring(body: Record<string, unknown>): Omit<RecurringCost, "id"> | string {
  const text = (k: string, max = 500) => (typeof body[k] === "string" ? (body[k] as string).trim().slice(0, max) : "");
  const name = text("name", 120);
  if (!name) return "Name it (e.g. Airtable Team).";
  const amount = Math.round(Number(String(body.amount ?? "").replace(/[$,\s]/g, "")) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) return "Enter an amount above $0.";
  const category = text("category");
  if (!(RECURRING_CATEGORIES as readonly string[]).includes(category)) return "Pick a category.";
  const cadence = text("cadence") === "Yearly" ? "Yearly" : "Monthly";
  const nextDate = text("nextDate", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) return "Pick the next charge date.";
  const person = personOf(text("person"));
  if (!person) return "Whose card is it on?";
  return { name, amount, category, cadence, nextDate, person, active: body.active !== false, notes: text("notes", 2000) };
}

export async function saveRecurring(id: string | null, input: Omit<RecurringCost, "id">): Promise<RecurringCost> {
  assertConfigured();
  const fields = {
    Name: input.name,
    Amount: input.amount,
    Category: input.category,
    Cadence: input.cadence,
    "Next Date": input.nextDate,
    Person: input.person,
    Active: input.active,
    Notes: input.notes || null,
  };
  const record = id
    ? await updateRecord(RECURRING, id, fields, { baseId: BASE_ID })
    : await createRecord(RECURRING, fields, { baseId: BASE_ID });
  return toRecurring(record);
}

// ---------------------------------------------------------------------------
// Periods, P&L, settle-up
// ---------------------------------------------------------------------------

export function todayNY(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

const iso = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);

/** Inclusive from/to for a period, plus the same period a year earlier. */
export function periodRange(key: PeriodKey, today = todayNY()) {
  const [y, m] = today.split("-").map(Number);
  const mi = m - 1;
  let from: string;
  let to: string;
  switch (key) {
    case "last-month":
      from = iso(y, mi - 1, 1);
      to = iso(y, mi, 0);
      break;
    case "this-quarter": {
      const q = Math.floor(mi / 3) * 3;
      from = iso(y, q, 1);
      to = iso(y, q + 3, 0);
      break;
    }
    case "this-year":
      from = iso(y, 0, 1);
      to = iso(y, 11, 31);
      break;
    case "last-year":
      from = iso(y - 1, 0, 1);
      to = iso(y - 1, 11, 31);
      break;
    case "all":
      from = FINANCE_START;
      to = today;
      break;
    default:
      from = iso(y, mi, 1);
      to = iso(y, mi + 1, 0);
  }
  const back = (d: string) => `${Number(d.slice(0, 4)) - 1}${d.slice(4)}`;
  return {
    key,
    label: PERIODS.find((p) => p.key === key)?.label || "This month",
    from: from < FINANCE_START ? FINANCE_START : from,
    to,
    lastYearFrom: back(from),
    lastYearTo: back(to),
  };
}

export interface ProfitAndLoss {
  income: { category: string; amount: number; lastYear: number }[];
  expenses: { category: string; amount: number; lastYear: number }[];
  totalIncome: number;
  totalExpenses: number;
  net: number;
  lastYearNet: number;
  hasLastYear: boolean;
  shares: { name: string; amount: number }[];
}

const cents = (n: number) => Math.round(n * 100) / 100;

export function profitAndLoss(all: Transaction[], range: ReturnType<typeof periodRange>): ProfitAndLoss {
  const inRange = (t: Transaction, from: string, to: string) => t.date >= from && t.date <= to;
  const now = all.filter((t) => inRange(t, range.from, range.to));
  const prev = all.filter((t) => inRange(t, range.lastYearFrom, range.lastYearTo));
  const sum = (list: Transaction[], type: TransactionType, category?: string) =>
    cents(list.filter((t) => t.type === type && (!category || t.category === category)).reduce((s, t) => s + t.amount, 0));
  const rows = (type: TransactionType, cats: readonly string[]) =>
    [...cats, ...new Set(now.filter((t) => t.type === type && !cats.includes(t.category)).map((t) => t.category))]
      .map((category) => ({ category, amount: sum(now, type, category), lastYear: sum(prev, type, category) }))
      .filter((r) => r.amount || r.lastYear);
  const totalIncome = sum(now, "Income");
  const totalExpenses = sum(now, "Expense");
  const net = cents(totalIncome - totalExpenses);
  return {
    income: rows("Income", INCOME_CATEGORIES),
    expenses: rows("Expense", EXPENSE_CATEGORIES),
    totalIncome,
    totalExpenses,
    net,
    lastYearNet: cents(sum(prev, "Income") - sum(prev, "Expense")),
    hasLastYear: prev.length > 0,
    shares: FINANCE_PEOPLE.map((p) => ({ name: p.name, amount: cents(net * p.share) })),
  };
}

/**
 * Who owes whom, over everything since the start. Each partner "holds" the
 * income they received minus the expenses they paid; each is owed their share
 * of the net. Settle-ups move money from payer to the other partner. With two
 * people, one partner's surplus is the other's shortfall.
 */
export function settleUp(all: Transaction[]): { owes: string; to: string; amount: number } | null {
  const net = all.reduce((s, t) => s + (t.type === "Income" ? t.amount : t.type === "Expense" ? -t.amount : 0), 0);
  const position = new Map<string, number>(FINANCE_PEOPLE.map((p) => [p.name, 0]));
  for (const t of all) {
    if (!t.person) continue;
    const delta = t.type === "Income" ? t.amount : t.type === "Expense" ? -t.amount : 0;
    position.set(t.person, (position.get(t.person) || 0) + delta);
    if (t.type === "Settle-up") {
      position.set(t.person, (position.get(t.person) || 0) - t.amount);
      for (const other of FINANCE_PEOPLE.filter((p) => p.name !== t.person)) {
        position.set(other.name, (position.get(other.name) || 0) + t.amount * (1 / (FINANCE_PEOPLE.length - 1)));
      }
    }
  }
  const diffs = FINANCE_PEOPLE.map((p) => ({ name: p.name, over: cents((position.get(p.name) || 0) - net * p.share) }));
  const payer = diffs.find((d) => d.over > 0.005);
  const payee = diffs.find((d) => d.over < -0.005);
  if (!payer || !payee) return null;
  return { owes: payer.name, to: payee.name, amount: cents(Math.min(payer.over, -payee.over)) };
}

// ---------------------------------------------------------------------------
// Automatic entries (daily cron)
// ---------------------------------------------------------------------------

function addInterval(date: string, cadence: "Monthly" | "Yearly"): string {
  const [y, m, d] = date.split("-").map(Number);
  if (cadence === "Yearly") return iso(y + 1, m - 1, Math.min(d, new Date(Date.UTC(y + 1, m, 0)).getUTCDate()));
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return iso(y, m, Math.min(d, last));
}

/** Adds due recurring costs, Paid sponsors and Paid ambassador commissions.
 *  Every entry carries a Source Key, so running it again adds nothing twice. */
export async function syncAutomaticEntries(): Promise<string[]> {
  assertConfigured();
  const added: string[] = [];
  const today = todayNY();
  const existing = await listRecords(TRANSACTIONS, `{Source Key} != ''`, { baseId: BASE_ID });
  const keys = new Set(existing.map((r) => str(r.fields["Source Key"])));
  const add = async (key: string, fields: Record<string, unknown>) => {
    if (keys.has(key)) return;
    await createRecord(TRANSACTIONS, { ...fields, "Source Key": key, "Entered By": "automatic" }, { baseId: BASE_ID });
    keys.add(key);
    added.push(key);
  };

  // Recurring costs: one entry per due date, catching up if a run was missed.
  for (const r of await listRecurring()) {
    if (!r.active || !r.nextDate) continue;
    let next = r.nextDate;
    let guard = 0;
    while (next <= today && guard++ < 24) {
      if (next >= FINANCE_START) {
        await add(`recurring:${r.id}:${next}`, {
          Description: r.name,
          Date: next,
          Type: "Expense",
          Amount: r.amount,
          Category: r.category,
          Person: r.person || null,
          Source: "Recurring",
        });
      }
      next = addInterval(next, r.cadence);
    }
    if (next !== r.nextDate) await updateRecord(RECURRING, r.id, { "Next Date": next }, { baseId: BASE_ID });
  }

  // Sponsors marked Paid in Studio (Podcast Production base).
  const podcastBase = process.env.AIRTABLE_PODCAST_PRODUCTION_BASE_ID;
  if (isAirtableConfigured(podcastBase)) {
    const sponsors = await listRecords("Sponsors", `{Payment Status} = 'Paid'`, { baseId: podcastBase });
    for (const s of sponsors) {
      const amount = Number(s.fields["Deal Rate"]) || 0;
      if (amount <= 0) continue;
      await add(`sponsor:${s.id}`, {
        Description: `Sponsor: ${str(s.fields["Sponsor Name"]) || "sponsor"}`,
        Date: today,
        Type: "Income",
        Amount: amount,
        Category: "Sponsors",
        Source: "Sponsor",
        Notes: "Added when the sponsor was marked Paid. Fix the date and add who received it.",
      });
    }
  }

  // Ambassador commissions marked Paid (Road & Trail Crew base).
  const crewBase = process.env.AIRTABLE_BASE_ID;
  if (isAirtableConfigured(crewBase)) {
    const snapshots = await listRecords("Monthly Commission Snapshots", `{Payout Status} = 'Paid'`, { baseId: crewBase });
    for (const s of snapshots) {
      const amount = Number(s.fields["Commission Owed"]) || 0;
      const date = str(s.fields["Payout Date"]).slice(0, 10) || today;
      if (amount <= 0 || date < FINANCE_START) continue;
      await add(`commission:${s.id}`, {
        Description: `Ambassador commission ${str(s.fields.Month)}`.trim(),
        Date: date,
        Type: "Expense",
        Amount: amount,
        Category: "Ambassador commissions",
        Source: "Commission",
        Notes: "Added when the payout was marked Paid. Add who paid it.",
      });
    }
  }
  return added;
}

export function toCsv(list: Transaction[]): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["Date", "Type", "Category", "Description", "Amount", "Person", "Source", "Receipt", "Notes"];
  const rows = [...list]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) =>
      [t.date, t.type, t.category, t.description, t.type === "Expense" ? -t.amount : t.amount, t.person, t.source, t.receipts.length ? "yes" : "", t.notes]
        .map(esc)
        .join(","),
    );
  return [header.join(","), ...rows].join("\n");
}
