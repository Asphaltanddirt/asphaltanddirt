import type { Metadata } from "next";
import ReviewSubmissionForm from "@/components/ReviewSubmissionForm";

export const metadata: Metadata = {
  title: "Leave A Review",
  description: "Share your experience with Asphalt & Dirt — the podcast, the events, or the community.",
  robots: { index: false, follow: false },
};

export default function SubmitReviewPage() {
  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container build-form-page">
        {/* Standalone page — no site header/footer (see components/SiteChrome.tsx),
         *  so this link is a shareable, self-contained form with no path onward
         *  into the rest of the site. Static brand mark only, not a link. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/branding/asphalt-and-dirt-horizontal.png"
          alt="Asphalt & Dirt"
          className="logo-image"
          style={{ marginBottom: "var(--sp-4)" }}
        />
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
