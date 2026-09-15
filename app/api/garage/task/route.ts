import { NextRequest, NextResponse } from "next/server";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { getTask, setTaskDone } from "@/lib/garageTasks";

/** Tick a task off (or back on). Your own tasks; owners can tick anyone's. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let body: { id?: string; done?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const task = await getTask(body.id);
  if (!task) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (task.assignee !== session.email && !canSeeOwnerOnly(session)) {
    return NextResponse.json({ error: "That's not your task." }, { status: 403 });
  }

  try {
    await setTaskDone(task.id, body.done === true);
    return NextResponse.json({ status: "ok", done: body.done === true });
  } catch (err) {
    console.error("garage task update failed", err);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 502 });
  }
}
