"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface PickerOption {
  slug: string;
  label: string;
  sub?: string;
  image?: string;
}

/** Choose and order what a section of the site features: add from a list,
 *  move up/down, remove, then Save. */
export default function GarageFeaturedPicker({
  kind,
  section,
  options,
  initial,
  max,
  idPrefix,
}: {
  kind: "featured-builds" | "featured-products";
  section?: string;
  options: PickerOption[];
  initial: string[];
  max: number;
  idPrefix: string;
}) {
  const router = useRouter();
  const known = new Map(options.map((o) => [o.slug, o]));
  const [chosen, setChosen] = useState(() => [...new Set(initial)].filter((s) => known.has(s)));
  const [saved, setSaved] = useState(chosen);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const dirty = chosen.join("|") !== saved.join("|");
  const available = options.filter((o) => !chosen.includes(o.slug));

  const update = (next: string[]) => {
    setChosen(next);
    setState("idle");
  };
  const moveItem = (i: number, by: number) => {
    const next = [...chosen];
    const [item] = next.splice(i, 1);
    next.splice(i + by, 0, item);
    update(next);
  };

  async function save() {
    setState("saving");
    setError("");
    try {
      const res = await fetch("/api/garage/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, section, slugs: chosen }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save that. Try again.");
      setSaved(chosen);
      setState("saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that. Try again.");
      setState("error");
    }
  }

  return (
    <div className="garage-picker">
      {chosen.length === 0 ? (
        <p className="garage-form-note">Nothing picked. The site shows its built-in defaults.</p>
      ) : (
        <ol className="garage-picker-list">
          {chosen.map((slug, i) => {
            const o = known.get(slug)!;
            return (
              <li key={slug}>
                {o.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.image} alt="" />
                )}
                <span className="garage-picker-name">
                  <strong>{o.label}</strong>
                  {o.sub && <small>{o.sub}</small>}
                </span>
                <span className="garage-picker-buttons">
                  <button type="button" onClick={() => moveItem(i, -1)} disabled={i === 0} aria-label={`Move ${o.label} up`}>↑</button>
                  <button type="button" onClick={() => moveItem(i, 1)} disabled={i === chosen.length - 1} aria-label={`Move ${o.label} down`}>↓</button>
                  <button type="button" onClick={() => update(chosen.filter((s) => s !== slug))} aria-label={`Remove ${o.label}`}>✕</button>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {chosen.length < max && available.length > 0 && (
        <div className="garage-form">
          <label htmlFor={`${idPrefix}-add`}>Add</label>
          <select
            id={`${idPrefix}-add`}
            value=""
            onChange={(e) => e.target.value && update([...chosen, e.target.value])}
          >
            <option value="">Pick one…</option>
            {available.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.label}
                {o.sub ? ` (${o.sub})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}
      <p className="garage-form-note">
        {chosen.length} of {max}
      </p>

      <button type="button" className="btn btn-primary btn-sm" disabled={!dirty || state === "saving"} onClick={save}>
        {state === "saving" ? "Saving…" : "Save"}
      </button>
      <p className="garage-form-note" aria-live="polite">
        {state === "saved" ? "Saved. The site updates within a few minutes." : dirty ? "Unsaved changes." : ""}
      </p>
      {state === "error" && <p className="garage-error" role="alert">{error}</p>}
    </div>
  );
}
