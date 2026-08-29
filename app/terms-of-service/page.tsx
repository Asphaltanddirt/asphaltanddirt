import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern use of the Asphalt & Dirt website and shop.",
};

export default function TermsOfServicePage() {
  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container legal-page">
        <h1>Terms of Service</h1>
        <p className="updated">Last updated: August 2026</p>

        <p>
          These terms cover your use of the Asphalt &amp; Dirt website and shop. By browsing the
          site or placing an order, you&apos;re agreeing to them. If something here doesn&apos;t
          sit right with you, please don&apos;t use the site.
        </p>

        <h2>Who Can Use This Site</h2>
        <p>
          You need to be at least 13 years old to use the site or place an order. If you&apos;re
          ordering on behalf of a business, you&apos;re confirming you have the authority to agree
          to these terms for it.
        </p>

        <h2>Orders &amp; Payment</h2>
        <p>
          All prices are listed in U.S. dollars and may change without notice, though we&apos;ll
          never change the price of something you&apos;ve already paid for. Placing an order
          authorizes us (and our payment processor) to charge your chosen payment method for the
          full order total, including any applicable tax.
        </p>

        <h2>Shipping</h2>
        <p>
          Orders ship to the address you provide at checkout. Shipping costs and estimated delivery
          windows are shown before you complete your order. Once a package leaves our fulfillment
          partner, delivery timing is largely in the hands of the carrier.
        </p>

        <h2>Returns &amp; Refunds</h2>
        <p>
          Because merch is printed to order, we don&apos;t accept general returns or exchanges —
          see the <a href="/returns-faq">Returns &amp; FAQ</a> page for how defective or damaged
          items are handled.
        </p>

        <h2>Ownership &amp; Content</h2>
        <p>
          Everything on this site — logos, artwork, photos, video, and writing — belongs to
          Asphalt &amp; Dirt or its licensors. You&apos;re welcome to share links to it, but
          reproducing, redistributing, or selling any of it without our written permission
          isn&apos;t allowed.
        </p>

        <h2>Acceptable Use</h2>
        <p>You agree not to use the site to:</p>
        <ul>
          <li>Break any applicable law</li>
          <li>Interfere with the site&apos;s security, availability, or normal operation</li>
          <li>Impersonate someone else or misrepresent your affiliation with us</li>
          <li>Collect other users&apos; personal information without consent</li>
        </ul>

        <h2>No Warranties</h2>
        <p>
          The site and everything on it are provided &ldquo;as is.&rdquo; We work to keep
          everything accurate and running smoothly, but we can&apos;t guarantee the site will
          always be available, error-free, or uninterrupted.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          To the extent allowed by law, Asphalt &amp; Dirt isn&apos;t liable for indirect,
          incidental, or consequential damages arising from your use of the site or any product
          purchased through it, beyond the amount you actually paid for that product.
        </p>

        <h2>Changes to These Terms</h2>
        <p>
          We may update these terms from time to time. Continuing to use the site after a change
          means you accept the updated terms.
        </p>

        <h2>Governing Law</h2>
        <p>
          These terms are governed by the laws of the United States, without regard to conflict of
          law principles.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms? Email{" "}
          <a href="mailto:team@asphaltanddirt.com">team@asphaltanddirt.com</a>.
        </p>

        <p style={{ color: "var(--text-dim)", fontSize: 13, marginTop: "var(--sp-4)" }}>
          This page is a general-purpose draft and isn&apos;t a substitute for advice from a
          lawyer familiar with your business — have it reviewed before relying on it.
        </p>
      </div>
    </section>
  );
}
