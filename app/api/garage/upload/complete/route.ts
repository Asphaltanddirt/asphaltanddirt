import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/garageAuth";
import { folderUrl } from "@/lib/googleDrive";
import { sendEmail } from "@/lib/resendEmail";

function esc(value: string) {
  return value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] || c);
}

/** An upload batch finished. Vlogs email team@ the folder link so Jose knows
 *  one is waiting; event uploads just land in the event folder. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let body: { folderId?: string; kind?: "event" | "vlog"; label?: string; sent?: number; failed?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const folderId = (body.folderId || "").trim();
  if (!folderId) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const link = folderUrl(folderId);

  if (body.kind === "vlog" && (body.sent || 0) > 0) {
    try {
      await sendEmail({
        to: process.env.VLOG_NOTIFY_EMAIL || "team@asphaltanddirt.com",
        subject: `New vlog in Drive: ${body.label || "Vlog"}`,
        html: `<p><strong>${esc(session.name || session.email)}</strong> uploaded ${body.sent} file${body.sent === 1 ? "" : "s"} for <strong>${esc(body.label || "a vlog")}</strong> from the Garage.${body.failed ? ` ${body.failed} didn't finish.` : ""}</p>
<p><a href="${link}">Open the folder in Google Drive</a></p>`,
      });
    } catch (err) {
      console.error("vlog upload email failed", err);
    }
  }
  return NextResponse.json({ status: "ok", folderUrl: link });
}
