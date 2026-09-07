import type { Metadata } from "next";
import Link from "next/link";
import AgreementForm from "@/components/AgreementForm";
import { AGREEMENT_INTRO, AGREEMENT_SECTIONS, AGREEMENT_VERSION } from "@/lib/ambassadorAgreement";

export const metadata: Metadata = {
  title: "Brand Ambassador Agreement",
  description:
    "The Asphalt & Dirt Road & Trail Crew Brand Ambassador Agreement — read and accept to activate your ambassador code.",
  robots: { index: false, follow: false },
};

export default function AmbassadorAgreementPage() {
  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container build-form-page">
        <Link href="/ambassadors" className="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 18 5 12l6-6M5 12h14" /></svg>
          Back To Road &amp; Trail Crew
        </Link>
        <div className="eyebrow accent mt-3">Road &amp; Trail Crew</div>
        <h1 className="mt-2">Brand Ambassador Agreement</h1>
        <p className="lead mt-2">
          You&apos;ve been accepted into the Road &amp; Trail Crew. Read the agreement below, then
          confirm your details, tell us where to ship your welcome kit, and accept. Once that&apos;s
          in, we&apos;ll send your personal discount code and tracking link.
        </p>

        <div className="legal-doc mt-4">
          <p>{AGREEMENT_INTRO}</p>
          {AGREEMENT_SECTIONS.map((section) => (
            <div key={section.n} className="legal-section">
              <h2>
                {section.n}. {section.heading}
              </h2>
              {section.blocks.map((block, i) =>
                block.type === "p" ? (
                  <p key={i}>{block.text}</p>
                ) : (
                  <div key={i}>
                    {block.heading && <h3>{block.heading}</h3>}
                    <ul>
                      {block.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ),
              )}
            </div>
          ))}
          <p className="legal-version">Agreement version {AGREEMENT_VERSION}</p>
        </div>

        <AgreementForm />
      </div>
    </section>
  );
}
