import Link from "next/link";
import HeroCaptureForm from "@/components/HeroCaptureForm";
import PlatformGrid from "@/components/PlatformGrid";
import TestimonialGrid from "@/components/TestimonialGrid";
import { episodes } from "@/lib/episodes";
import { getFeaturedProducts } from "@/lib/fourthwall";
import { getApprovedTestimonials } from "@/lib/testimonials";

const latestEpisode = episodes[0];

export default async function HomePage() {
  const [products, testimonials] = await Promise.all([getFeaturedProducts(), getApprovedTestimonials()]);

  return (
    <>
      <section className="hero">
        <video className="hero-bg" poster="/img/podcast/hero.jpg" autoPlay muted loop playsInline>
          <source src="/video/intro.mp4" type="video/mp4" />
        </video>
        <div className="hero-scrim" />
        <div className="container hero-inner">
          <div className="hero-content">
            <h1>
              <span className="line">Where</span>
              <span className="line accent-text">Horsepower</span>
              <span className="line">Meets Mud</span>
            </h1>
            <p className="lead mt-2">
              Built street rides, off-road beasts
              <br />
              &amp; real talk about it all.
            </p>
            <HeroCaptureForm />
          </div>
        </div>
      </section>

      <div className="container">
        <div className="feature-strip">
          <div className="feature-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 13a9 9 0 0 1 18 0" /><rect x="3" y="13" width="4" height="7" rx="1.5" /><rect x="17" y="13" width="4" height="7" rx="1.5" />
            </svg>
            <span>Real Talk &amp;<br />Unfiltered Opinions</span>
          </div>
          <div className="feature-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8h3l2-2h6l2 2h3v11H4z" /><circle cx="12" cy="13.5" r="3.3" />
            </svg>
            <span>Event<br />Coverage</span>
          </div>
          <div className="feature-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 19 9 8l4 6.5L15 11l6 8z" />
            </svg>
            <span>Trail Rides &amp;<br />Adventure Stories</span>
          </div>
          <div className="feature-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="8" r="3" /><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" /><circle cx="18" cy="9" r="2.4" /><path d="M15.5 14.2c2.7.4 4.5 2.4 4.5 5.8" />
            </svg>
            <span>Community-Only<br />Giveaways &amp; Perks</span>
          </div>
          <div className="feature-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4l-2.6 2.6-2-2z" />
            </svg>
            <span>Gear Picks &amp;<br />How-To&apos;s</span>
          </div>
        </div>
      </div>

      <section className="section-pb-tight">
        <div className="container two-col">
          <div>
            <div className="section-head">
              <div className="eyebrow">The Latest Episode</div>
              <Link href="/podcast" className="view-all">
                View All Episodes
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>
            </div>
            <Link href={`/podcast/${latestEpisode.slug}`} className="card">
              <div className="card-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={latestEpisode.artwork.src} alt={latestEpisode.artwork.alt} />
              </div>
              <div className="card-body">
                <h3>{latestEpisode.title}</h3>
                <p>{latestEpisode.description}</p>
                <div className="card-actions">
                  <span className="btn btn-primary btn-sm">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg> Watch Now
                  </span>
                  <span className="btn btn-outline btn-sm">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13a9 9 0 0 1 18 0" /><rect x="3" y="13" width="4" height="7" rx="1.5" /><rect x="17" y="13" width="4" height="7" rx="1.5" /></svg> Listen
                  </span>
                </div>
              </div>
            </Link>
          </div>
          <div>
            <div className="eyebrow">Watch &amp; Listen</div>
            <p className="mt-3">
              Hear and watch Asphalt &amp; Dirt on Spotify, Apple Podcasts, Amazon Music, and YouTube. We go
              live on YouTube and other platforms. Follow us so you never miss a drop.
            </p>
            <div className="mt-3">
              <PlatformGrid />
            </div>
          </div>
        </div>
      </section>

      <section className="section-alt section-pt-tight section-pb-tight">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">What Our Community Says</div>
            <Link href="/community" className="view-all">
              Join The Movement
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></svg>
            </Link>
          </div>
          <TestimonialGrid testimonials={testimonials} />
        </div>
      </section>

      <section className="section-pt-tight">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">Rep The Culture</div>
            <Link href="/merch" className="view-all">
              Shop All Merch
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
          </div>
          {products.length ? (
            <div className="grid grid-5">
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
          ) : (
            <p className="mb-0">Merch drops coming soon &mdash; check back here or subscribe above so you don&apos;t miss the launch.</p>
          )}
        </div>
      </section>
    </>
  );
}
