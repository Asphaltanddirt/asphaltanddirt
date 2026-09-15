import { listRecords, upsertRecords, isAirtableConfigured, type AirtableFields } from "@/lib/airtable";

/**
 * Crew answers to events inside A&D Garage: Going / Maybe / Can't.
 *
 * Separate from the public RSVPs table in the Events base — that's attendees
 * signing up for a ride; this is the crew saying whether they're working it.
 * Staff who answer Going are who gets that event's Tailgate access.
 */

const BASE_ID = process.env.AIRTABLE_GARAGE_BASE_ID;
const TABLE = "Event Responses";

export type EventResponse = "Going" | "Maybe" | "Can't";

export interface CrewResponse {
  email: string;
  name: string;
  eventSlug: string;
  response: EventResponse;
}

function toResponse(r: { fields: AirtableFields }): CrewResponse {
  return {
    email: ((r.fields.Email as string) || "").trim().toLowerCase(),
    name: (r.fields.Name as string) || "",
    eventSlug: (r.fields["Event Slug"] as string) || "",
    response: (r.fields.Response as EventResponse) || "Maybe",
  };
}

/** Every crew answer for the events listed, so a page can show both "yours"
 *  and "who else is in" without a request per event. */
export async function getEventResponses(slugs: string[]): Promise<CrewResponse[]> {
  if (!isAirtableConfigured(BASE_ID) || slugs.length === 0) return [];
  const records = await listRecords(TABLE, undefined, { baseId: BASE_ID });
  const wanted = new Set(slugs);
  return records.map(toResponse).filter((r) => wanted.has(r.eventSlug));
}

/** One row per person per event: the Key field is what makes a second answer
 *  update the first instead of piling up. */
export async function setEventResponse(input: CrewResponse): Promise<void> {
  if (!isAirtableConfigured(BASE_ID)) throw new Error("A&D Garage base is not configured.");
  await upsertRecords(
    TABLE,
    [
      {
        fields: {
          Key: `${input.email}|${input.eventSlug}`,
          Email: input.email,
          Name: input.name,
          "Event Slug": input.eventSlug,
          Response: input.response,
          "Updated At": new Date().toISOString(),
        },
      },
    ],
    ["Key"],
    { baseId: BASE_ID },
  );
}
