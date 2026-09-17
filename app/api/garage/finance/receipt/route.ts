import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/garageAuth";
import { addReceipt, canSeeFinance, getTransaction } from "@/lib/garageFinance";

export const maxDuration = 60;

/** Adds a receipt photo (shrunk in the browser) or PDF to a transaction. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canSeeFinance(session)) return NextResponse.json({ error: "Not available on your account." }, { status: 403 });

  let body: { id?: string; filename?: string; contentType?: string; base64?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "That file is too big. Try a photo instead." }, { status: 400 });
  }
  const contentType = body.contentType || "";
  if (!/^(image\/(jpeg|png|webp|heic)|application\/pdf)$/.test(contentType) || !body.base64) {
    return NextResponse.json({ error: "Add a photo or a PDF." }, { status: 400 });
  }
  if (Math.floor((body.base64.length * 3) / 4) > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "That file is too big (4 MB max)." }, { status: 413 });
  }
  if (!(await getTransaction(body.id || ""))) return NextResponse.json({ error: "Entry not found." }, { status: 404 });

  try {
    const t = await addReceipt(body.id!, {
      filename: (body.filename || "receipt.jpg").replace(/[^\w.-]+/g, "-").slice(0, 80),
      contentType,
      base64: body.base64,
    });
    return NextResponse.json({ status: "ok", receipts: t.receipts });
  } catch (err) {
    console.error("garage finance receipt failed", err);
    return NextResponse.json({ error: "Couldn't save the receipt. Try again." }, { status: 502 });
  }
}
