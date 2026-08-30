import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Road & Trail Crew",
  description: "The Asphalt & Dirt brand ambassador program — real people, real builds, street to trail.",
};

const CHECK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><path d="m8 12.5 2.5 2.5L16 9.5" />
  </svg>
);

const WHO_WE_WANT = [
  "Street-car and off-road enthusiasts",
  "Builders, fabricators, mechanics & detailers",
  "Jeep, truck, import, muscle & overlanding owners",
  "Automotive photographers & videographers",
  "Local event organizers & club leaders",
  "Women and families active in automotive culture",
];

const TIERS = [
  {
    name: "Road & Trail Member",
    blurb: "Entry-level ambassador status — for active community members and emerging creators.",
    benefits: [
      "A personal discount code to share",
      "Commission on merch sales made with your code",
      "Ambassador badge & digital media kit",
      "Reposts and possible features on our channels",
      "Early access to product announcements",
    ],
    expected: [
      "A couple of A&D mentions or pieces of content a month",
      "Your code or link shared where it makes sense",
      "One usable photo or short video a month",
    ],
  },
  {
    name: "Featured Ambassador",
    blurb: "For members producing consistent content, engagement, or sales.",
    benefits: [
      "Everything in Road & Trail Member",
      "A better discount code and commission rate",
      "Periodic complimentary product",
      "Priority features and collab opportunities",
      "Access to campaign briefs before they go public",
    ],
    expected: [
      "2–4 content pieces a month, including at least one original video",
      "Reliable participation in agreed campaigns",
      "Occasional feedback on products and community trends",
    ],
  },
  {
    name: "Crew Partner",
    blurb: "A selective tier for proven creators, organizers, builders, and community leaders.",
    benefits: [
      "Everything in Featured Ambassador",
      "A quarterly merchandise allowance",
      "Collaborative products or limited collections when it makes sense",
      "Featured podcast, build, or event coverage",
      "Priority consideration for paid campaigns",
    ],
    expected: [
      "Consistent monthly content and community activity",
      "Professional communication and reliable execution",
      "A track record of responsible conduct",
    ],
  },
];

const ENCOURAGED = [
  "Builds, mods, and garage time",
  "Responsible trail runs and real car meets",
  "Road trips and overlanding",
  "Honest product feedback",
  "Family participation in the culture",
];

const AVOID = [
  "Scripted, corporate-sounding ad copy",
  "Constant discount-code spam",
  "Anything disconnected from car culture",
  "Reposting other creators without permission",
];

export default function AmbassadorsPage() {
  return (
    <>
      <section className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/ambassadors/hero.jpg"
          className="hero-bg"
          alt="The Road & Trail Crew gathered around a Jeep and a Toyota Supra in a garage at dusk"
        />
        <div className="hero-scrim" />
        <div className="container hero-inner">
          <div className="hero-content">
            <Link href="/team" className="back-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 18 5 12l6-6M5 12h14" /></svg>
              Back To Team
            </Link>
            <div className="eyebrow accent mt-3">Real People. Real Builds. Street To Trail.</div>
            <h1 className="mt-2">Road &amp; Trail Crew</h1>
            <p className="lead mt-2">
              The A&amp;D Road &amp; Trail Crew represents people who build, drive, explore, create, and
              contribute to automotive culture. We welcome street cars, trail rigs, trucks, builders,
              photographers, families, and enthusiasts who believe the community should be driven by
              craftsmanship, respect, adventure, and real participation.
            </p>
            <p>This isn&apos;t a follower-count contest. It&apos;s a group of people helping keep automotive culture worth showing up for.</p>
          </div>
        </div>
      </section>

      <section className="section-alt section-pt-tight section-pb-tight">
        <div className="container">
          <div className="eyebrow">Who We&apos;re Looking For</div>
          <p className="mt-3" style={{ maxWidth: "60ch" }}>
            Engagement, credibility, content quality, and real participation in the culture matter more
            than follower count.
          </p>
          <div className="grid grid-3 mt-4">
            {WHO_WE_WANT.map((item) => (
              <div className="feature-item" key={item}>
                {CHECK_ICON}
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pt-tight section-pb-tight">
        <div className="container">
          <div className="eyebrow">How It Works</div>
          <h2 className="mt-2">Three Tiers, One Crew</h2>
          <p className="lead mt-2" style={{ maxWidth: "68ch" }}>
            Everyone starts as a Road &amp; Trail Member. Tiers move up based on consistency, content,
            and real contribution to the community — not automatically, and not overnight.
          </p>
          <div className="grid grid-3 mt-4">
            {TIERS.map((tier) => (
              <div className="card tier-card" key={tier.name}>
                <h3>{tier.name}</h3>
                <p className="tier-blurb">{tier.blurb}</p>
                <div className="exp-label">Benefits</div>
                <ul className="tier-list">
                  {tier.benefits.map((b) => (
                    <li key={b}>{CHECK_ICON}<span>{b}</span></li>
                  ))}
                </ul>
                <div className="exp-label">What&apos;s Expected</div>
                <ul className="tier-list">
                  {tier.expected.map((e) => (
                    <li key={e}>{CHECK_ICON}<span>{e}</span></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-alt section-pt-tight section-pb-tight">
        <div className="container">
          <div className="eyebrow">Content, Your Way</div>
          <p className="mt-3" style={{ maxWidth: "60ch" }}>
            Create in your own voice while reflecting what we&apos;re about. A few guardrails:
          </p>
          <div className="grid grid-2 mt-4">
            <div>
              <h3 style={{ fontSize: 16 }} className="accent-text">Encouraged</h3>
              <ul className="culture-list encouraged mt-3">
                {ENCOURAGED.map((item) => (
                  <li key={item}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 style={{ fontSize: 16 }}>Avoid</h3>
              <ul className="culture-list avoid mt-3">
                {AVOID.map((item) => (
                  <li key={item}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pt-tight section-pb-tight">
        <div className="container">
          <div className="card" style={{ padding: 28 }}>
            <div className="eyebrow">Conduct, Briefly</div>
            <p className="mt-3 mb-0">
              Crew members represent us publicly, so we ask for real judgment: no street takeovers,
              reckless driving on public roads, trail damage or trespassing, harassment, or unsafe
              behavior presented as something we endorse. Full standards are covered in the
              application, and we can suspend or remove anyone immediately over a serious safety or
              conduct issue.
            </p>
          </div>
        </div>
      </section>

      <section className="section-alt section-pt-tight section-pb-tight">
        <div className="container text-center">
          <div className="eyebrow" style={{ justifyContent: "center" }}>Ready To Join?</div>
          <h2 className="mt-2">Rep The Culture. Ride With Us.</h2>
          <p className="lead mt-2" style={{ maxWidth: "56ch", margin: "0 auto" }}>
            Tell us about yourself, your rig, and what you can bring to the crew.
          </p>
          <Link href="/ambassadors/apply" className="btn btn-primary mt-3">
            Apply To Join The Crew
          </Link>
        </div>
      </section>
    </>
  );
}
