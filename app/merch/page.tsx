import type { Metadata } from "next";
import HeroCaptureForm from "@/components/HeroCaptureForm";
import { getMerchCollections } from "@/lib/fourthwall";

export const metadata: Metadata = {
  title: "Merch | Asphalt & Dirt",
  description: "Rep the lifestyle. Support the mission. Shop Asphalt & Dirt gear.",
};

const GRID_CLASS_FOR_COUNT: Record<number, string> = {
  2: "grid-2",
  3: "grid-3",
  4: "grid-4",
  5: "grid-5",
  6: "grid-6",
};

export default async function MerchPage() {
  const collections = await getMerchCollections();
  const totalProducts = collections.reduce((n, c) => n + c.products.length, 0);

  return (
    <>
      <section className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/merch/hero.jpg"
          className="hero-bg"
          alt="Asphalt & Dirt hoodie, tee, and cap laid out on rocks"
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
            <HeroCaptureForm />
          </div>
        </div>
      </section>

      <div className="container">
        <div className="feature-strip">
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
      </div>

      {collections.length > 0 && (
        <section className="section-pb-tight">
          <div className="container">
            <div className="section-head">
              <div className="eyebrow">Shop By Collection</div>
              <a href="https://asphalt-and-dirt-shop.fourthwall.com" target="_blank" rel="noopener" className="view-all">
                View Full Shop
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </a>
            </div>
            <div className={`grid ${GRID_CLASS_FOR_COUNT[collections.length] ?? "grid-5"} mt-4`}>
              {collections.map((c) => (
                <a className="chip tile" href={`#${c.slug}`} key={c.slug}>
                  {c.name}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {collections.length ? (
        collections.map((c, i) => (
          <section
            key={c.slug}
            id={c.slug}
            className={`section-pt-tight section-pb-tight ${i % 2 === 1 ? "section-alt" : ""}`}
          >
            <div className="container">
              <div className="section-head">
                <div>
                  <div className="eyebrow">{c.name}</div>
                  <p className="mb-0">{c.tagline}</p>
                </div>
              </div>
              <div className={`grid ${GRID_CLASS_FOR_COUNT[c.products.length] ?? "grid-6"} mt-4`}>
                {c.products.map((p) => (
                  <a className="product-card" key={p.id} href={p.checkoutUrl} target="_blank" rel="noopener">
                    <div className="product-media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.image.url} alt={p.image.alt} />
                    </div>
                    <div className="product-info">
                      <div>
                        <div className="product-name">{p.name}</div>
                        <div className="product-price">${p.price}</div>
                      </div>
                      <div className="cart-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" /><path d="M2 3h2l2.6 12.4A2 2 0 0 0 8.5 17h9a2 2 0 0 0 2-1.6L21 7H6" /></svg>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>
        ))
      ) : (
        <section className="section-pb-tight">
          <div className="container">
            <p className="mb-0">New merch drops coming soon &mdash; check back here or subscribe above so you don&apos;t miss the launch.</p>
          </div>
        </section>
      )}

      {totalProducts > 0 && (
        <section className="section-pt-tight">
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
      )}
    </>
  );
}
