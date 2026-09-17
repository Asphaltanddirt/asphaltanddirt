import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/garageAuth";
import { canSeeFinance, cleanTransaction, deleteTransaction, getTransaction, saveTransaction } from "@/lib/garageFinance";

/** Jose + Anthony add, edit ({ id, ... }) or delete ({ id, delete: true }) a transaction. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canSeeFinance(session)) return NextResponse.json({ error: "Not available on your account." }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const id = typeof body.id === "string" && body.id ? body.id : null;
    if (id && !(await getTransaction(id))) return NextResponse.json({ error: "That entry is gone. Reload." }, { status: 404 });
    if (id && body.delete === true) {
      await deleteTransaction(id);
      return NextResponse.json({ status: "deleted" });
    }
    const input = cleanTransaction(body);
    if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });
    const transaction = await saveTransaction(id, input, session.email);
    return NextResponse.json({ status: "ok", transaction });
  } catch (err) {
    console.error("garage finance save failed", err);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 502 });
  }
}
