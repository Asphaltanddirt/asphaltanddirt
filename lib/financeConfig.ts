/**
 * Garage → Finance settings. Kept as config so the same screens can serve
 * another organization later (the school PPO site): change the people, the
 * split, the categories and the start date here. Safe to import on the client.
 */

export const FINANCE_START = "2026-09-01";

/** Partners and their share of profit. Shares must add up to 1. */
export const FINANCE_PEOPLE = [
  { name: "Jose", share: 0.5 },
  { name: "Anthony", share: 0.5 },
] as const;
export type FinancePerson = (typeof FINANCE_PEOPLE)[number]["name"];

export const INCOME_CATEGORIES = ["Merch", "Sponsors", "Events", "Ad revenue", "Other income"] as const;
export const EXPENSE_CATEGORIES = [
  "Software & subscriptions",
  "Website & domain",
  "Merch samples & inventory",
  "Event costs",
  "Ambassador commissions",
  "Crew kits & swag",
  "Equipment & gear",
  "Fuel & travel",
  "Marketing & ads",
  "Food & meetings",
  "Fees & taxes",
  "Other expense",
] as const;
export const RECURRING_CATEGORIES = [
  "Software & subscriptions",
  "Website & domain",
  "Equipment & gear",
  "Marketing & ads",
  "Fees & taxes",
  "Other expense",
] as const;

export type TransactionType = "Income" | "Expense" | "Settle-up";

export const CATEGORY_HELP: Record<string, string> = {
  Merch: "Fourthwall payouts (what actually reaches the bank), not order totals.",
  Sponsors: "Added for you when a sponsor is marked Paid in Studio.",
  "Ambassador commissions": "Added for you when a commission payout is marked Paid.",
};

export const PERIODS = [
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "this-quarter", label: "This quarter" },
  { key: "this-year", label: "This year" },
  { key: "last-year", label: "Last year" },
  { key: "all", label: "Since Sept 2026" },
] as const;
export type PeriodKey = (typeof PERIODS)[number]["key"];

export const money = (n: number) =>
  `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
