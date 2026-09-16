import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/garageAuth";
import { addReminder, completeReminder, type ReminderFor, type ReminderRepeat } from "@/lib/garageReminders";

const REPEATS: ReminderRepeat[] = ["None", "Monthly", "Quarterly", "Yearly"];
const AUDIENCES: ReminderFor[] = ["Owners", "Everyone", "Just me"];

/** Add a reminder, or mark one done (which rolls a repeating one forward). */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let body: {
    action?: "add" | "done";
    id?: string;
    title?: string;
    date?: string;
    repeat?: string;
    audience?: string;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    if (body.action === "done") {
      if (!body.id) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
      await completeReminder(body.id);
      return NextResponse.json({ status: "ok" });
    }

    const title = (body.title || "").trim();
    const date = (body.date || "").trim();
    if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Give it a title and a date." }, { status: 400 });
    }
    const repeat = (body.repeat as ReminderRepeat) || "None";
    const audience = (body.audience as ReminderFor) || "Just me";
    if (!REPEATS.includes(repeat) || !AUDIENCES.includes(audience)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    await addReminder({
      title,
      date,
      repeat,
      audience,
      notes: (body.notes || "").trim(),
      ownerEmail: session.email,
    });
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("garage reminder failed", err);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 502 });
  }
}
