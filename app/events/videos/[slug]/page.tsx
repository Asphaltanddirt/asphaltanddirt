import type { Metadata } from "next";
import { getAllEpisodes } from "@/lib/episodes";
import EpisodePageView, { episodeMetadata } from "@/components/EpisodePageView";

/** Episodes added in Airtable show up within 5 minutes: known slugs are
 *  built ahead, new ones render on first visit and then refresh. */
export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getAllEpisodes()).filter((e) => e.type === "trail-event").map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return episodeMetadata((await params).slug);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <EpisodePageView slug={(await params).slug} kind="trail-event" />;
}
