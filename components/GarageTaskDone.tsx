"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** The big button on a task's own page: mark it done, or put it back. */
export default function GarageTaskDone({ id, done }: { id: string; done: boolean }) {
  const router = useRouter();
  const [isDone, setIsDone] = useState(done);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    const next = !isDone;
    setIsDone(next);
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/garage/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, done: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setIsDone(!next);
      setError("Didn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {error && <p className="garage-error" role="alert">{error}</p>}
      <button
        type="button"
        className={isDone ? "btn btn-outline garage-block-btn" : "btn btn-primary garage-block-btn"}
        onClick={toggle}
        disabled={saving}
        aria-pressed={isDone}
      >
        {isDone ? "Done — tap to undo" : "Mark it done"}
      </button>
    </>
  );
}
