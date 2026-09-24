import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/garageAuth";
import { folderUrl } from "@/lib/googleDrive";
import { fileMediaRows, type MediaRowInput } from "@/lib/mediaLibrary";
import { isEventType, type UploadKind } from "@/lib/mediaKinds";
import { getEventBySlug } from "@/lib/events";
import { sendEmail } from "@/lib/resendEmail";

function esc(value: string) {
  return value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] || c);
}

/** An upload batch finished. Vlogs email team@ the folder link so Jose knows
 *  one is waiting; event uploads just land in the event folder. Every file is
 *  filed in the Media Library, one row per file, with whatever was typed in the
 *  two boxes on the upload screen, so the footage can be found again months
 *  later. Garage Takes and Other footage are filed even when nothing was typed:
 *  with no event behind them, the library row is the only way back to them. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let body: {
    folderId?: string;
    kind?: UploadKind;
    /** Other footage only: the one-tap Asphalt / Dirt / Both. */
    eventType?: string;
    label?: string;
    slug?: string;
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
  const kind: UploadKind = body.kind === "vlog" || body.kind === "other" ? body.kind : "event";

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
    // The two primary tags are seeded from the event, never typed: Event Type
    // (Asphalt / Dirt / Both) and its Venue Type(s). Best-effort — a footage
    // row with no seed is still better than no row, so a failed lookup must
    // not cost the whole write. Other footage has no event, so its Event Type
    // is the one the uploader tapped; the screen won't start without it, and
    // anything that isn't one of the three is dropped rather than typecast
    // into a new, wrong choice on a locked dropdown.
    const event =
      kind === "event" && body.slug
        ? await getEventBySlug(String(body.slug).slice(0, 200), { includeCrewOnly: true }).catch(() => null)
        : null;

    if (files.length) {
      const result = await fileMediaRows(files, {
        kind,
        label: String(body.label || "").slice(0, 200),
        folderId,
        keywords: String(body.keywords || "").slice(0, 600),
        thoughts: String(body.thoughts || "").slice(0, 2000),
        uploadedBy: session.name || session.email,
        eventType: kind === "other" ? (isEventType(body.eventType) ? body.eventType : undefined) : event?.eventType,
        venueTypes: event?.venueTypes,
      });
      filed = result.filed;
      if (result.skipped) console.warn("media library:", result.skipped);
    }
  } catch (err) {
    console.error("media library write failed", err);
  }

  if (kind === "vlog" && (body.sent || 0) > 0) {
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
