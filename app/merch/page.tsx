import type { Metadata } from "next";
import Link from "next/link";
import { getProductsBySlugs, MERCH_COLLECTIONS, type Product } from "@/lib/fourthwall";

export const metadata: Metadata = {
  title: "Merch | Asphalt & Dirt",
  description: "Rep the lifestyle. Support the mission. Shop Asphalt & Dirt gear.",
};

// One icon per collection for the "Shop By Collection" tiles — same stroke
// style as every other icon on the site (viewBox 24x24, 1.6 stroke).
const COLLECTION_ICONS: Record<string, React.ReactNode> = {
  core: <path d="M3 19 9 8l4 6.5L15 11l6 8z" />,
  podcast: (
    <>
      <rect x="9" y="3" width="6" height="10" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /><path d="M8 21h8" />
    </>
  ),
  youth: (
    <>
      <path d="M3 14c0-4 4-7 9-7s9 3 9 7" /><path d="M3 14h18M12 7V4" /><rect x="9" y="14" width="6" height="3" rx="1" />
    </>
  ),
  "little-crawlers": (
    <>
      <path d="M5 11h11l-2-6H9L5 11Z" /><path d="M5 11v3a3 3 0 0 0 3 3h6" /><circle cx="9" cy="19" r="1.6" /><circle cx="16" cy="19" r="1.6" />
    </>
  ),
  "show-culture": (
    <>
      <path d="M8 4h8v4a4 4 0 0 1-8 0z" /><path d="M8 5H5a3 3 0 0 0 3 5M16 5h3a3 3 0 0 1-3 5" /><path d="M12 12v4" /><path d="M9 20h6" />
    </>
  ),
  accessories: (
    <>
      <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
};

// Hand-picked, not a live query — swap slugs here to change what's featured.
const FEATURED_SLUGS = [
  "protect-the-culture-heavyweight-tee",
  "split-terrain-heavyweight-tee",
  "little-crawlers-trail-tee",
  "earn-it-hoodie",
];

// Placeholder picks — rotate these out for whatever's actually newest.
const NEW_RELEASE_SLUGS = [
  "trailhead-trucker",
  "next-generation-hoodie",
  "open-road-podcast-hoodie",
  "earn-it-heavyweight-tee",
];

function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-4 mt-4">
      {products.map((p) => (
        <Link className="product-card" href={`/merch/${p.slug}`} key={p.id}>
          <div className="product-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image.url} alt={p.image.alt} />
          </div>
          <div className="product-info">
            <div>
              <div className="product-name">{p.name}</div>
              <div className="product-price">${p.price}</div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default async function MerchPage() {
  const [featured, newReleases] = await Promise.all([
    getProductsBySlugs(FEATURED_SLUGS),
    getProductsBySlugs(NEW_RELEASE_SLUGS),
  ]);

  return (
    <>
      <section className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/merch/hero.jpg"
          className="hero-bg"
          alt="Asphalt & Dirt hoodie, tee, trucker hat, beanie, and tumbler laid out on a truck bed in front of a Jeep"
        />
        <div className="hero-scrim" />
        <div className="container hero-inner">
          <div className="hero-content">
            <h1>
              <span className="line">Gear That</span>
              <span className="line accent-text">Drives Us</span>
            </h1>
            <p className="lead">
              Rep the lifestyle. Support the mission. Every purchase helps fuel the rides, the
              content, and the community.
            </p>
            <div className="feature-strip hero-feature-strip">
              <div className="feature-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m8 12.5 2.5 2.5L16 9.5" /></svg>
                <span><strong>Premium Quality</strong><br />Built to last on and off the trail.</span>
              </div>
              <div className="feature-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7h11v9H2z" /><path d="M13 10h4l3 3v3h-7z" /><circle cx="6" cy="18" r="1.6" /><circle cx="17.5" cy="18" r="1.6" /></svg>
                <span><strong>Fast Shipping</strong><br />Quick delivery right to your door.</span>
              </div>
              <div className="feature-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 4v4h-4" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 20v-4h4" /></svg>
                <span><strong>Easy Returns</strong><br />Hassle-free returns within 30 days.</span>
              </div>
            </div>
            <Link href="/merch/all" className="btn btn-primary mt-3">
              View Full Shop
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
          </div>
        </div>
      </section>

      <section className="section-pb-tight">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">Shop By Collection</div>
            <Link href="/merch/all" className="view-all">
              View Full Shop
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
          </div>
          <div className="grid grid-6 mt-4">
            {MERCH_COLLECTIONS.map((c) => (
              <Link className="chip tile" href={`/merch/all?collection=${c.slug}`} key={c.slug}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  {COLLECTION_ICONS[c.slug]}
                </svg>
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section-alt section-pt-tight section-pb-tight">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">Featured Items</div>
          </div>
          <ProductGrid products={featured} />
        </div>
      </section>

      <section className="section-pt-tight section-pb-tight">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">New Releases</div>
          </div>
          <ProductGrid products={newReleases} />
        </div>
      </section>

      <section className="section-alt section-pt-tight">
        <div className="container">
          <div className="feature-strip">
            <div className="feature-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 2.7 5.9 6.3.6-4.8 4.3 1.4 6.2L12 16.9 6.4 20l1.4-6.2L3 9.5l6.3-.6z" /></svg>
              <span><strong>Support The Community</strong><br />Every purchase helps bring you more content and events.</span>
            </div>
            <div className="feature-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4l-2.6 2.6-2-2z" /></svg>
              <span><strong>Built By Enthusiasts</strong><br />Designed for those who live the asphalt and dirt lifestyle.</span>
            </div>
            <div className="feature-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" /></svg>
              <span><strong>Worldwide Shipping</strong><br />We ship to off-roaders around the world.</span>
            </div>
            <div className="feature-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="1.5" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              <span><strong>Secure Checkout</strong><br />Safe, secure, and trusted checkout.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pb-tight">
        <div className="container" style={{ textAlign: "center" }}>
          <div className="eyebrow" style={{ justifyContent: "center" }}>Merch Contact</div>
          <p className="mb-0" style={{ maxWidth: 560, margin: "0 auto" }}>
            Order questions, shipping issues, or returns on something you bought? Our shop orders
            are handled directly by Fourthwall &mdash;{" "}
            <a
              href="https://asphalt-and-dirt-shop.fourthwall.com/contact/something-else"
              target="_blank"
              rel="noopener"
              style={{ color: "var(--accent)" }}
            >
              reach out to them here
            </a>{" "}
            for the fastest help. For anything else, <a href="mailto:team@asphaltanddirt.com" style={{ color: "var(--accent)" }}>contact us directly</a>.
          </p>
        </div>
      </section>
    </>
  );
}
