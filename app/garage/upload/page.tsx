import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageUpload from "@/components/GarageUpload";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { getCrewEvents } from "@/lib/events";
import { getPublishedPosts } from "@/lib/blog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Upload · A and D Garage",
  robots: { index: false, follow: false },
};

function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Garage → Upload: photos, videos and vlogs straight into Google Drive. */
export default async function GarageUploadPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/garage");
  const { event } = await searchParams;

  const { upcoming, past } = await getCrewEvents().catch(() => ({ upcoming: [], past: [] }));
  // Most recent first: the ride that just happened is the likeliest upload.
  const events = [...past.slice(0, 4), ...upcoming.slice(0, 2)]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e) => ({ slug: e.slug, title: e.title, date: shortDate(e.date) }));

  // Vlogs follow this week's two blog posts (one vlog each).
  const vlogTitles = canSeeOwnerOnly(session)
    ? getPublishedPosts()
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 2)
        .map((p) => p.title)
    : [];

  return (
    <div className="garage">
      <GarageBack title="Upload" />
      <div className="garage-body">
        <GarageUpload vlogTitles={vlogTitles} events={events} initialEventSlug={event} />
      </div>
    </div>
  );
}
