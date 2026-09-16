import type { CommsSettings } from "@/lib/eventComms";
import type { EventDetail } from "@/lib/events";
import { getWaiver, type WaiverDocument } from "@/lib/waivers";

/** The agreement an event shows, with its details filled in. Used by the
 *  sign-up page and again by the API when recording what was signed, so the
 *  stored snapshot is built on the server, never taken from the browser. */
export function waiverForEvent(settings: CommsSettings | null, event: EventDetail | null): WaiverDocument {
  const eventDate = event?.date
    ? new Date(`${event.date}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "the scheduled date";
  return getWaiver(settings?.waiverVersion, {
    eventName: event?.title || "This Event",
    eventDate,
    location: settings?.venue || event?.generalArea || "the announced location",
    state: settings?.eventState || "New Jersey",
  });
}
