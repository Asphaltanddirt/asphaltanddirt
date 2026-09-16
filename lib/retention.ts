import { listRecords, deleteRecord } from "@/lib/airtable";
import { EMERGENCY_CONTACTS_TABLE } from "@/lib/eventComms";
import { MEDIA_BASE_ID, MEDIA_TABLE, folderIdFromUrl } from "@/lib/eventMedia";
import { isDriveConfigured, trashDriveItem } from "@/lib/googleDrive";

/**
 * Keeps the retention promises in the Event Privacy Policy (PRIVACY-1.1) true.
 * Runs daily from /api/cron/retention:
 *
 *   - Emergency contacts: deleted once past Delete After (event date + 90 days),
 *     unless Hold is ticked for an incident.
 *   - Rejected submissions: Drive folder trashed and row deleted 90 days after
 *     submission. Unreviewed submissions and videos are never auto-deleted;
 *     staff review kept media at least once a year.
 *
 * Not automated yet, because nothing is due: routine Tailgate messages (2 years,
 * first due fall 2028) and signed agreements (7 years / a child's 21st
 * birthday, first due 2033). Build those before then.
 */

const COMMS_BASE_ID = process.env.AIRTABLE_EVENT_COMMS_BASE_ID;
const REJECTED_KEEP_DAYS = 90;

export interface RetentionResult {
  emergencyContactsDeleted: number;
  rejectedSubmissionsDeleted: number;
  errors: string[];
}

export async function runRetention(now = new Date()): Promise<RetentionResult> {
  const result: RetentionResult = { emergencyContactsDeleted: 0, rejectedSubmissionsDeleted: 0, errors: [] };
  const today = now.toISOString().slice(0, 10);

  const contacts = await listRecords(
    EMERGENCY_CONTACTS_TABLE,
    `AND({Delete After}, NOT({Hold}), IS_BEFORE({Delete After}, '${today}'))`,
    { baseId: COMMS_BASE_ID },
  );
  for (const r of contacts) {
    try {
      await deleteRecord(EMERGENCY_CONTACTS_TABLE, r.id, { baseId: COMMS_BASE_ID });
      result.emergencyContactsDeleted++;
    } catch (err) {
      result.errors.push(`emergency contact ${r.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const cutoff = new Date(now.getTime() - REJECTED_KEEP_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const rejected = await listRecords(MEDIA_TABLE, `{Rejected}`, { baseId: MEDIA_BASE_ID });
  for (const r of rejected) {
    if (r.createdTime > cutoff) continue;
    try {
      const folderId = folderIdFromUrl(r.fields["Drive Folder"]);
      if (folderId) {
        // Keep the row if its files can't be removed, so the next run retries.
        if (!isDriveConfigured()) throw new Error("Drive isn't configured, files not removed");
        await trashDriveItem(folderId);
      }
      await deleteRecord(MEDIA_TABLE, r.id, { baseId: MEDIA_BASE_ID });
      result.rejectedSubmissionsDeleted++;
    } catch (err) {
      result.errors.push(`submission ${r.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}
