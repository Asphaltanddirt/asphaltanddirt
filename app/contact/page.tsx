import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch — order and merch questions, or anything else about Asphalt & Dirt.",
};

export default function ContactPage() {
  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container legal-page">
        <h1>Contact Us</h1>
        <p>What can we help with? Pick whichever fits so it lands in the right place.</p>

        <div className="contact-options">
          <a
            className="contact-option"
            href="https://asphalt-and-dirt-shop.fourthwall.com/contact"
            target="_blank"
            rel="noopener"
          >
            <div className="contact-option-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8h12l-1 12H7z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" />
              </svg>
            </div>
            <h3>An Order Or Merch Question</h3>
            <p>
              Shipping, sizing, a damaged item, a refund — orders are fulfilled and supported
              directly by Fourthwall, our print &amp; shipping partner. This sends you straight to
              their support form so it gets handled fastest.
            </p>
            <span className="btn btn-primary btn-sm">
              Go To Order Support
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </span>
          </a>

          <a className="contact-option" href="mailto:team@asphaltanddirt.com">
            <div className="contact-option-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 6 8 7 8-7" />
              </svg>
            </div>
            <h3>Everything Else</h3>
            <p>
              Podcast, events, sponsorships, brand ambassador stuff, or just want to say
              something &mdash; this goes straight to the Asphalt &amp; Dirt team.
            </p>
            <span className="btn btn-primary btn-sm">
              Email The Team
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
