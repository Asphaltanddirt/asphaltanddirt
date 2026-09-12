import type { Metadata } from "next";
import Link from "next/link";
import { getCommsSettings, getVisibleMessages, getAttendeeByToken, getAttendeeRoster, isCommsOpen, isStaffCode, type MessageViewer } from "@/lib/eventComms";
import { getEventBySlug } from "@/lib/events";
import CommsChat from "@/components/CommsChat";

export const metadata: Metadata = {
  title: "Event Chat",
  robots: { index: false, follow: false },
};

export default async function CommsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ staff?: string; token?: string }>;
}) {
  const { slug } = await params;
  const { staff: staffParam, token } = await searchParams;

  const [settings, event] = await Promise.all([getCommsSettings(slug), getEventBySlug(slug)]);
  const open = isCommsOpen(settings);
  const isStaff = isStaffCode(settings, staffParam);

  if (!open) {
    return (
      <section className="section-pt-tight section-pb-tight">
        <div className="container" style={{ maxWidth: 480, textAlign: "center" }}>
          <h1>Chat&apos;s Not Open</h1>
          <p className="lead mt-2">
            {settings
              ? "This event's group chat isn't live right now — it opens the evening before the event and stays open through the day."
              : "We couldn't find a chat for this event."}
          </p>
        </div>
      </section>
    );
  }

  const attendee = !isStaff && token ? await getAttendeeByToken(slug, token) : null;

  if (!isStaff && !attendee) {
    return (
      <section className="section-pt-tight section-pb-tight">
        <div className="container" style={{ maxWidth: 480, textAlign: "center" }}>
          <h1>Link Not Recognized</h1>
          <p className="lead mt-2">
            This chat only works with your personal link, emailed to you after you sign up.
          </p>
          <Link href={`/comms/${slug}/waiver`} className="btn btn-primary mt-3">Sign Up For The Chat</Link>
        </div>
      </section>
    );
  }

  // Filtered here, not in the browser — whatever this returns is embedded in
  // the page payload, so anything the viewer shouldn't have must never be in
  // it in the first place.
  const viewer: MessageViewer = isStaff
    ? { kind: "staff" }
    : { kind: "attendee", attendeeId: attendee!.id, checkedIn: attendee!.checkedIn };

  const [messages, roster] = await Promise.all([
    getVisibleMessages(slug, viewer),
    isStaff ? getAttendeeRoster(slug) : Promise.resolve([]),
  ]);

  return (
    <CommsChat
      slug={slug}
      eventTitle={event?.title || "Event Chat"}
      initialMessages={messages}
      isStaff={isStaff}
      staffCode={isStaff ? staffParam || "" : ""}
      attendeeName={attendee?.screenName || ""}
      attendeeVehicle={attendee?.vehicleCallsign || ""}
      attendeeCheckedIn={attendee?.checkedIn || false}
      initialRoster={roster}
    />
  );
}
