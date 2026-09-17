import type { Metadata } from "next";
import { LegalShortVersion } from "@/components/FormHelpers";

export const metadata: Metadata = {
  alternates: { canonical: "/privacy-policy" },
  title: "Privacy Policy",
  description: "How Asphalt & Dirt collects, uses, and protects your information.",
};

export default function PrivacyPolicyPage() {
  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container legal-page">
        <h1>Privacy Policy</h1>
        <p className="updated">Last updated: September 2026</p>

        <p>
          This page explains what information Asphalt &amp; Dirt collects when you use this site,
          shop with us, sign up for updates, or submit something to us — a review, a build, a
          Road &amp; Trail Crew application — and how that information is used.
        </p>

        <LegalShortVersion
          points={[
            "We collect what you give us (orders, email sign-ups, reviews, builds, applications) plus basic site analytics.",
            "Fourthwall and its payment processors handle checkout. We never see or store your card details.",
            "We don't sell your personal information.",
            "Unsubscribe from any email with the link at the bottom. Email team@asphaltanddirt.com to see, correct or delete what we hold.",
            "The site isn't meant for children under 16.",
          ]}
        />
        <nav className="legal-contents" aria-label="Policy sections">
          <p className="legal-contents-title">Contents</p>
          <ol>
            <li><a href="#information-we-collect">Information We Collect</a></li>
            <li><a href="#how-we-use-it">How We Use It</a></li>
            <li><a href="#who-we-share-it-with">Who We Share It With</a></li>
            <li><a href="#cookies">Cookies</a></li>
            <li><a href="#international-visitors">International Visitors</a></li>
            <li><a href="#your-choices-and-rights">Your Choices &amp; Rights</a></li>
            <li><a href="#children">Children</a></li>
            <li><a href="#changes-to-this-policy">Changes to This Policy</a></li>
            <li><a href="#third-party-fulfillment">Third-Party Fulfillment</a></li>
            <li><a href="#contact">Contact</a></li>
          </ol>
        </nav>

        <h2 id="information-we-collect">Information We Collect</h2>
        <p>Depending on how you interact with the site, we may collect:</p>
        <ul>
          <li>Your name, email address, and shipping address, when you place an order or sign up</li>
          <li>Order details — what you bought, when, and for how much</li>
          <li>
            What you submit through one of our forms — a testimonial or review, a community build
            submission (including photos), or a Road &amp; Trail Crew ambassador application
            (which also asks you to confirm your age and may include social/portfolio links)
          </li>
          <li>Basic device/browser information and how you use the site, via analytics</li>
        </ul>
        <p>
          We don&apos;t collect or store your payment card details ourselves — checkout and payment
          are handled by Fourthwall and its payment processors, who have their own privacy and
          security practices.
        </p>

        <h2 id="how-we-use-it">How We Use It</h2>
        <ul>
          <li>To process and ship your order, and follow up if there&apos;s a problem with it</li>
          <li>To send the newsletter and community updates you&apos;ve opted into</li>
          <li>
            To review and respond to submissions — deciding whether to feature a testimonial or
            community build, or to accept a Road &amp; Trail Crew application
          </li>
          <li>To understand how the site is used, so we can improve it</li>
        </ul>
        <p>
          A testimonial, build, or ambassador application isn&apos;t published automatically —
          everything is reviewed first, and we&apos;ll only show your name/content publicly if
          it&apos;s approved.
        </p>

        <h2 id="who-we-share-it-with">Who We Share It With</h2>
        <p>
          We share what&apos;s necessary with the services that make the site and shop work:
          Fourthwall (our commerce and fulfillment platform), Airtable (where newsletter
          subscriptions and submitted forms are stored), Resend (which delivers our email),
          and standard web analytics tools. We don&apos;t sell your personal information to anyone.
        </p>

        <h2 id="cookies">Cookies</h2>
        <p>
          The site uses basic cookies and similar technology to remember preferences and understand
          traffic. You can control or block cookies through your browser settings; some parts of the
          site may not work as well if you do.
        </p>

        <h2 id="international-visitors">International Visitors</h2>
        <p>
          Asphalt &amp; Dirt is based in the United States and ships worldwide. If you&apos;re
          visiting or ordering from outside the U.S., your information will be processed and stored
          in the United States, where privacy laws may differ from those where you live. By using
          the site, you understand your information will be transferred here.
        </p>

        <h2 id="your-choices-and-rights">Your Choices &amp; Rights</h2>
        <p>
          You can unsubscribe from emails at any time using the link at the bottom of any
          newsletter. Wherever you are, you can ask us to access, correct, or delete the personal
          information we hold on you — including a submission you&apos;d like taken down — by
          emailing <a href="mailto:team@asphaltanddirt.com">team@asphaltanddirt.com</a>. We don&apos;t
          sell or share personal information for money or for cross-context advertising, so there&apos;s
          no opt-out needed for that.
        </p>

        <h2 id="children">Children</h2>
        <p>
          This site isn&apos;t directed at children, and we don&apos;t knowingly collect personal
          information from anyone under 16. Our youth apparel is intended to be purchased by a
          parent or guardian, not ordered by a child directly.
        </p>

        <h2 id="changes-to-this-policy">Changes to This Policy</h2>
        <p>
          We may update this policy occasionally. Meaningful changes will be reflected by updating
          the date at the top of this page.
        </p>

        <h2 id="third-party-fulfillment">Third-Party Fulfillment</h2>
        <p>
          When you place an order, your shipping and payment information is handled by Fourthwall,
          our print-on-demand and fulfillment partner — a separate company from Asphalt &amp; Dirt
          with its own privacy practices for that part of the transaction.
        </p>

        <h2 id="contact">Contact</h2>
        <p>
          Questions about this policy? Email{" "}
          <a href="mailto:team@asphaltanddirt.com">team@asphaltanddirt.com</a>.
        </p>
      </div>
    </section>
  );
}
