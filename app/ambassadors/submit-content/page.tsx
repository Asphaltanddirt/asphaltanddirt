import type { Metadata } from "next";
import Link from "next/link";
import ContentSubmissionForm from "@/components/ContentSubmissionForm";

export const metadata: Metadata = {
  title: "Submit Content",
  description: "Road & Trail Crew content submission — share your monthly photo, video, or story with Asphalt & Dirt.",
  robots: { index: false, follow: false },
};

export default function SubmitContentPage() {
  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container build-form-page">
        <Link href="/ambassadors" className="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 18 5 12l6-6M5 12h14" /></svg>
          Back To Road &amp; Trail Crew
        </Link>
        <div className="eyebrow accent mt-3">Road &amp; Trail Crew</div>
        <h1 className="mt-2">Submit Your Content</h1>
        <p className="lead mt-2">
          Share your monthly photo, video, or story. We review every submission by hand — approved
          content may get featured across A&amp;D&apos;s social channels, the website, podcast promotion,
          or the newsletter.
        </p>
        <ContentSubmissionForm />
      </div>
    </section>
  );
}
