import type { Metadata } from "next";
import Link from "next/link";
import RecapCard from "@/components/RecapCard";
import { fetchLatestFromPlaylist, TRAIL_EVENT_VIDEOS_PLAYLIST_ID } from "@/lib/youtube";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Ride Recaps & Highlights",
  description: "Every Asphalt & Dirt trail ride and event recap video, newest first.",
  alternates: { canonical: `${SITE_URL}/events/recaps` },
};

export default async function AllRecapsPage() {
  const recaps = await fetchLatestFromPlaylist(TRAIL_EVENT_VIDEOS_PLAYLIST_ID, 50);

  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <Link href="/events" className="back-link mb-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
            Back To Events
          </Link>
          <a href={`https://www.youtube.com/playlist?list=${TRAIL_EVENT_VIDEOS_PLAYLIST_ID}`} target="_blank" rel="noopener" className="view-all">
            Full Playlist On YouTube
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </a>
        </div>
        <h1 className="mt-4">Ride Recaps &amp; Highlights</h1>
        <p className="lead mt-2">Every trail ride and event we&apos;ve filmed &mdash; newest first.</p>
        {recaps.length ? (
          <div className="grid grid-3 mt-4">
            {recaps.map((video) => (
              <RecapCard key={video.videoId} video={video} />
            ))}
          </div>
        ) : (
          <p className="mt-4 mb-0">Recaps drop soon &mdash; check back here so you don&apos;t miss one.</p>
        )}
      </div>
    </section>
  );
}
