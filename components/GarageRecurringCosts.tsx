"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FINANCE_PEOPLE, RECURRING_CATEGORIES, money } from "@/lib/financeConfig";
import type { RecurringCost } from "@/lib/garageFinance";

const EMPTY = { name: "", amount: "", category: "Software & subscriptions", cadence: "Monthly", nextDate: "", person: "", active: true, notes: "" };

/** Subscriptions and other repeating costs: list, add, edit, pause. */
export default function GarageRecurringCosts({ items }: { items: RecurringCost[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const open = (item: RecurringCost | null) => {
    setError("");
    setEditing(item ? item.id : "new");
    setForm(item ? { ...item, amount: item.amount.toFixed(2) } : EMPTY);
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/garage/finance/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, id: editing === "new" ? undefined : editing }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save that. Try again.");
      setEditing(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const monthly = items.filter((i) => i.active).reduce((s, i) => s + (i.cadence === "Yearly" ? i.amount / 12 : i.amount), 0);

  return (
    <div>
      <p className="garage-count">
        {money(monthly)} <span>a month, on average</span>
      </p>
      {items.length === 0 ? (
        <p className="garage-empty">Nothing yet. Add the subscriptions A&amp;D pays for.</p>
      ) : (
        <ul className="garage-roster">
          {items.map((i) => (
            <li key={i.id}>
              <button type="button" className="garage-app-row garage-row-button" onClick={() => open(i)}>
                <span className="garage-app-main">
                  <strong>{i.name}</strong>
                  <span className="garage-roster-meta">
                    {[
                      `${money(i.amount)} ${i.cadence.toLowerCase()}`,
                      i.active ? `next ${new Date(`${i.nextDate}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "paused",
                      i.person && `${i.person}'s card`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span aria-hidden="true">›</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <form className="garage-form garage-recurring-form" onSubmit={save}>
          <h3>{editing === "new" ? "Add a recurring cost" : "Edit recurring cost"}</h3>
          <label htmlFor="rc-name">Name</label>
          <input id="rc-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Airtable Team" />
          <label htmlFor="rc-amount">Amount each time</label>
          <div className="garage-money-input">
            <span aria-hidden="true">$</span>
            <input id="rc-amount" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d.,]/g, "") })} />
          </div>
          <fieldset className="garage-choice-group">
            <legend>How often</legend>
            <div className="garage-status-buttons">
              {["Monthly", "Yearly"].map((c) => (
                <label key={c} className="garage-status-option">
                  <input type="radio" name="cadence" checked={form.cadence === c} onChange={() => setForm({ ...form, cadence: c })} />
                  <span>{c}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label htmlFor="rc-next">Next charge date</label>
          <input id="rc-next" type="date" value={form.nextDate} onChange={(e) => setForm({ ...form, nextDate: e.target.value })} />
          <fieldset className="garage-choice-group">
            <legend>Whose card</legend>
            <div className="garage-status-buttons">
              {FINANCE_PEOPLE.map((p) => (
                <label key={p.name} className="garage-status-option">
                  <input type="radio" name="rc-person" checked={form.person === p.name} onChange={() => setForm({ ...form, person: p.name })} />
                  <span>{p.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label htmlFor="rc-cat">Category</label>
          <select id="rc-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {RECURRING_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <label className="garage-choice garage-choice-inline">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            <span>
              <strong>Active</strong>
              <small>Unticked = paused or cancelled; nothing more gets added.</small>
            </span>
          </label>
          <label htmlFor="rc-notes">Notes</label>
          <textarea id="rc-notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          {error && <p className="garage-error" role="alert">{error}</p>}
          <div className="garage-decision-row">
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(null)}>Cancel</button>
          </div>
          <p className="garage-form-note">Each charge is added to Finance automatically on its date.</p>
        </form>
      ) : (
        <p className="garage-links">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => open(null)}>Add recurring cost</button>
        </p>
      )}
    </div>
  );
}
