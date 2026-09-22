import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/garageAuth";
import { folderUrl } from "@/lib/googleDrive";
import { fileMediaRows, type MediaRowInput } from "@/lib/mediaLibrary";
import { sendEmail } from "@/lib/resendEmail";

function esc(value: string) {
  return value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] || c);
}

/** An upload batch finished. Vlogs email team@ the folder link so Jose knows
 *  one is waiting; event uploads just land in the event folder. Whatever was
 *  typed in the two boxes on the upload screen is filed in the Media Library,
 *  one row per file, so the footage can be found again months later. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let body: {
    folderId?: string;
    kind?: "event" | "vlog";
    label?: string;
    sent?: number;
    failed?: number;
    keywords?: string;
    thoughts?: string;
    files?: { name?: string; id?: string; size?: number }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const folderId = (body.folderId || "").trim();
  if (!folderId) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const link = folderUrl(folderId);

  // The files are already in Drive. Tagging is a bonus on top, so it is wrapped
  // in its own try/catch and never turns a finished upload into an error.
  let filed = 0;
  try {
    const files: MediaRowInput[] = (body.files || [])
      .filter((f) => f && typeof f.id === "string" && f.id)
      .slice(0, 50)
      .map((f) => ({
        fileName: String(f.name || "file").slice(0, 200),
        fileId: String(f.id).slice(0, 100),
        size: Number.isFinite(f.size) ? Number(f.size) : undefined,
      }));
    if (files.length) {
      const result = await fileMediaRows(files, {
        kind: body.kind === "vlog" ? "vlog" : "event",
        label: String(body.label || "").slice(0, 200),
        folderId,
        keywords: String(body.keywords || "").slice(0, 600),
        thoughts: String(body.thoughts || "").slice(0, 2000),
        uploadedBy: session.name || session.email,
      });
      filed = result.filed;
      if (result.skipped) console.warn("media library:", result.skipped);
    }
  } catch (err) {
    console.error("media library write failed", err);
  }

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
  return NextResponse.json({ status: "ok", folderUrl: link, filed });
}
