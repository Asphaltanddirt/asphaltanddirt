import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageTaskDone from "@/components/GarageTaskDone";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { getTask } from "@/lib/garageTasks";

export const metadata: Metadata = {
  title: "Task · A and D Garage",
  robots: { index: false, follow: false },
};

export default async function GarageTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/garage");

  const { id } = await params;
  const task = await getTask(id);
  if (!task) notFound();
  // Your own work, or anything if you're an owner.
  if (task.assignee !== session.email && !canSeeOwnerOnly(session)) redirect("/garage");

  const due = task.due
    ? new Date(`${task.due}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : "";

  return (
    <div className="garage">
      <GarageBack title="Task" />
      <div className="garage-body">
        {due && <div className="garage-event-date">Due {due}</div>}
        <h1 className="garage-event-title">{task.title}</h1>
        {task.assignee !== session.email && <p className="garage-event-area">Assigned to {task.assignee}</p>}

        {task.details && (
          <section className="garage-panel">
            <h2>How to do it</h2>
            <p>{task.details}</p>
          </section>
        )}

        {task.link && (
          <p className="garage-links">
            <a href={task.link} target="_blank" rel="noopener">Open the link ↗</a>
          </p>
        )}

        <GarageTaskDone id={task.id} done={task.done} />
      </div>
    </div>
  );
}
