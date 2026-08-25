import type { Metadata } from "next";
import Link from "next/link";
import { episodes } from "@/lib/episodes";

export const metadata: Metadata = {
  title: "Podcast | Asphalt & Dirt",
  description: "Built street rides. Trail culture. Real events. Real talk.",
};

export default function PodcastIndexPage() {
  return (
    <section>
      <div className="container">
        <div className="eyebrow accent">Intro Video</div>
        <h1 className="mt-2">
          <span className="line">This Is</span>
          <span className="line accent-text">Asphalt</span>
          <span className="line">&amp; Dirt</span>
        </h1>
        <p className="lead mt-2">Built street rides. Trail culture. Real events. Real talk.</p>

        <div className="section-head mt-6">
          <div className="eyebrow">Latest Episodes</div>
        </div>
        <div className="grid grid-3">
          {episodes.map((episode) => (
            <Link key={episode.slug} href={`/podcast/${episode.slug}`} className="card">
              <div className="card-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={episode.artwork.src} alt={episode.artwork.alt} />
              </div>
              <div className="card-body">
                <h3>{episode.title}</h3>
                <p>{episode.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
