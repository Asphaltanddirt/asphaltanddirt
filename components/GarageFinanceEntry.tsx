"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { compressImage } from "@/lib/imageCompress";
import {
  CATEGORY_HELP,
  EXPENSE_CATEGORIES,
  FINANCE_PEOPLE,
  INCOME_CATEGORIES,
  type TransactionType,
} from "@/lib/financeConfig";
import type { Transaction } from "@/lib/garageFinance";

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function uploadReceipt(id: string, file: File) {
  const small = file.type.startsWith("image/") && file.type !== "image/heic" ? await compressImage(file) : file;
  const res = await fetch("/api/garage/finance/receipt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, filename: small.name, contentType: small.type || "image/jpeg", base64: await toBase64(small) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Couldn't save the receipt.");
  return data.receipts as Transaction["receipts"];
}

/** Add or edit one money entry. Built for a phone at the register: amount,
 *  who paid, a category tap, snap the receipt, save. */
export default function GarageFinanceEntry({
  initial,
  defaults,
}: {
  initial: Transaction | null;
  defaults: { type: TransactionType; date: string; person: string; amount: string };
}) {
  const router = useRouter();
  const [type, setType] = useState<TransactionType>(initial?.type || defaults.type);
  const [amount, setAmount] = useState(initial ? initial.amount.toFixed(2) : defaults.amount);
  const [date, setDate] = useState(initial?.date || defaults.date);
  const [category, setCategory] = useState(initial?.category || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [person, setPerson] = useState<string>(initial?.person || defaults.person);
  const [notes, setNotes] = useState(initial?.notes || "");
  const [receipts, setReceipts] = useState(initial?.receipts || []);
  const [pendingReceipt, setPendingReceipt] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [armedDelete, setArmedDelete] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);

  const categories: readonly string[] = type === "Income" ? INCOME_CATEGORIES : type === "Expense" ? EXPENSE_CATEGORIES : [];
  const personLabel = type === "Income" ? "Who received it" : type === "Expense" ? "Who paid" : "Who paid the other partner";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/garage/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: initial?.id, type, amount, date, category, description, person, notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save that. Try again.");
      if (pendingReceipt) {
        try {
          await uploadReceipt(data.transaction.id, pendingReceipt);
        } catch {
          router.push(`/garage/finance/${data.transaction.id}?receipt=failed`);
          return;
        }
      }
      router.push("/garage/finance?saved=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that. Try again.");
      requestAnimationFrame(() => errorRef.current?.focus());
      setBusy(false);
    }
  }

  async function remove() {
    if (!armedDelete) {
      setArmedDelete(true);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/garage/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: initial!.id, delete: true }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Couldn't delete it.");
      router.push("/garage/finance");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete it.");
      setBusy(false);
      setArmedDelete(false);
    }
  }

  async function addReceiptNow(file: File) {
    if (!initial) return;
    setBusy(true);
    setError("");
    try {
      setReceipts(await uploadReceipt(initial.id, file));
      setNote("Receipt saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the receipt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="garage-form garage-event-form garage-finance-form" onSubmit={save} noValidate>
      <section className="garage-panel">
        <fieldset className="garage-choice-group">
          <legend>What is it</legend>
          <div className="garage-status-buttons">
            {(["Expense", "Income", "Settle-up"] as TransactionType[]).map((t) => (
              <label key={t} className="garage-status-option">
                <input type="radio" name="type" checked={type === t} onChange={() => { setType(t); setCategory(""); }} />
                <span>{t === "Settle-up" ? "Partner settle-up" : t}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label htmlFor="fin-amount">Amount</label>
        <div className="garage-money-input">
          <span aria-hidden="true">$</span>
          <input
            id="fin-amount"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
            placeholder="0.00"
            required
          />
        </div>

        <fieldset className="garage-choice-group">
          <legend>{personLabel}</legend>
          <div className="garage-status-buttons">
            {FINANCE_PEOPLE.map((p) => (
              <label key={p.name} className="garage-status-option">
                <input type="radio" name="person" checked={person === p.name} onChange={() => setPerson(p.name)} />
                <span>{p.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {categories.length > 0 && (
          <fieldset className="garage-choice-group">
            <legend>Category</legend>
            <div className="garage-status-buttons">
              {categories.map((c) => (
                <label key={c} className="garage-status-option">
                  <input type="radio" name="category" checked={category === c} onChange={() => setCategory(c)} />
                  <span>{c}</span>
                </label>
              ))}
            </div>
            {CATEGORY_HELP[category] && <p className="garage-form-note">{CATEGORY_HELP[category]}</p>}
          </fieldset>
        )}

        {type !== "Settle-up" && (
          <>
            <label htmlFor="fin-desc">Description</label>
            <input id="fin-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} placeholder={type === "Income" ? "Fourthwall payout, September" : "Wawa gas, Mud Run scouting"} />
          </>
        )}

        <label htmlFor="fin-date">Date</label>
        <input id="fin-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />

        {type !== "Settle-up" && (
          <div className="garage-studio-field">
            <span className="garage-field-label">Receipt</span>
            {receipts.length > 0 && (
              <p className="garage-links garage-links-wrap">
                {receipts.map((r, i) => (
                  <a key={i} href={r.url} target="_blank" rel="noopener">Receipt {i + 1} ↗</a>
                ))}
              </p>
            )}
            <label className="btn btn-outline btn-sm garage-file-btn">
              {pendingReceipt ? `Photo ready: ${pendingReceipt.name.slice(0, 24)}` : receipts.length ? "Add another receipt" : "Snap or pick a receipt"}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="sr-only"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  if (initial) addReceiptNow(file);
                  else setPendingReceipt(file);
                }}
              />
            </label>
          </div>
        )}

        <label htmlFor="fin-notes">Notes</label>
        <textarea id="fin-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </section>

      <div className="garage-event-form-save">
        {error && (
          <p className="garage-error" role="alert" tabIndex={-1} ref={errorRef}>
            {error}
          </p>
        )}
        <p className="garage-form-note" aria-live="polite">{note}</p>
        <button type="submit" className="btn btn-primary garage-block-btn" disabled={busy}>
          {busy ? "Saving…" : initial ? "Save changes" : "Save"}
        </button>
        {initial && (
          <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={remove}>
            {armedDelete ? "Tap again to delete this entry" : "Delete entry"}
          </button>
        )}
      </div>
    </form>
  );
}
