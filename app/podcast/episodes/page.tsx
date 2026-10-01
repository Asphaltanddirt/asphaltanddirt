import type { Metadata } from "next";
import Link from "next/link";
import EpisodeCard from "@/components/EpisodeCard";
import SubscribeButton from "@/components/SubscribeButton";
import { getEpisodesOfType } from "@/lib/episodes";
import { SITE_URL } from "@/lib/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "All Podcast Episodes",
  description: "Every Asphalt & Dirt podcast episode, newest first: street builds, trail culture, real events and real talk.",
  alternates: { canonical: `${SITE_URL}/podcast/episodes` },
};

/** The on-site playlist for podcast episodes. Every card opens our own
 *  episode page, never YouTube. */
export default async function PodcastEpisodesPage() {
  const episodes = await getEpisodesOfType("podcast");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Asphalt & Dirt Podcast Episodes",
    itemListElement: episodes.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/podcast/${e.slug}`,
      name: e.title,
    })),
  };

  return (
    <section className="section-pt-tight section-pb-tight">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container">
        <Link href="/podcast" className="back-link mb-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
          Back To Podcast
        </Link>
        <h1 className="mt-4">All Episodes</h1>
        <p className="lead mt-2">New episodes every Wednesday from November 11. Newest first.</p>
        <div className="grid grid-3 mt-4">
          {episodes.map((e) => (
            <EpisodeCard key={e.slug} episode={e} />
          ))}
        </div>
        <div className="mt-4">
          <SubscribeButton source="podcast_episodes" label="Tell Me When Episodes Drop" returnTo="/podcast/episodes" />
        </div>
      </div>
    </section>
  );
}
