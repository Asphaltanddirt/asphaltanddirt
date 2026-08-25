import Link from "next/link";
import HeroCaptureForm from "@/components/HeroCaptureForm";
import { episodes } from "@/lib/episodes";

const latestEpisode = episodes[0];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/home/hero.jpg"
          className="hero-bg"
          alt="Street car and off-road Jeeps under a fiery sunset skyline"
        />
        <div className="hero-scrim" />
        <div className="container hero-inner">
          <div className="hero-content">
            <h1>
              <span className="line">Where</span>
              <span className="line accent-text">Horsepower</span>
              <span className="line">Meets Mud</span>
            </h1>
            <p className="lead">Built street rides, off-road beasts &amp; real talk about it all.</p>
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

      <section>
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
            <div className="platform-grid mt-3">
              <div className="platform">
                <div className="platform-left">
                  <div className="platform-icon" style={{ background: "#1DB954", color: "#fff" }}>
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                  Spotify
                </div>
              </div>
              <div className="platform">
                <div className="platform-left">
                  <div className="platform-icon" style={{ background: "#9b3fe0", color: "#fff" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13a9 9 0 0 1 18 0" /><rect x="3" y="13" width="4" height="7" rx="1.5" /><rect x="17" y="13" width="4" height="7" rx="1.5" /></svg>
                  </div>
                  Apple Podcasts
                </div>
              </div>
              <div className="platform">
                <div className="platform-left">
                  <div className="platform-icon" style={{ background: "#00A8E1", color: "#fff" }}>
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                  Amazon Music
                </div>
              </div>
              <div className="platform">
                <div className="platform-left">
                  <div className="platform-icon" style={{ background: "#FF0000", color: "#fff" }}>
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                  YouTube
                </div>
                <span className="badge-outline" style={{ color: "#ff4a1f" }}>Live</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-alt">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">What Our Community Says</div>
            <Link href="/community" className="view-all">
              Join The Movement
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></svg>
            </Link>
          </div>
          <div className="grid grid-3">
            <div className="testimonial">
              <span className="quote-mark">&ldquo;</span>
              <div className="stars">★★★★★</div>
              <p>
                The podcast is my weekly go-to. Real build talk, great guests, and zero fluff. Feels like
                hanging out in the garage with friends.
              </p>
              <div className="testimonial-foot">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="avatar" src="/img/home/avatar-community.jpg" alt="Mike R." />
                <div>
                  <div className="testimonial-name">Mike R.</div>
                  <div className="testimonial-role">Podcast Listener</div>
                </div>
              </div>
            </div>
            <div className="testimonial">
              <span className="quote-mark">&ldquo;</span>
              <div className="stars">★★★★★</div>
              <p>
                The events and community rides are next level. Good people, epic trails, and memories that
                last a lifetime.
              </p>
              <div className="testimonial-foot">
                <div className="avatar-initial">S</div>
                <div>
                  <div className="testimonial-name">Sarah T.</div>
                  <div className="testimonial-role">Event Attendee</div>
                </div>
              </div>
            </div>
            <div className="testimonial">
              <span className="quote-mark">&ldquo;</span>
              <div className="stars">★★★★★</div>
              <p>
                Asphalt &amp; Dirt nails the mix of street and off-road culture. Authentic, passionate, and
                always inspiring.
              </p>
              <div className="testimonial-foot">
                <div className="avatar-initial">C</div>
                <div>
                  <div className="testimonial-name">Chris M.</div>
                  <div className="testimonial-role">Community Member</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">Rep The Culture</div>
            <Link href="/merch" className="view-all">
              Shop All Merch
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
          </div>
          <div className="grid grid-5">
            {[
              { name: "A&D Hoodie", price: "$59.99", img: "/img/merch/hoodie.jpg", alt: "A&D Hoodie" },
              { name: "Trail Rated Tee", price: "$29.99", img: "/img/merch/classic-tee.jpg", alt: "Trail Rated Tee" },
              { name: "A&D Hat", price: "$29.99", img: "/img/merch/patch-hat.jpg", alt: "A&D Hat" },
              { name: "Overland Tee", price: "$29.99", img: "/img/home/overland-apparel.jpg", alt: "Overland Tee" },
              { name: "Logo Sticker Pack", price: "$9.99", img: "/img/merch/sticker-pack.jpg", alt: "Logo Sticker Pack" },
            ].map((p) => (
              <div className="product-card" key={p.name}>
                <div className="product-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt={p.alt} />
                </div>
                <div className="product-info">
                  <div>
                    <div className="product-name">{p.name}</div>
                    <div className="product-price">{p.price}</div>
                  </div>
                  <div className="cart-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" /><path d="M2 3h2l2.6 12.4A2 2 0 0 0 8.5 17h9a2 2 0 0 0 2-1.6L21 7H6" /></svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
