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
        <p className="updated">Last updated: September 2026</p>

        <p>
          These terms cover your use of the Asphalt &amp; Dirt website and shop. By browsing the
          site, placing an order, or submitting something to us, you&apos;re agreeing to them. If
          something here doesn&apos;t sit right with you, please don&apos;t use the site.
        </p>

        <h2>Who Can Use This Site</h2>
        <p>
          You need to be at least 13 years old to use the site or place an order. If you&apos;re
          ordering on behalf of a business, you&apos;re confirming you have the authority to agree
          to these terms for it. The Road &amp; Trail Crew ambassador program has its own
          eligibility requirements and a separate agreement, covered when you apply.
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
          partner, delivery timing is largely in the hands of the carrier. We ship to most
          countries, though a handful are excluded due to carrier restrictions or sanctions — if a
          country doesn&apos;t appear at checkout, we&apos;re not able to ship there. For many
          international orders, applicable VAT is already included and collected at checkout; for
          others, the carrier or your local customs authority may charge duties or taxes directly
          to you on delivery. We don&apos;t set those charges and can&apos;t predict them in
          advance.
        </p>

        <h2>Product Quality</h2>
        <p>
          Merch is printed to order by Fourthwall, our production partner, rather than pulled from
          pre-made stock. Because of that, minor variation in color, placement, or fabric between
          individual items is normal and isn&apos;t considered a defect. We stand behind genuine
          print errors or damage — see <a href="/returns-faq">Returns &amp; FAQ</a>.
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

        <h2>Content You Submit To Us</h2>
        <p>
          When you submit a testimonial, a community build, or content as part of the Road &amp;
          Trail Crew ambassador program, you confirm it&apos;s yours to share and give us
          permission to publish, edit for length or clarity, and feature it on the site or our
          social channels, with credit to you unless you ask otherwise. You can ask us to take
          down something you submitted at any time by emailing{" "}
          <a href="mailto:team@asphaltanddirt.com">team@asphaltanddirt.com</a> — we&apos;ll remove
          it from the site going forward, though we can&apos;t recall copies already shared or
          cached elsewhere.
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
      </div>
    </section>
  );
}
