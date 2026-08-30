import type { Metadata } from "next";
import Link from "next/link";
import AmbassadorApplicationForm from "@/components/AmbassadorApplicationForm";

export const metadata: Metadata = {
  title: "Apply: Road & Trail Crew",
  description: "Apply to join the Asphalt & Dirt Road & Trail Crew — our brand ambassador program for real builders, creators, and community leaders.",
};

export default function AmbassadorApplyPage() {
  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container build-form-page">
        <Link href="/team" className="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 18 5 12l6-6M5 12h14" /></svg>
          Back To Team
        </Link>
        <div className="eyebrow accent mt-3">Real People. Real Builds. Street To Trail.</div>
        <h1 className="mt-2">Join The Road &amp; Trail Crew</h1>
        <p className="lead mt-2">
          We&apos;re looking for street and off-road enthusiasts, builders, photographers, and
          community leaders to represent Asphalt &amp; Dirt. This isn&apos;t a follower-count
          contest — engagement, credibility, and real participation in the culture matter more.
        </p>
        <AmbassadorApplicationForm />
      </div>
    </section>
  );
}
