import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Subscription Confirmed",
  description: "Your Asphalt & Dirt newsletter subscription is confirmed.",
  robots: { index: false, follow: false },
};

export default function NewsletterConfirmedPage() {
  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container">
        <div className="form-success">
          <div className="form-success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h1>Subscription Confirmed!</h1>
          <p className="lead" style={{ maxWidth: 480 }}>
            Thanks for joining the crew. New podcast episodes, build features, event announcements, and merch
            drops will land straight in your inbox.
          </p>
          <Link href="/" className="btn btn-primary">
            Explore Asphalt &amp; Dirt
          </Link>
        </div>
      </div>
    </section>
  );
}
