"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { STUDIO_TABLES, studioPath, type StudioTableKey } from "@/lib/studioConfig";
import type { LinkOption, StudioRecord, StudioValue } from "@/lib/garageStudio";

/** One form for any Studio table (ideas, episodes, guests, sponsors), built
 *  from its field list. Status-type selects show as big tap buttons. */
export default function GarageStudioForm({
  tableKey,
  record,
  linkOptions,
}: {
  tableKey: StudioTableKey;
  record: StudioRecord | null;
  linkOptions: Record<string, LinkOption[]>;
}) {
  const router = useRouter();
  const t = STUDIO_TABLES[tableKey];
  const start: Record<string, StudioValue> =
    record?.values ??
    Object.fromEntries(
      t.fields.map((f) => [
        f.key,
        f.kind === "checkbox" ? Boolean(t.defaults[f.field]) : f.kind === "links" ? [] : String(t.defaults[f.field] ?? ""),
      ]),
    );
  const [values, setValues] = useState(start);
  const [saved, setSaved] = useState(start);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (key: string, v: StudioValue) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setNote("");
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/garage/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: tableKey, id: record?.id, values }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save that. Try again.");
      const next = (data.record as StudioRecord).values;
      setValues(next);
      setSaved(next);
      if (!record) {
        router.replace(`${studioPath(tableKey)}/${data.record.id}?created=1`);
        return;
      }
      setNote("Saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={`garage-form garage-event-form${dirty ? " is-dirty" : ""}`} onSubmit={save} noValidate>
      <section className="garage-panel">
        {t.fields.map((f) => {
          const id = `st-${f.key}`;
          const heading = f.section ? <h2 className="garage-studio-section">{f.section}</h2> : null;
          const help = f.help ? <p id={`${id}-help`} className="garage-form-note">{f.help}</p> : null;
          const describedBy = f.help ? `${id}-help` : undefined;
          const v = values[f.key];

          const body = ((): React.ReactNode => {
            if (f.kind === "checkbox") {
              return (
                <label key={f.key} className="garage-choice garage-choice-inline">
                  <input type="checkbox" checked={v === true} onChange={(e) => set(f.key, e.target.checked)} />
                  <span>
                    <strong>{f.label}</strong>
                    {f.help && <small>{f.help}</small>}
                  </span>
                </label>
              );
            }
            if (f.kind === "select" && f.field === t.groupField) {
              return (
                <fieldset key={f.key} className="garage-choice-group">
                  <legend>{f.label}</legend>
                  <div className="garage-status-buttons">
                    {f.options!.map((o) => (
                      <label key={o} className="garage-status-option">
                        <input type="radio" name={id} value={o} checked={v === o} onChange={() => set(f.key, o)} />
                        <span>{o}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
            }
            if (f.kind === "links") {
              const opts = linkOptions[f.linkTo!] || [];
              const chosen = Array.isArray(v) ? v : [];
              return (
                <fieldset key={f.key} className="garage-choice-group" aria-describedby={describedBy}>
                  <legend>{f.label}</legend>
                  {help}
                  {opts.length === 0 ? (
                    <p className="garage-form-note">None yet.</p>
                  ) : (
                    <div className="garage-link-chips">
                      {opts.map((o) => (
                        <label key={o.id} className="garage-link-chip">
                          <input
                            type="checkbox"
                            checked={chosen.includes(o.id)}
                            onChange={() => set(f.key, chosen.includes(o.id) ? chosen.filter((x) => x !== o.id) : [...chosen, o.id])}
                          />
                          <span>{o.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </fieldset>
              );
            }
            return (
              <div key={f.key} className="garage-studio-field">
                <label htmlFor={id}>
                  {f.label}
                  {f.required && <span aria-hidden="true"> *</span>}
                </label>
                {f.kind === "textarea" ? (
                  <textarea id={id} rows={f.key === "showNotes" ? 8 : 4} value={String(v ?? "")} placeholder={f.placeholder} aria-describedby={describedBy} onChange={(e) => set(f.key, e.target.value)} />
                ) : f.kind === "select" ? (
                  <select id={id} value={String(v ?? "")} aria-describedby={describedBy} onChange={(e) => set(f.key, e.target.value)}>
                    <option value="">—</option>
                    {f.options!.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={id}
                    type={f.kind === "text" ? "text" : f.kind === "phone" ? "tel" : f.kind === "number" ? "text" : f.kind}
                    inputMode={f.kind === "number" ? "decimal" : f.kind === "url" ? "url" : undefined}
                    value={String(v ?? "")}
                    placeholder={f.placeholder}
                    required={f.required}
                    aria-describedby={describedBy}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                )}
                {help}
                {f.kind === "email" && v && !dirty && <a href={`mailto:${v}`} className="garage-form-note">Email them</a>}
                {f.kind === "phone" && v && !dirty && <a href={`tel:${String(v).replace(/[^\d+]/g, "")}`} className="garage-form-note">Call</a>}
              </div>
            );
          })();
          return (
            <Fragment key={f.key}>
              {heading}
              {body}
            </Fragment>
          );
        })}
      </section>

      <div className="garage-event-form-save">
        {error && <p className="garage-error" role="alert">{error}</p>}
        <p className="garage-form-note" aria-live="polite">
          {note || (dirty ? "Unsaved changes." : "")}
        </p>
        <button type="submit" className="btn btn-primary garage-block-btn" disabled={busy || (!dirty && Boolean(record))}>
          {busy ? "Saving…" : record ? "Save changes" : `Add ${t.singular}`}
        </button>
      </div>
    </form>
  );
}
