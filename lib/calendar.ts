import ical from "node-ical";
import type { VEvent, ParameterValue } from "node-ical";

/**
 * Community events, synced live from the team@asphaltanddirt.com Google
 * Calendar's private iCal feed. That calendar isn't exclusively public
 * events — it also picks up things like Zoom meeting invites — so only
 * events whose URL points to a real Facebook event are published here.
 * That matches the existing workflow (an event gets a Facebook link when
 * it's created) with zero extra effort, and guarantees nothing private
 * ever surfaces on the site by accident.
 */

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date | null;
  url: string;
}

function textValue(value: ParameterValue | undefined): string {
  if (!value) return "";
  return typeof value === "string" ? value : value.val;
}

/**
 * Facebook hands out event links in two shapes depending on how the event
 * was added to the calendar: a real https://facebook.com/... web URL (e.g.
 * shared from iOS), or an fb://event/?id=... app deep link (e.g. added from
 * the Facebook app itself). Only the web form actually opens anywhere other
 * than the FB mobile app, so normalize both into a real web URL — and treat
 * either shape as proof this is a genuine public event, not some other
 * private thing that happens to live on the same calendar (a Zoom invite,
 * say, which has no Facebook link at all).
 */
function facebookEventUrl(url: string | undefined): string | null {
  if (!url) return null;
  if (/^https:\/\/(www\.)?facebook\.com\//i.test(url)) return url;
  const appLink = url.match(/^fb:\/\/event\/?\?id=(\d+)/i);
  if (appLink) return `https://www.facebook.com/events/${appLink[1]}`;
  return null;
}

export async function getCommunityEvents(): Promise<{ upcoming: CommunityEvent[]; past: CommunityEvent[] }> {
  const feedUrl = process.env.GOOGLE_CALENDAR_ICAL_URL;
  if (!feedUrl) {
    console.error("Missing GOOGLE_CALENDAR_ICAL_URL");
    return { upcoming: [], past: [] };
  }

  let events: CommunityEvent[];
  try {
    const res = await fetch(feedUrl, { next: { revalidate: 900 } });
    if (!res.ok) {
      console.error("Calendar feed fetch failed", res.status, await res.text());
      return { upcoming: [], past: [] };
    }
    const icsText = await res.text();
    const parsed = ical.sync.parseICS(icsText);

    events = Object.values(parsed)
      .filter((item): item is VEvent => item?.type === "VEVENT")
      .map((item) => ({ item, url: facebookEventUrl(item.url) }))
      .filter((entry): entry is { item: VEvent; url: string } => entry.url !== null)
      .map(({ item, url }) => ({
        id: item.uid,
        title: textValue(item.summary) || "Untitled Event",
        description: textValue(item.description),
        location: textValue(item.location),
        start: item.start,
        end: item.end ?? null,
        url,
      }));
  } catch (err) {
    console.error("Calendar feed fetch/parse error", err);
    return { upcoming: [], past: [] };
  }

  const now = new Date();
  const upcoming = events
    .filter((e) => e.start >= now)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  const past = events
    .filter((e) => e.start < now)
    .sort((a, b) => b.start.getTime() - a.start.getTime());

  return { upcoming, past };
}
