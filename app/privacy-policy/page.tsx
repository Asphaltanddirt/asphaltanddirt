import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Asphalt & Dirt collects, uses, and protects your information.",
};

export default function PrivacyPolicyPage() {
  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container legal-page">
        <h1>Privacy Policy</h1>
        <p className="updated">Last updated: August 2026</p>

        <p>
          This page explains what information Asphalt &amp; Dirt collects when you use this site or
          shop with us, and how it&apos;s used.
        </p>

        <h2>Information We Collect</h2>
        <p>When you browse the site, sign up for updates, or place an order, we may collect:</p>
        <ul>
          <li>Your name, email address, and shipping address</li>
          <li>Order details — what you bought, when, and for how much</li>
          <li>Basic device/browser information and how you use the site (via analytics)</li>
        </ul>
        <p>
          We don&apos;t collect or store your payment card details ourselves — checkout and payment
          are handled by Fourthwall and its payment processors, who have their own privacy and
          security practices.
        </p>

        <h2>How We Use It</h2>
        <ul>
          <li>To process and ship your order, and follow up if there&apos;s a problem with it</li>
          <li>To send the newsletter and community updates you&apos;ve opted into</li>
          <li>To understand how the site is used, so we can improve it</li>
        </ul>

        <h2>Who We Share It With</h2>
        <p>
          We share what&apos;s necessary with the services that make the site and shop work:
          Fourthwall (our commerce and fulfillment platform), Kit (our email newsletter provider),
          and standard web analytics tools. We don&apos;t sell your personal information to anyone.
        </p>

        <h2>Cookies</h2>
        <p>
          The site uses basic cookies and similar technology to remember preferences and understand
          traffic. You can control or block cookies through your browser settings; some parts of the
          site may not work as well if you do.
        </p>

        <h2>Your Choices</h2>
        <p>
          You can unsubscribe from emails at any time using the link at the bottom of any newsletter.
          To ask about, correct, or delete the personal information we hold on you, email{" "}
          <a href="mailto:team@asphaltanddirt.com">team@asphaltanddirt.com</a>.
        </p>

        <h2>Children</h2>
        <p>
          This site isn&apos;t directed at children under 13, and we don&apos;t knowingly collect
          personal information from them.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          We may update this policy occasionally. Meaningful changes will be reflected by updating
          the date at the top of this page.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this policy? Email{" "}
          <a href="mailto:team@asphaltanddirt.com">team@asphaltanddirt.com</a>.
        </p>

        <p style={{ color: "var(--text-dim)", fontSize: 13, marginTop: "var(--sp-4)" }}>
          This page is a general-purpose draft and isn&apos;t a substitute for advice from a
          lawyer familiar with your business and where your customers are located — have it
          reviewed before relying on it.
        </p>
      </div>
    </section>
  );
}
