import type { Metadata } from "next";
import Link from "next/link";
import EpisodeCard from "@/components/EpisodeCard";
import { getEpisodesOfType, seriesOf, type Episode } from "@/lib/episodes";
import { SITE_URL } from "@/lib/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Trail & Event Videos",
  description:
    "Every Asphalt & Dirt trail ride and event video in one place: Jeep, truck and off-road rides in the NJ Pine Barrens and beyond, newest first, multi-part rides in order.",
  alternates: { canonical: `${SITE_URL}/events/videos` },
};

/** The on-site playlist for trail & event videos (Jose 9/30: keep plays on
 *  the site). Every card opens our own video page; multi-part rides are
 *  grouped in part order, everything else newest first. */
export default async function TrailVideosPage() {
  const videos = await getEpisodesOfType("trail-event");

  const groups = new Map<string, Episode[]>();
  for (const v of videos) {
    const s = seriesOf(v);
    if (s) groups.set(s.name, [...(groups.get(s.name) ?? []), v]);
  }
  const series = [...groups.entries()]
    .filter(([, parts]) => parts.length > 1)
    .map(([name, parts]) => ({ name, parts: [...parts].sort((a, b) => seriesOf(a)!.part - seriesOf(b)!.part) }));
  const grouped = new Set(series.flatMap((s) => s.parts.map((p) => p.slug)));
  const rest = videos.filter((v) => !grouped.has(v.slug));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Asphalt & Dirt Trail & Event Videos",
    itemListElement: videos.map((v, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/events/videos/${v.slug}`,
      name: v.title,
    })),
  };

  return (
    <section className="section-pt-tight section-pb-tight">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container">
        <Link href="/events" className="back-link mb-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
          Back To Events
        </Link>
        <h1 className="mt-4">Trail &amp; Event Videos</h1>
        <p className="lead mt-2">Every ride and event we&apos;ve filmed. Multi-part rides play in order.</p>

        {series.map((s) => (
          <div className="series-block" key={s.name}>
            <div className="eyebrow accent">{s.parts.length}-Part Ride</div>
            <h2>{s.name}</h2>
            <div className="grid grid-3 mt-3">
              {s.parts.map((p) => (
                <EpisodeCard key={p.slug} episode={p} showPart />
              ))}
            </div>
          </div>
        ))}

        {rest.length ? (
          <div className="series-block">
            {series.length ? <div className="eyebrow">More Rides &amp; Events</div> : null}
            <div className="grid grid-3 mt-3">
              {rest.map((v) => (
                <EpisodeCard key={v.slug} episode={v} showPart />
              ))}
            </div>
          </div>
        ) : null}

        {!videos.length && <p className="mt-4 mb-0">Videos drop soon &mdash; check back here so you don&apos;t miss one.</p>}
      </div>
    </section>
  );
}
