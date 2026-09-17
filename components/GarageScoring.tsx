"use client";

import { useRef, useState } from "react";
import { SCORE_CATEGORIES, suggestedBand, weightedScore, type ScoreKey, type Scores } from "@/lib/applicationScoring";

type SaveState = "idle" | "saving" | "saved" | "error";

/** One save queue per form, so two quick taps land in Airtable in order. */
function useSaver(id: string) {
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const pending = useRef(0);

  function save(patch: Record<string, unknown>) {
    pending.current += 1;
    setState("saving");
    setError("");
    queue.current = queue.current.then(async () => {
      try {
        const res = await fetch("/api/garage/application/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...patch }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Couldn't save that. Try again.");
        pending.current -= 1;
        if (pending.current === 0) setState("saved");
      } catch (err) {
        pending.current -= 1;
        setError(err instanceof Error ? err.message : "Couldn't save that. Try again.");
        setState("error");
      }
    });
  }

  return { save, state, error };
}

/** A text box that saves after a short pause in typing and when you leave it,
 *  so notes aren't lost if someone taps Back straight from the box. */
function useAutosaveText(initial: string, save: (value: string) => void) {
  const [value, setValue] = useState(initial);
  const saved = useRef(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = (next: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (next.trim() === saved.current.trim()) return;
    saved.current = next;
    save(next);
  };
  return {
    value,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.target.value;
      setValue(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => flush(next), 1500);
    },
    onBlur: () => flush(value),
  };
}

function SaveStatus({ state, error }: { state: SaveState; error: string }) {
  return (
    <>
      <p className="garage-form-note" aria-live="polite">
        {state === "saving" ? "Saving…" : state === "saved" ? "Saved." : ""}
      </p>
      {state === "error" && <p className="garage-error" role="alert">{error}</p>}
    </>
  );
}

/** Scores 1 to 5 in six categories, each saved the moment it's tapped, plus
 *  reviewer notes. The total and suggestion use Airtable's own formula. */
export function GarageScoring({ id, initialScores, initialNotes }: { id: string; initialScores: Scores; initialNotes: string }) {
  const [scores, setScores] = useState(initialScores);
  const { save, state, error } = useSaver(id);
  const notes = useAutosaveText(initialNotes, (reviewerNotes) => save({ reviewerNotes }));

  const total = weightedScore(scores);
  const scored = SCORE_CATEGORIES.filter((c) => scores[c.key]).length;

  function pick(key: ScoreKey, value: number) {
    if (scores[key] === value) return;
    setScores((prev) => ({ ...prev, [key]: value }));
    save({ scores: { [key]: value } });
  }

  return (
    <div className="garage-scoring">
      <div className="garage-score-total" aria-live="polite">
        {total === null ? (
          <p>
            <strong>{scored} of 6</strong> scored. The total shows once all six are in.
          </p>
        ) : (
          <p>
            <strong className="garage-score-number">{total}</strong> of 100 · suggests <strong>{suggestedBand(total)}</strong>
          </p>
        )}
      </div>

      {SCORE_CATEGORIES.map((c) => (
        <fieldset key={c.key} className="garage-score-row">
          <legend>
            {c.label} <span className="garage-score-weight">{c.weight}%</span>
          </legend>
          <p className="garage-score-hint" id={`hint-${c.key}`}>{c.hint}</p>
          <div className="garage-score-options">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="garage-score-option">
                <input
                  type="radio"
                  name={`score-${c.key}`}
                  value={n}
                  checked={scores[c.key] === n}
                  onChange={() => pick(c.key, n)}
                  aria-describedby={`hint-${c.key}`}
                />
                <span>{n}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <p className="garage-form-note">1 = weak, 5 = strong. The suggestion is a guide; the decision is yours.</p>

      <div className="garage-form">
        <label htmlFor={`notes-${id}`}>Reviewer notes</label>
        <textarea id={`notes-${id}`} rows={4} {...notes} />
      </div>
      <SaveStatus state={state} error={error} />
    </div>
  );
}

/** Interview date and notes. The date saves when picked; notes save as you
 *  pause typing. */
export function GarageInterview({ id, initialDate, initialNotes }: { id: string; initialDate: string; initialNotes: string }) {
  const [date, setDate] = useState(initialDate);
  const { save, state, error } = useSaver(id);
  const notes = useAutosaveText(initialNotes, (interviewNotes) => save({ interviewNotes }));

  return (
    <div className="garage-form">
      <label htmlFor={`interview-date-${id}`}>Interview date</label>
      <input
        id={`interview-date-${id}`}
        type="date"
        value={date}
        onChange={(e) => {
          setDate(e.target.value);
          save({ interviewDate: e.target.value });
        }}
      />
      <label htmlFor={`interview-notes-${id}`}>Interview notes</label>
      <textarea id={`interview-notes-${id}`} rows={5} {...notes} />
      <SaveStatus state={state} error={error} />
    </div>
  );
}
