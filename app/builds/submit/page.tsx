import type { Metadata } from "next";
import Link from "next/link";
import BuildSubmissionForm from "@/components/BuildSubmissionForm";

export const metadata: Metadata = {
  title: "Submit Your Build",
  description: "Show us your rig — submit your build's photos, specs, and story for a chance to be featured.",
};

export default function SubmitBuildPage() {
  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container build-form-page">
        <Link href="/builds" className="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 18 5 12l6-6M5 12h14" /></svg>
          Back To Builds
        </Link>
        <div className="eyebrow accent mt-3">Show Us Your Rig</div>
        <h1 className="mt-2">Submit Your Build</h1>
        <p className="lead mt-2">
          Got a Jeep, truck, overland setup, or off-road build you&apos;re proud of? Tell us about it
          below for a chance to be featured in our Builds gallery and on the channel.
        </p>
        <BuildSubmissionForm />
      </div>
    </section>
  );
}
