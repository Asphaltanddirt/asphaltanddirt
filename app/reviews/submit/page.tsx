import type { Metadata } from "next";
import Link from "next/link";
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
        {/* Standalone page — no site header/footer (see components/SiteChrome.tsx).
         *  It's handed out as a shareable link, but it's also reached from the
         *  site (community CTA, home reviews), so the brand mark links home to
         *  give people a way back. */}
        <Link href="/" aria-label="Asphalt & Dirt home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/branding/asphalt-and-dirt-horizontal.png"
            alt="Asphalt & Dirt"
            className="logo-image"
            style={{ marginBottom: "var(--sp-4)" }}
          />
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
