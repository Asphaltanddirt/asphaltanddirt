/**
 * The A&D Road & Trail Crew Brand Ambassador Agreement — the text shown on
 * /ambassadors/agreement and electronically accepted there.
 *
 * SINGLE SOURCE OF TRUTH for the agreement on the website. Keep this in sync
 * with the "Brand Ambassador Agreement" section of the Road & Trail Crew Docs
 * artifact. If the legal text changes there, update it here AND bump
 * AGREEMENT_VERSION so the acceptance log records which revision was signed.
 */

export const AGREEMENT_VERSION = "2026-09 (v1)";

export const AGREEMENT_INTRO =
  'This Brand Ambassador Agreement ("Agreement") is between Asphalt & Dirt ("A&D," "we," "us," or "our") and the individual accepted into the A&D Road & Trail Crew ("Ambassador," "you," or "your"). By accepting this Agreement, you agree to follow the program rules, compensation terms, conduct standards, and disclosure requirements described below.';

export type AgreementBlock = { type: "p"; text: string } | { type: "list"; heading?: string; items: string[] };
export type AgreementSection = { n: number; heading: string; blocks: AgreementBlock[] };

const p = (text: string): AgreementBlock => ({ type: "p", text });
const list = (heading: string | undefined, items: string[]): AgreementBlock => ({ type: "list", heading, items });

