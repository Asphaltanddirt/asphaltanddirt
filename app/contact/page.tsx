import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch — order and merch questions, or anything else about Asphalt & Dirt.",
};

export default function ContactPage() {
  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container legal-page">
        <h1>Contact Us</h1>
        <p>What can we help with?</p>

        <a
          className="contact-option"
          href="https://asphalt-and-dirt-shop.fourthwall.com/contact"
          target="_blank"
          rel="noopener"
          style={{ display: "block", marginTop: "var(--sp-4)", marginBottom: "var(--sp-5)" }}
        >
          <div className="contact-option-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8h12l-1 12H7z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
          </div>
          <h3>An Order Or Merch Question</h3>
          <p>
            Shipping, sizing, a damaged item, a refund &mdash; orders are fulfilled and supported
            directly by Fourthwall, our print &amp; shipping partner. Their support form gets it
            handled fastest.
          </p>
          <span className="btn btn-primary btn-sm">
            Go To Order Support
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </span>
        </a>

        <h2>Everything Else</h2>
        <p>
          Podcast, events, sponsorships, the ambassador program, press, or just want to say
          something &mdash; this goes straight to the team.
        </p>
        <ContactForm />
      </div>
    </section>
  );
}
