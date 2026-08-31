import type { Metadata } from "next";
import Link from "next/link";
import ReviewSubmissionForm from "@/components/ReviewSubmissionForm";

export const metadata: Metadata = {
  title: "Leave A Review",
  description: "Share your experience with Asphalt & Dirt — the podcast, the events, or the community.",
};

export default function SubmitReviewPage() {
  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container build-form-page">
        <Link href="/" className="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 18 5 12l6-6M5 12h14" /></svg>
          Back Home
        </Link>
        <div className="eyebrow accent mt-3">Tell Us What You Think</div>
        <h1 className="mt-2">Leave A Review</h1>
        <p className="lead mt-2">
          Whether it&apos;s the podcast, an event, or just being part of the community &mdash; we&apos;d
          love to hear about it. Approved reviews get featured on the site.
        </p>
        <ReviewSubmissionForm />
      </div>
    </section>
  );
}
