"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { GarageTask } from "@/lib/garageTasks";

/** This week's work for the signed-in person. Ticking is optimistic: the row
 *  moves the moment you tap, and rolls back if the save fails.
 *  Ticked tasks drop off the list (Jose 9/29: "make things ticked disappear");
 *  one ticked on this visit stays, struck through, so a mis-tap can be undone
 *  on the spot. "Show" brings the done ones back. */
export default function GarageTaskList({ tasks, today }: { tasks: GarageTask[]; today: string }) {
  const router = useRouter();
  const [state, setState] = useState<Record<string, boolean>>(
    Object.fromEntries(tasks.map((t) => [t.id, t.done])),
  );
  const [error, setError] = useState("");
  const [justTicked, setJustTicked] = useState<Set<string>>(new Set());
  const [showDone, setShowDone] = useState(false);

  async function toggle(task: GarageTask) {
    const next = !state[task.id];
    setState((prev) => ({ ...prev, [task.id]: next }));
    setJustTicked((prev) => new Set(prev).add(task.id));
    setError("");
    try {
      const res = await fetch("/api/garage/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, done: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setState((prev) => ({ ...prev, [task.id]: !next }));
      setError("Didn't save. Try again.");
    }
  }

  if (tasks.length === 0) return <p className="garage-empty">Nothing on your list this week.</p>;

  const label = (due: string) => {
    if (!due) return "";
    if (due < today) return "Overdue";
    if (due === today) return "Today";
    return new Date(`${due}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });
  };

  const hidden = tasks.filter((t) => state[t.id] && !justTicked.has(t.id));
  const shown = showDone ? tasks : tasks.filter((t) => !hidden.includes(t));

  return (
    <>
      {error && <p className="garage-error" role="alert">{error}</p>}
      {shown.length === 0 && <p className="garage-empty">All done this week.</p>}
      <ul className="garage-tasks">
        {shown.map((task) => {
          const done = state[task.id];
          const when = label(task.due);
          return (
            <li key={task.id} className={done ? "garage-task is-done" : "garage-task"}>
              <input
                type="checkbox"
                checked={done}
                onChange={() => toggle(task)}
                aria-label={done ? `Mark "${task.title}" not done` : `Mark "${task.title}" done`}
              />
              <Link href={`/garage/tasks/${task.id}`} className="garage-task-main">
                <span className="garage-task-title">{task.title}</span>
                {task.details && <span className="garage-task-details">{task.details}</span>}
              </Link>
              {when && (
                <span className={when === "Overdue" ? "garage-task-when late" : "garage-task-when"}>{when}</span>
              )}
            </li>
          );
        })}
      </ul>
      {hidden.length > 0 && (
        <p className="garage-plan-quiet garage-done-toggle">
          ✓ {hidden.length} done ·{" "}
          <button type="button" className="garage-link-button" onClick={() => setShowDone((v) => !v)}>
            {showDone ? "Hide" : "Show"}
          </button>
        </p>
      )}
    </>
  );
}
