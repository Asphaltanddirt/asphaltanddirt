import { canRunEvents, type GarageSession } from "@/lib/garageAuth";
import { listRecords, isAirtableConfigured } from "@/lib/airtable";

/**
 * Who runs an event (Jose 9/25, the 9/15 Tailgate plan): Owners always, and
 * anyone signed in to the Garage who marked **Going** on that event gets its
 * event-day tools: Tailgate staff mode, the RSVP roster with phones, and
 * approving its attendee photos. The crew are the same people whatever their
 * role says, so it follows the Going answer, not the role. (A Staff role
 * still means every event, for anyone we ever add that way.)
 *
 * Tailgate asks this on every chat poll, so the answer is cached for a
 * minute: marking Going takes effect within 60 seconds.
 */

const BASE_ID = process.env.AIRTABLE_GARAGE_BASE_ID;
const TABLE = "Event Responses";

export async function isGoing(email: string, slug: string): Promise<boolean> {
  if (!isAirtableConfigured(BASE_ID) || !email || !slug) return false;
  const safe = (s: string) => s.replace(/'/g, "\\'");
  const rows = await listRecords(
    TABLE,
    `AND(LOWER({Email}) = '${safe(email.trim().toLowerCase())}', {Event Slug} = '${safe(slug)}', {Response} = 'Going')`,
    { baseId: BASE_ID, revalidate: 60 },
  ).catch(() => []);
  return rows.length > 0;
}

export async function canRunEvent(session: GarageSession | null, slug: string): Promise<boolean> {
  if (!session) return false;
  if (canRunEvents(session)) return true;
  return isGoing(session.email, slug);
}
