import { NextRequest } from "next/server";
import { getEventBySlug } from "@/lib/events";
import { SITE_URL } from "@/lib/site";

/**
 * /events/<slug>/calendar.ics — "Add to calendar" (punchlist 19, 2026-09-25).
 * Linked from the RSVP confirmation (page and email). Public-safe on purpose:
 * the general area, never the meetup spot, because anyone can open this link.
 * The start time comes from the "Meet:" line in At A Glance when there is one.
 */
const pad = (n: number) => String(n).padStart(2, "0");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** "9:30 AM (exact spot emailed after you RSVP)" → [9, 30]. */
function meetTime(value: string): [number, number] | null {
  const m = value.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return [h, Number(m[2] || 0)];
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug).catch(() => null);
  if (!event || !event.date) return new Response("Event not found.", { status: 404 });

  const day = event.date.replace(/-/g, "");
  const meet = event.atAGlance.find((f) => /^meet/i.test(f.label));
  const time = meet ? meetTime(meet.value) : null;
  const url = `${SITE_URL}/events/${event.slug}`;
  const next = new Date(`${event.date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);

  const when = time
    ? [`DTSTART;TZID=America/New_York:${day}T${pad(time[0])}${pad(time[1])}00`, `DTEND;TZID=America/New_York:${day}T${pad(Math.min(time[0] + 6, 23))}${pad(time[1])}00`]
    : [`DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replace(/-/g, "")}`];

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Asphalt & Dirt//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}-${day}@asphaltanddirt.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    ...when,
    `SUMMARY:${esc(event.title.trim())}`,
    `LOCATION:${esc(event.generalArea || "")}`,
    `DESCRIPTION:${esc(`Exact meet spot is in your RSVP email.\n${url}`)}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
