import { NextRequest, NextResponse } from "next/server";
import { listEventsNeedingDriveFolder, setEventDriveFolder } from "@/lib/events";
import { ensureEventFolders, folderUrl, isDriveConfigured } from "@/lib/googleDrive";

export const maxDuration = 60;

/**
 * Hourly: every event with a Title and Date but no Drive Folder link gets its
 * folder set up (1. Staff Uploads / 2. Attendee Submissions / 3. Best Of /
 * 4. Event Docs) and the link saved on the event. An existing folder for that
 * date is reused and its old subfolder names renamed, so this also brings
 * older events in line with the protocol.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isDriveConfigured()) return NextResponse.json({ status: "skipped", reason: "Drive not configured" });

  const done: string[] = [];
  const errors: string[] = [];
  try {
    const events = await listEventsNeedingDriveFolder();
    for (const event of events) {
      try {
        const { eventFolderId } = await ensureEventFolders(event);
        await setEventDriveFolder(event.id, folderUrl(eventFolderId));
        done.push(event.slug);
      } catch (err) {
        errors.push(`${event.slug}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    console.error("event-drive run failed", err);
    return NextResponse.json({ error: "Event Drive run failed." }, { status: 500 });
  }
  if (errors.length) console.error("event-drive errors", errors);
  return NextResponse.json({ status: "ok", done, errors });
}
