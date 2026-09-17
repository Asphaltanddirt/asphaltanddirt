"use client";

import { useRef } from "react";
import { SOCIAL_PLATFORMS, type SocialPlatformName } from "@/lib/socialLinks";

export interface SocialRow {
  platform: SocialPlatformName;
  value: string;
}

/** A platform picker + link/handle per row, as many rows as they have. Used on
 *  the agreement form and the Garage profile so every social an ambassador
 *  gives us is kept, not just Instagram. The parent owns the rows. */
export default function SocialLinksEditor({
  rows,
  onChange,
  disabled = false,
  idPrefix,
  legend,
  hint,
  legendClassName,
}: {
  rows: SocialRow[];
  onChange: (rows: SocialRow[]) => void;
  disabled?: boolean;
  idPrefix: string;
  legend: React.ReactNode;
  hint?: string;
  legendClassName?: string;
}) {
  const addRef = useRef<HTMLButtonElement>(null);
  const list = rows.length ? rows : [{ platform: "Instagram" as SocialPlatformName, value: "" }];

  const update = (i: number, patch: Partial<SocialRow>) =>
    onChange(list.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  const remove = (i: number) => {
    onChange(list.filter((_, j) => j !== i));
    addRef.current?.focus();
  };
  const add = () => {
    onChange([...list, { platform: "Instagram", value: "" }]);
    requestAnimationFrame(() => document.getElementById(`${idPrefix}-platform-${list.length}`)?.focus());
  };

  return (
    <fieldset className="social-editor" aria-describedby={hint ? `${idPrefix}-hint` : undefined}>
      <legend className={legendClassName}>{legend}</legend>
      {hint && (
        <p id={`${idPrefix}-hint`} className="social-editor-hint">
          {hint}
        </p>
      )}
      {list.map((row, i) => (
        <div key={i} className="social-editor-row">
          <select
            id={`${idPrefix}-platform-${i}`}
            aria-label={`Link ${i + 1} platform`}
            value={row.platform}
            onChange={(e) => update(i, { platform: e.target.value as SocialPlatformName })}
            disabled={disabled}
          >
            {SOCIAL_PLATFORMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <input
            type="text"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label={`Link ${i + 1}: ${row.platform} link or @handle`}
            placeholder={row.platform === "Website" || row.platform === "Other" ? "https://…" : "@handle or https://…"}
            value={row.value}
            onChange={(e) => update(i, { value: e.target.value })}
            disabled={disabled}
          />
          {list.length > 1 && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => remove(i)}
              disabled={disabled}
              aria-label={`Remove link ${i + 1} (${row.platform})`}
            >
              Remove
            </button>
          )}
        </div>
      ))}
      <button ref={addRef} type="button" className="social-editor-add" onClick={add} disabled={disabled}>
        + Add another link
      </button>
    </fieldset>
  );
}
