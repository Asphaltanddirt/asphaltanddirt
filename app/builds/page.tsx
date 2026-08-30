import type { Metadata } from "next";
import BuildsList from "@/components/BuildsList";
import { builds } from "@/lib/builds";

export const metadata: Metadata = {
  title: "Builds",
  description: "Real rigs. Real stories. Explore the rigs, the gear, and the grind behind the build.",
};

export default function BuildsPage() {
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
            <a href="#builds-list" className="btn btn-primary">Explore The Builds</a>
          </div>
        </div>
      </section>

      <section className="section-pb-tight" id="builds-list">
        <div className="container">
          <BuildsList builds={builds} />
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
              <a
                href="mailto:team@asphaltanddirt.com?subject=Submit%20My%20Build"
                className="btn btn-primary"
                style={{ width: "fit-content" }}
              >
                Submit Your Build
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
