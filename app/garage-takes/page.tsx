import type { Metadata } from "next";
import Link from "next/link";
import { GARAGE_TAKES_PLAYLIST_ID } from "@/lib/youtube";
import { publishedGarageTakes, takeCompanionPost } from "@/lib/garageTakes";
import { SITE_URL } from "@/lib/site";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Garage Takes",
  description:
    "Anthony's honest takes from the garage: what he'd daily, what he'd build, and what he'd leave alone. A new one every week, alongside that week's story.",
  alternates: { canonical: `${SITE_URL}/garage-takes` },
  openGraph: {
    title: "Garage Takes",
    description: "Anthony's honest takes from the garage. A new one every week.",
    url: `${SITE_URL}/garage-takes`,
    images: [{ url: `${SITE_URL}/img/garage-takes/share.jpg`, width: 1200, height: 630, alt: "Garage Takes — Anthony's honest takes from the garage" }],
  },
};

const day = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export default function GarageTakesPage() {
  const takes = publishedGarageTakes();

  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container">
        {/* The banner carries the series name and the one-line description, so the
            page doesn't repeat either underneath it. */}
        <div className="takes-banner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/garage-takes/banner.jpg"
            alt="Garage Takes — Anthony's honest takes from the garage"
            width={1920}
            height={1080}
            fetchPriority="high"
          />
          <h1 className="sr-only">Garage Takes</h1>
        </div>

        <div className="mt-3" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <p className="lead mb-0" style={{ maxWidth: "62ch" }}>
            What he&apos;d daily, what he&apos;d build, and what he&apos;d leave alone. A new one every week, next to that
            week&apos;s story.
          </p>
          <a href={`https://www.youtube.com/playlist?list=${GARAGE_TAKES_PLAYLIST_ID}`} target="_blank" rel="noopener" className="view-all">
            Full Playlist On YouTube
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </a>
        </div>

        {takes.length ? (
          <div className="grid grid-2 mt-4">
            {takes.map((take) => {
              const post = takeCompanionPost(take);
              return (
                <Link className="card" href={`/garage-takes/${take.slug}`} key={take.slug}>
                  <div className="card-media card-media-video">
                    <div className="play-overlay">
                      <div className="play-circle">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://i.ytimg.com/vi/${take.videoId}/maxresdefault.jpg`} alt={take.title} loading="lazy" />
                  </div>
                  <div className="card-body">
                    <h2 style={{ fontSize: 20 }}>{take.title}</h2>
                    <p className="meta">{day(take.publishedAt)}</p>
                    <p>{take.summary}</p>
                    {post && <p className="mb-0 meta">Goes with: {post.title}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 mb-0">
            The first takes go live this week. <Link href="/subscribe">Get The Dirt Line</Link> and they land in your inbox
            as they drop.
          </p>
        )}
      </div>
    </section>
  );
}
