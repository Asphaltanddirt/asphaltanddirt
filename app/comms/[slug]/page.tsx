import type { Metadata } from "next";
import { getCommsSettings, getMessages, isCommsOpen, isStaffCode } from "@/lib/eventComms";
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
  searchParams: Promise<{ staff?: string }>;
}) {
  const { slug } = await params;
  const { staff: staffParam } = await searchParams;

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

  const messages = await getMessages(slug);

  return (
    <CommsChat
      slug={slug}
      eventTitle={event?.title || "Event Chat"}
      initialMessages={messages}
      isStaff={isStaff}
      staffCode={isStaff ? staffParam || "" : ""}
    />
  );
}
