import type { Metadata } from "next";
import VideoHub from "@/components/VideoHub";
import { getHubVideos, type HubKind } from "@/lib/videoHub";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Videos",
  description:
    "Every Asphalt & Dirt trail ride, event video and Garage Take in one place: Jeep, truck and off-road rides in the NJ Pine Barrens and beyond, plus Anthony's honest takes from the garage. Newest first.",
  alternates: { canonical: `${SITE_URL}/videos` },
};

/** The Videos hub (Jose 10/2, option 2): replaces the separate trail video
 *  and Garage Takes lists; podcast episodes stay on /podcast. */
export default async function VideosPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const filter: HubKind | "all" = type === "trail" || type === "takes" ? type : "all";
  const videos = await getHubVideos();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Asphalt & Dirt Videos",
    itemListElement: videos.map((v, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}${v.href}`,
      name: v.title,
    })),
  };

  return (
    <section className="section-pt-tight section-pb-tight">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container">
        <div className="eyebrow accent">Videos</div>
        <h1 className="mt-2">Watch The Ride.</h1>
        <p className="lead mt-2" style={{ maxWidth: "62ch" }}>
          Every trail ride, event and Garage Take in one place. Newest first, and the next one plays when it ends.
        </p>
        <VideoHub videos={videos} filter={filter} />
      </div>
    </section>
  );
}
