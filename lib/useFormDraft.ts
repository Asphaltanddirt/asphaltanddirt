"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Saved progress for long forms: what someone has typed survives a refresh,
 * a closed tab or a trip to another page, and comes back next time they open
 * the form on this device (WCAG 3 draft "progress saved"). Stored in
 * localStorage only; nothing is sent anywhere until they submit.
 *
 * - Plain named fields (text, email, tel, textarea, select, checkbox) are read
 *   straight from the form, so uncontrolled inputs need no wiring.
 * - React-controlled values go through `extras` / `onRestoreExtras`.
 * - Files are never saved (they can't be), and anything listed in `skip` is
 *   left out: honeypots, and confirmations people should tick fresh.
 */

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

type Draft = { savedAt: number; fields: Record<string, string | boolean>; extras?: unknown };

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function fieldsOf(form: HTMLFormElement, skip: Set<string>): FieldElement[] {
  return Array.from(form.elements).filter((el): el is FieldElement => {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return false;
    if (!el.name || skip.has(el.name)) return false;
    if (el instanceof HTMLInputElement && ["file", "hidden", "password", "submit", "button"].includes(el.type)) return false;
    return true;
  });
}

/** The value a field starts with before anyone touches it. */
function defaultOf(el: FieldElement): string | boolean {
  if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) return el.defaultChecked;
  if (el instanceof HTMLSelectElement) {
    const option = Array.from(el.options).find((o) => o.defaultSelected) ?? el.options[0];
    return option?.value ?? "";
  }
  return el.defaultValue;
}

export function useFormDraft<T>({
  storageKey,
  formRef,
  extras,
  onRestoreExtras,
  skip = [],
  controlled = [],
}: {
  storageKey: string;
  formRef: React.RefObject<HTMLFormElement | null>;
  extras?: T;
  onRestoreExtras?: (extras: T) => void;
  /** Field names never saved. */
  skip?: string[];
  /** Named fields whose value React controls: saved, but restored only via extras. */
  controlled?: string[];
}) {
  const [restored, setRestored] = useState(false);
  const ready = useRef(false);
  // What `extras` looked like before anyone typed, so an untouched form never
  // counts as a draft.
  const initialExtrasJson = useRef(JSON.stringify(extras ?? null));
  const skipKey = skip.join("|");
  const controlledKey = controlled.join("|");
  const extrasRef = useRef(extras);
  const restoreRef = useRef(onRestoreExtras);
  useEffect(() => {
    extrasRef.current = extras;
    restoreRef.current = onRestoreExtras;
  });

  const save = useCallback(() => {
    const form = formRef.current;
    if (!form || !ready.current) return;
    const fields: Record<string, string | boolean> = {};
    let edited = false;
    for (const el of fieldsOf(form, new Set(skipKey ? skipKey.split("|") : []))) {
      if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
        if (el.type === "radio") {
          if (el.checked) fields[el.name] = el.value;
        } else {
          fields[el.name] = el.checked;
        }
        if (el.checked !== el.defaultChecked) edited = true;
      } else {
        fields[el.name] = el.value;
        if (el.value.trim() !== String(defaultOf(el)).trim()) edited = true;
      }
    }
    // Only real edits count: a dropdown sitting on its default isn't a draft.
    const hasContent = edited || JSON.stringify(extrasRef.current ?? null) !== initialExtrasJson.current;
    try {
      if (hasContent) {
        window.localStorage.setItem(storageKey, JSON.stringify({ savedAt: Date.now(), fields, extras: extrasRef.current } satisfies Draft));
      } else {
        window.localStorage.removeItem(storageKey);
      }
    } catch {
      // Storage full or blocked: the form still works, it just won't remember.
    }
  }, [formRef, storageKey, skipKey]);

  // Restore once on mount, then save on every edit.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    let draft: Draft | null = null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      draft = raw ? (JSON.parse(raw) as Draft) : null;
      if (draft && Date.now() - draft.savedAt > MAX_AGE_MS) {
        window.localStorage.removeItem(storageKey);
        draft = null;
      }
    } catch {
      draft = null;
    }

    if (draft) {
      const controlledSet = new Set(controlledKey ? controlledKey.split("|") : []);
      let any = false;
      for (const el of fieldsOf(form, new Set(skipKey ? skipKey.split("|") : []))) {
        if (controlledSet.has(el.name) || !(el.name in draft.fields)) continue;
        const value = draft.fields[el.name];
        if (el instanceof HTMLInputElement && el.type === "checkbox") {
          el.checked = Boolean(value);
          if (el.checked !== el.defaultChecked) any = true;
        } else if (el instanceof HTMLInputElement && el.type === "radio") {
          el.checked = el.value === value;
          if (el.checked !== el.defaultChecked) any = true;
        } else if (typeof value === "string") {
          el.value = value;
          if (value.trim() !== String(defaultOf(el)).trim()) any = true;
        }
      }
      if (draft.extras !== undefined && restoreRef.current && JSON.stringify(draft.extras) !== initialExtrasJson.current) {
        restoreRef.current(draft.extras as T);
        any = true;
      }
      // Restoring from storage after mount is the whole point of this hook.
      if (any) setRestored(true);
    }
    ready.current = true;

    form.addEventListener("input", save);
    form.addEventListener("change", save);
    return () => {
      form.removeEventListener("input", save);
      form.removeEventListener("change", save);
    };
  }, [formRef, storageKey, skipKey, controlledKey, save]);

  // Controlled values change without a DOM input event on the form (e.g. a
  // chip toggled by state), so save when they change too.
  // Skips the first run: on mount the restore above hasn't reached state yet,
  // and saving then would overwrite the draft with the empty defaults.
  const extrasJson = JSON.stringify(extras ?? null);
  const extrasSeen = useRef(false);
  useEffect(() => {
    if (!extrasSeen.current) {
      extrasSeen.current = true;
      return;
    }
    save();
  }, [extrasJson, save]);

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Nothing to clear.
    }
    setRestored(false);
  }, [storageKey]);

  return { restored, clearDraft };
}