export const AGREEMENT_SECTIONS: AgreementSection[] = [
  {
    n: 1,
    heading: "Program Purpose",
    blocks: [
      p("The A&D Road & Trail Crew exists to support authentic automotive culture through real people, real builds, responsible participation, original content, community involvement, and meaningful brand representation. The program is not designed to operate as a generic influencer network or discount-code program."),
    ],
  },
  {
    n: 2,
    heading: "Ambassador Status",
    blocks: [
      p("Participation in the A&D Road & Trail Crew does not create an employer-employee relationship between you and Asphalt & Dirt. You participate as an independent ambassador. Nothing in this Agreement creates employment, partnership, joint venture, franchise relationship, agency authority, or authority to enter agreements on behalf of A&D. You are responsible for your own taxes, reporting obligations, insurance, equipment, transportation, and expenses unless A&D agrees otherwise in writing."),
    ],
  },
  {
    n: 3,
    heading: "Program Tier",
    blocks: [
      list("Tier 1 — Road & Trail Member", [
        "10% customer discount code",
        "10% commission on eligible tracked net merchandise sales",
        "Welcome merch package",
        "Ambassador badge and media kit",
        "Repost and feature opportunities",
        "Early product announcements",
        "Product-seeding eligibility",
      ]),
      list("Tier 2 — Featured Ambassador", [
        "10% customer discount code",
        "12% commission",
        "Periodic complimentary products",
        "Priority collaboration opportunities",
        "Potential podcast, build, or event features",
        "Early access to campaign briefs",
      ]),
      list("Tier 3 — Crew Partner", [
        "10% customer discount code",
        "15% commission",
        "Quarterly merchandise allowance",
        "Potential collaborative products or collections",
        "Priority podcast, build, and event opportunities",
        "Priority consideration for paid campaigns",
        "Limited local event activation support",
      ]),
      p("A&D may review, promote, downgrade, suspend, or otherwise adjust an Ambassador's tier based on participation, sales, content, conduct, communication, program performance, or other legitimate program factors. Crew Partner status is reviewed every six months. Tier status is not guaranteed permanently."),
    ],
  },
  {
    n: 4,
    heading: "Active Ambassador Status",
    blocks: [
      p("An Active Ambassador is an Ambassador who meets the minimum participation requirements for their assigned tier during a calendar month or has an approved exception or alternative contribution agreed upon with A&D. Alternative contributions may include event representation, photography, video production, podcast or guest referrals, build stories, technical expertise, community leadership, charitable or trail-cleanup participation, or other meaningful contributions approved by A&D."),
    ],
  },
  {
    n: 5,
    heading: "Minimum Participation Expectations",
    blocks: [
      list("Road & Trail Member", [
        "At least two relevant A&D mentions or pieces of content per month",
        "Use of the Ambassador code or tracking link where appropriate",
        "Constructive community participation",
        "At least one usable photo or short video submitted to A&D each month",
        "Compliance with all safety, conduct, and disclosure requirements",
      ]),
      list("Featured Ambassador", [
        "Two to four content pieces per month",
        "At least one original short-form video per month",
        "Timely participation in agreed campaigns",
        "Quarterly feedback on products, trends, and community activity",
      ]),
      list("Crew Partner", [
        "Consistent monthly content and community activity",
        "Professional communication",
        "Reliable campaign execution",
        "Strong responsible-conduct record",
        "Measurable contribution through sales, reach, content, events, referrals, partnerships, or other approved activities",
      ]),
    ],
  },
  {
    n: 6,
    heading: "Customer Discount Code",
    blocks: [
      p("A&D may provide you with a unique customer discount code or tracked referral link. Unless otherwise stated, the customer discount is 10% on eligible merchandise. Your code or link is intended for legitimate customer use — it may not be manipulated, used for fraudulent transactions, misrepresented as a larger discount, posted in misleading or deceptive ways, or distributed through spam, automated messaging, coupon abuse, or unauthorized paid advertising. A&D may suspend or deactivate a code or link at any time for suspected fraud, abuse, technical issues, or program violations."),
    ],
  },
  {
    n: 7,
    heading: "Commission",
    blocks: [
      p("Your commission rate is based on your current tier: Road & Trail Member 10%, Featured Ambassador 12%, Crew Partner 15%. Commission is calculated on eligible tracked net merchandise sales — the merchandise subtotal from eligible orders properly attributed to your Ambassador code or tracking link, after discounts and excluding taxes, shipping, refunds, returns, cancellations, chargebacks, fraudulent transactions, and ineligible transactions."),
    ],
  },
  {
    n: 8,
    heading: "Monthly Commission Reporting",
    blocks: [
      p("Commission reports reflect the eligible commission earned during each monthly reporting period. There is no minimum payout threshold and no “below threshold” status. A&D may correct reporting errors, duplicate transactions, fraudulent transactions, returns, refunds, chargebacks, or other attribution errors."),
    ],
  },
  {
    n: 9,
    heading: "Personal Purchases",
    blocks: [
      p("Personal purchases — items you buy for yourself through normal channels — do not generate ambassador commission. You may not attempt to generate commission on personal purchases by using your own referral link, using your customer discount code, ordering through another account, asking another person to place an order on your behalf for commission purposes, or using any other method designed to create self-referral commission. Abuse of this policy may result in withheld commission, code suspension, or removal from the program."),
    ],
  },
  {
    n: 10,
    heading: "Complimentary Products and Product Seeding",
    blocks: [
      p("New ambassadors typically receive a welcome merchandise package as part of onboarding. Beyond that, A&D may provide complimentary or discounted products at its discretion. Receiving a complimentary product does not guarantee future free product, paid work, permanent tier advancement, a positive review, or a required endorsement. Ambassadors are encouraged to provide honest feedback. If A&D provides a product and requests specific campaign participation, those terms may be provided separately in a campaign brief."),
    ],
  },
  {
    n: 11,
    heading: "Content Ownership",
    blocks: [
      p("You retain ownership of original content you create unless a separate written agreement states otherwise. By voluntarily submitting original photos, video, written material, or other content to A&D for use, you grant Asphalt & Dirt a non-exclusive, royalty-free license to use, reproduce, edit for formatting or length, publish, display, repost, distribute, and promote that submitted content in connection with A&D social media, websites, newsletters, podcast promotion, ambassador features, event promotion, community content, and marketing related to A&D. A&D will not claim ownership of your original content solely because you submitted it. You represent that you have the necessary rights or permission to submit any content you provide to A&D."),
    ],
  },
  {
    n: 12,
    heading: "Name, Image, and Ambassador Profile",
    blocks: [
      p("By participating in the program, you allow A&D to use your name, public social-media handle, approved profile photo, vehicle/build information, ambassador tier, approved biography, and submitted content for purposes of identifying and promoting your participation in the Road & Trail Crew. This permission continues during your active participation in the program. A&D may retain previously published editorial or historical program content after your participation ends, unless otherwise required by law or agreed in writing."),
    ],
  },
  {
    n: 13,
    heading: "Asphalt & Dirt Brand Assets",
    blocks: [
      p("A&D may provide logos, badges, graphics, colors, campaign artwork, and other brand assets. These assets remain the property of Asphalt & Dirt. You may use them only in connection with approved Road & Trail Crew activities. You may not alter the A&D logo in a misleading way, create unauthorized merchandise, sell A&D-branded products independently, register A&D trademarks/usernames/domains/business names, imply ownership of the A&D brand, or use A&D branding after removal from the program except for historical content. A&D may ask you to stop using specific brand assets at any time."),
    ],
  },
  {
    n: 14,
    heading: "Content Standards",
    blocks: [
      p("Ambassadors should create content in their own voice. A&D encourages content involving builds and modifications, garage work, legitimate motorsports, track days, responsible trail riding, overlanding, UTV/ATV/dirt-bike activity, car shows and meets, automotive photography, event coverage, product-in-use content, community service, technical knowledge, family participation, and real ownership experiences. A&D does not require identical captions or scripted corporate advertising."),
    ],
  },
  {
    n: 15,
    heading: "Promotional Balance",
    blocks: [
      p("Ambassadors are encouraged to follow the general 70/20/10 content approach: approximately 70% genuine automotive or lifestyle content, 20% community or A&D storytelling, 10% direct merchandise promotion. This is a guideline, not a strict mathematical requirement. A&D reserves the right to address content patterns that become excessively promotional, misleading, spam-like, or disconnected from the program's purpose."),
    ],
  },
  {
    n: 16,
    heading: "Disclosure Requirements",
    blocks: [
      p("Ambassadors must clearly disclose their relationship with A&D when promoting merchandise, sharing affiliate links, receiving complimentary products, or participating in compensated promotional activity. Appropriate disclosures may include “A&D Ambassador,” “Affiliate link — I may earn a commission,” “A&D provided this product,” or platform-provided partnership/affiliate disclosure tools. Disclosures must be clear, visible, and easy to understand — do not hide them among hashtags, links, or unrelated text. You are responsible for following applicable advertising, endorsement, affiliate, and platform disclosure rules."),
    ],
  },
  {
    n: 17,
    heading: "Safety and Conduct Standards",
    blocks: [
      p("Road & Trail Crew members represent A&D publicly. Ambassadors must not promote, glorify, organize, or participate in conduct presented as endorsed by A&D involving street takeovers, reckless public-road driving, illegal street racing, impaired driving, dangerous public-road stunts, destruction of public or private property, trail damage, trespassing, bypassing closures, harassment, discrimination, threats, hate speech, fraud, self-referral abuse, discount-code manipulation, or deliberately unsafe conduct. Motorsports and higher-risk automotive activities should occur at sanctioned tracks, controlled events, legal off-road areas, or other appropriate venues. A&D may immediately suspend or remove an Ambassador for serious conduct, safety, fraud, disclosure, or reputation concerns."),
    ],
  },
  {
    n: 18,
    heading: "Other Brand Relationships",
    blocks: [
      p("You may work with, represent, use, or promote other automotive brands unless the relationship directly conflicts with a specific A&D campaign, a separate campaign agreement states otherwise, the relationship creates confusion about your role with A&D, or you represent a competing brand in a way that falsely implies A&D approval. You must disclose existing automotive brand ambassador, affiliate, sponsor, or paid partnership relationships when requested by A&D."),
    ],
  },
  {
    n: 19,
    heading: "Paid Campaigns",
    blocks: [
      p("Participation in the Road & Trail Crew does not guarantee paid campaigns. A&D may offer certain Ambassadors paid campaign opportunities with separate terms covering deliverables, deadlines, compensation, usage rights, exclusivity, approval requirements, and required disclosures. You are not required to accept every paid campaign offered. Once you agree to participate, you are expected to complete the agreed deliverables professionally and on time."),
    ],
  },
  {
    n: 20,
    heading: "Events and Local Representation",
    blocks: [
      p("A&D may invite Ambassadors to attend or represent the brand at car shows, meets, trail rides, off-road events, motorsports events, charity events, community activities, or other approved gatherings. Unless otherwise agreed in writing, participation is voluntary and Ambassadors are responsible for their own transportation, lodging, admission, fuel, equipment, insurance, and related expenses. You must follow the rules of the venue, event organizer, property owner, trail system, sanctioning body, or governing authority."),
    ],
  },
  {
    n: 21,
    heading: "Confidential Information",
    blocks: [
      p("From time to time, A&D may provide non-public information regarding upcoming products, campaigns, merchandise, events, collaborations, business plans, or embargoed announcements. If information is identified as confidential, private, embargoed, or not yet public, you agree not to publish or share it until authorized. Public information and information you independently knew before receiving it from A&D are not considered confidential under this section."),
    ],
  },
  {
    n: 22,
    heading: "Fraud and Program Abuse",
    blocks: [
      p("Fake orders, self-referral schemes, coupon abuse, manipulated tracking, duplicate accounts, false traffic or engagement, chargeback manipulation, misleading advertising, unauthorized paid search/advertising using A&D branding, or attempts to exploit the commission system may result in immediate investigation, commission adjustment, suspension, or removal. A&D may withhold commission associated with transactions reasonably believed to be fraudulent, manipulated, or otherwise ineligible."),
    ],
  },
  {
    n: 23,
    heading: "Program Suspension or Removal",
    blocks: [
      p("A&D may suspend or end Ambassador participation for repeated inactivity, failure to meet tier expectations, conduct or safety violations, failure to disclose promotional relationships, fraud, abuse of discounts or commissions, misuse of A&D branding, harassment, reputational harm, repeated failure to communicate, campaign nonperformance, or other material violations of this Agreement. For ordinary inactivity or minor performance concerns, A&D may provide notice or an opportunity to correct the issue. Serious safety, conduct, fraud, harassment, or reputation issues may result in immediate removal."),
    ],
  },
  {
    n: 24,
    heading: "Ending Participation Voluntarily",
    blocks: [
      p("You may leave the Road & Trail Crew at any time by notifying A&D. When participation ends, your Ambassador code may be deactivated, your tracking link may stop earning commission, and future Ambassador benefits end. A&D brand assets should no longer be used to imply active Ambassador status. Eligible commission earned before deactivation remains subject to normal reporting and adjustment for refunds, cancellations, chargebacks, or ineligible transactions."),
    ],
  },
  {
    n: 25,
    heading: "Program Changes",
    blocks: [
      p("A&D may update commission rates, discounts, benefits, tier qualifications, campaign requirements, program policies, tracking methods, available products, or program structure. Material changes affecting compensation or Ambassador obligations should be communicated before they take effect whenever reasonably possible. Continued participation after an updated agreement or material policy change may require renewed acceptance."),
    ],
  },
  {
    n: 26,
    heading: "No Guaranteed Earnings",
    blocks: [
      p("A&D does not guarantee any specific amount of sales, commission, free merchandise, audience growth, exposure, paid work, sponsorship, event opportunities, or tier advancement. Results vary based on participation, audience behavior, content, market conditions, product availability, and other factors."),
    ],
  },
  {
    n: 27,
    heading: "No Guaranteed Promotion",
    blocks: [
      p("Participation does not guarantee reposts, website features, podcast appearances, product collaborations, paid campaigns, or event participation. These opportunities are selected at A&D's discretion based on fit, timing, quality, performance, and available opportunities."),
    ],
  },
  {
    n: 28,
    heading: "Limitation of Authority",
    blocks: [
      p("Ambassadors may not make promises, warranties, claims, refund commitments, sponsorship agreements, event commitments, pricing agreements, or legal representations on behalf of Asphalt & Dirt. Customer-service issues should be directed to the appropriate A&D or merchandise-store contact."),
    ],
  },
  {
    n: 29,
    heading: "Acceptance of Program Policies",
    blocks: [
      p("By accepting this Agreement, you confirm that you have reviewed and agree to follow this Brand Ambassador Agreement, the A&D Road & Trail Crew Onboarding Guide, A&D safety and conduct standards, A&D disclosure requirements, and any campaign-specific terms you voluntarily accept."),
    ],
  },
  {
    n: 30,
    heading: "Ambassador Information",
    blocks: [
      p("Your ambassador details — name, Road & Trail Crew tier, ambassador code, commission rate, primary social handle, and email — are on file with A&D. The email and legal name you enter below are recorded with your acceptance."),
    ],
  },
  {
    n: 31,
    heading: "Agreement Acceptance",
    blocks: [
      p("By signing or electronically accepting this Agreement, you acknowledge that you understand the program terms, how commission is calculated, that personal purchases do not earn commission, the safety and conduct requirements, the disclosure requirements, that participation does not create employment, and you agree to represent A&D responsibly."),
    ],
  },
];
