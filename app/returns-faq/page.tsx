import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Returns & FAQ",
  description: "Shipping, returns, and answers to common questions about Asphalt & Dirt merch orders.",
};

const FAQS = [
  {
    q: "What is Asphalt & Dirt's quality guarantee?",
    a: "If your order arrives with a print error, a defect, or visible damage, we'll make it right with a replacement or a refund. Since every piece is made to order, we can't accept general returns or exchanges for sizing or personal preference — check the size guide on each product page before you order.",
  },
  {
    q: "Can I change or cancel my order after checkout?",
    a: "You can edit or cancel your order any time before it goes into production — use the link in your order confirmation email. Once production has started, changes usually aren't possible, but if something arrives wrong or damaged you have 30 days after delivery to reach out for a resolution.",
  },
  {
    q: "How do I report a damaged or defective item?",
    a: "Order fulfillment and support are handled directly by Fourthwall, our print & shipping partner. The fastest way to get this sorted is a clear photo of the issue — laid flat, in good light, with the tag visible — along with your order number, sent through the shop's contact form.",
  },
  {
    q: "How do refunds work?",
    a: "Refunds for approved quality issues are processed back to your original payment method. PayPal refunds typically show up within a day; card refunds can take 7 to 10 business days depending on your bank.",
  },
  {
    q: "What payment methods does the shop accept?",
    a: "The shop accepts major credit/debit cards, PayPal, Apple Pay, and Google Pay, plus buy-now-pay-later options like Klarna or Afterpay where available.",
  },
  {
    q: "Do international orders have extra fees?",
    a: "Orders shipped outside the U.S. may be subject to import duties, taxes, or customs fees set by the destination country — those are the responsibility of the customer, whether collected at checkout or on delivery.",
  },
];

export default function ReturnsFaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section className="section-pt-tight section-pb-tight">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container legal-page">
        <h1>Returns &amp; FAQ</h1>

        <p>
          Every item in the shop is printed to order specifically for you when you check out —
          nothing sits pre-made on a shelf. That keeps waste down, but it also means the return
          policy works a little differently than a normal retail store.
        </p>

        <h2>{FAQS[0].q}</h2>
        <p>{FAQS[0].a}</p>

        <h2>{FAQS[1].q}</h2>
        <p>{FAQS[1].a}</p>

        <h2>{FAQS[2].q}</h2>
        <p>
          Order fulfillment and support are handled directly by Fourthwall, our print &amp;
          shipping partner — they can act on this fastest. The fastest way to get this sorted is a
          clear photo of the issue — laid flat, in good light, with the tag visible — along with
          your order number, sent through{" "}
          <Link href="/contact">our contact page</Link>.
        </p>

        <h2>{FAQS[3].q}</h2>
        <p>{FAQS[3].a}</p>

        <h2>{FAQS[4].q}</h2>
        <p>{FAQS[4].a}</p>

        <h2>{FAQS[5].q}</h2>
        <p>{FAQS[5].a}</p>

        <h2>Still Have a Question?</h2>
        <p>
          For anything about an order, shipment, or return, use{" "}
          <Link href="/contact">our contact page</Link>{" "}
          — that goes straight to the team handling fulfillment. For anything else, email{" "}
          <a href="mailto:team@asphaltanddirt.com">team@asphaltanddirt.com</a>.
        </p>
      </div>
    </section>
  );
}
