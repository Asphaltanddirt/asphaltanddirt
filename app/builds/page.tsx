import type { Metadata } from "next";
import Link from "next/link";
import { builds } from "@/lib/builds";
import { getApprovedCommunityBuilds } from "@/lib/communityBuilds";
import { getFeaturedBuilds } from "@/lib/featuredBuilds";
import AmbassadorBuildBadge from "@/components/AmbassadorBuildBadge";

export const metadata: Metadata = {
  title: "Builds",
  description: "Real rigs. Real stories. Explore the rigs, the gear, and the grind behind the build.",
};

export default async function BuildsPage() {
  // Team builds always come first — community submissions are appended
  // after, not mixed in ahead of them.
  const communityBuilds = await getApprovedCommunityBuilds();
  const allBuilds = [...builds, ...communityBuilds];
  const featuredBuilds = await getFeaturedBuilds(allBuilds);

  return (
    <>
      <section className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/builds/hero.jpg"
          className="hero-bg"
          alt="A Jeep and a street car with hoods open in the garage, mid-build"
        />
        <div className="hero-scrim" />
        <div className="container hero-inner">
          <div className="hero-content">
            <h1>
              <span className="line">Real Rigs.</span>
              <span className="line accent-text">Real Stories.</span>
            </h1>
            <div className="eyebrow mt-2" style={{ fontSize: 16 }}>The Rigs You See On The Trail.</div>
            <p className="lead mt-4">
              Every build has a purpose. Every detail has a story. Explore the rigs, the gear, and the
              grind behind the build.
            </p>
            <Link href="/builds/all" className="btn btn-primary">Explore The Builds</Link>
          </div>
        </div>
      </section>

      <section className="section-pb-tight">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">Featured Rigs</div>
            <Link href="/builds/all" className="view-all">
              View All Builds
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
          </div>
          <div className="grid grid-2 mt-4">
            {featuredBuilds.map((build) => (
              <div className="card" key={build.slug}>
                <div className="card-media" style={{ aspectRatio: "16/10", position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={build.listingImage.src} alt={build.listingImage.alt} />
                  {build.isAmbassador && <AmbassadorBuildBadge placement="card" />}
                </div>
                <div className="card-body">
                  <div className="build-kicker">{build.kicker}</div>
                  <h3>{build.nameLines.join(" ")}</h3>
                  <div className="accent-text" style={{ fontWeight: 700, fontSize: 13 }}>{build.vehicle}</div>
                  <p>{build.lead}</p>
                  <div className="card-actions">
                    <Link href={`/builds/${build.slug}`} className="btn btn-outline-accent btn-sm">
                      View Build
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-alt section-pt-tight">
        <div className="container">
          <div className="promo-banner">
            <div className="promo-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/community/campfire.jpg" alt="Crew gathered around a campfire in Asphalt & Dirt hoodies" />
            </div>
            <div className="promo-copy">
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 26 }}>Show Us Your Rig</h3>
              <div className="accent-text" style={{ fontWeight: 800, textTransform: "uppercase", fontSize: 14 }}>
                Your Build Could Be Featured.
              </div>
              <p>
                Got a Jeep, truck, overland setup, or off-road build you&apos;re proud of? Submit it to
                the Asphalt &amp; Dirt team for a chance to be featured in our Builds gallery and on the
                channel.
              </p>
              <Link href="/builds/submit" className="btn btn-primary" style={{ width: "fit-content" }}>
                Submit Your Build
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
