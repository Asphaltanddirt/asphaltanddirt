import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Returns & FAQ | Asphalt & Dirt",
  description: "Shipping, returns, and answers to common questions about Asphalt & Dirt merch orders.",
};

export default function ReturnsFaqPage() {
  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container legal-page">
        <h1>Returns &amp; FAQ</h1>

        <p>
          Every item in the shop is printed to order specifically for you when you check out —
          nothing sits pre-made on a shelf. That keeps waste down, but it also means the return
          policy works a little differently than a normal retail store.
        </p>

        <h2>Quality Guarantee</h2>
        <p>
          If your order arrives with a print error, a defect, or visible damage, we&apos;ll make it
          right with a replacement or a refund. Since every piece is made to order, we can&apos;t
          accept general returns or exchanges for sizing or personal preference — check the size
          guide on each product page before you order.
        </p>

        <h2>Changing or Cancelling an Order</h2>
        <p>
          You can edit or cancel your order any time before it goes into production — use the link
          in your order confirmation email. Once production has started, changes usually
          aren&apos;t possible, but if something arrives wrong or damaged you have 30 days after
          delivery to reach out for a resolution.
        </p>

        <h2>Reporting a Damaged or Defective Item</h2>
        <p>
          Order fulfillment and support are handled directly by Fourthwall, our print &amp;
          shipping partner — they can act on this fastest. The fastest way to get this sorted is a
          clear photo of the issue — laid flat, in good light, with the tag visible — along with
          your order number, sent through{" "}
          <a href="https://asphalt-and-dirt-shop.fourthwall.com/contact/something-else" target="_blank" rel="noopener">
            our shop&apos;s contact form
          </a>
          .
        </p>

        <h2>Refunds</h2>
        <p>
          Refunds for approved quality issues are processed back to your original payment method.
          PayPal refunds typically show up within a day; card refunds can take 7&ndash;10 business
          days depending on your bank.
        </p>

        <h2>Payment Methods</h2>
        <p>
          The shop accepts major credit/debit cards, PayPal, Apple Pay, and Google Pay, plus
          buy-now-pay-later options like Klarna or Afterpay where available.
        </p>

        <h2>International Orders</h2>
        <p>
          Orders shipped outside the U.S. may be subject to import duties, taxes, or customs fees
          set by your country — those are the responsibility of the customer, whether collected at
          checkout or on delivery.
        </p>

        <h2>Still Have a Question?</h2>
        <p>
          For anything about an order, shipment, or return, use{" "}
          <a href="https://asphalt-and-dirt-shop.fourthwall.com/contact/something-else" target="_blank" rel="noopener">
            our shop&apos;s contact form
          </a>{" "}
          — that goes straight to the team handling fulfillment. For anything else, email{" "}
          <a href="mailto:team@asphaltanddirt.com">team@asphaltanddirt.com</a>.
        </p>
      </div>
    </section>
  );
}
