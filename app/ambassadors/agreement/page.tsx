import type { Metadata } from "next";
import Link from "next/link";
import AgreementForm from "@/components/AgreementForm";
import CrewResourceLinks from "@/components/CrewResourceLinks";
import { FullTerms, LegalShortVersion } from "@/components/FormHelpers";
import { AGREEMENT_INTRO, AGREEMENT_SECTIONS, AGREEMENT_VERSION } from "@/lib/ambassadorAgreement";
import { getAgreementPrefill, verifyAgreementLink, type AgreementPrefill } from "@/lib/ambassadorAgreementLink";

export const metadata: Metadata = {
  title: "Brand Ambassador Agreement",
  description:
    "The Asphalt & Dirt Road & Trail Crew Brand Ambassador Agreement — read and accept to activate your ambassador code.",
  robots: { index: false, follow: false },
};

export default async function AmbassadorAgreementPage({ searchParams }: { searchParams: Promise<{ id?: string; t?: string }> }) {
  // From the personal link in Welcome Email 1: fill in what we already know.
  const { id, t } = await searchParams;
  let prefill: AgreementPrefill | null = null;
  if (verifyAgreementLink(id, t)) prefill = await getAgreementPrefill(id).catch(() => null);

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
        <CrewResourceLinks current="/ambassadors/agreement" />

        <div className="mt-4">
          <LegalShortVersion
            points={[
              "You're an independent ambassador, not an A&D employee or official spokesperson, and you cover your own taxes, insurance and expenses.",
              "Your code gives customers 10% off. You earn 10%, 12% or 15% commission depending on your tier, on eligible sales after discounts (not tax, shipping, refunds or returns).",
              "Your own purchases never earn commission. Self-referrals, fake orders or code abuse can get you removed.",
              "Stay active. As a Road & Trail Member that means at least 2 A&D mentions or posts and 1 usable photo or video a month.",
              "Always make the relationship clear, e.g. \"A&D Ambassador\" or \"Affiliate link, I may earn a commission.\"",
              "No street takeovers, reckless public-road driving, trail damage, harassment or hate. Serious safety or conduct issues mean immediate removal.",
              "You keep ownership of your content. Anything you send A&D can be used on A&D's channels.",
              "You can work with other brands (unless it conflicts with an A&D campaign) and leave any time. Earnings aren't guaranteed.",
            ]}
          />
        </div>

        <div className="mt-3">
        <FullTerms label={`Read the full agreement (${AGREEMENT_SECTIONS.length} sections)`}>
        <nav className="legal-contents" aria-label="Agreement sections">
          <p className="legal-contents-title">Contents</p>
          <ol>
            {AGREEMENT_SECTIONS.map((section) => (
              <li key={section.n}>
                <a href={`#agreement-${section.n}`}>{section.heading}</a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="legal-doc mt-3">
          <p>{AGREEMENT_INTRO}</p>
          {AGREEMENT_SECTIONS.map((section) => (
            <div key={section.n} className="legal-section" id={`agreement-${section.n}`}>
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
        </FullTerms>
        </div>

        <AgreementForm prefill={prefill} />
      </div>
    </section>
  );
}
