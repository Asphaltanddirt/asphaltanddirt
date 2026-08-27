import type { Metadata } from "next";
import EmailCaptureForm from "@/components/EmailCaptureForm";
import BlogList from "@/components/BlogList";
import { posts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog | Asphalt & Dirt",
  description: "Builds, adventures, gear, and the people who keep the culture moving.",
};

const LATEST_STORIES = posts.slice(0, 3);
const POPULAR_RIGHT_NOW = posts.slice(3, 6);

export default function BlogPage() {
  return (
    <>
      <section className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/blog/hero.jpg"
          className="hero-bg"
          alt="Split scene of a street car and a trail Jeep at night"
        />
        <div className="hero-scrim" />
        <div className="container hero-inner">
          <div className="hero-content">
            <div className="eyebrow accent">The Asphalt &amp; Dirt Blog</div>
            <h1 className="mt-2">
              <span className="line">Stories From</span>
              <span className="line accent-text">The Street</span>
              <span className="line">&amp; The Trail</span>
            </h1>
            <p className="lead">Builds, adventures, gear, and the people who keep the culture moving.</p>
            <div style={{ maxWidth: 420 }}>
              <EmailCaptureForm source="blog_hero" buttonText="Subscribe" />
            </div>
          </div>
        </div>
      </section>

      <BlogList posts={LATEST_STORIES}>
        <section className="section-pt-tight">
          <div className="container">
            <div className="eyebrow">Featured Story</div>
            <div className="promo-banner mt-3">
              <div className="promo-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/img/blog/featured-rhino-rock.jpg" alt="Rhino Rock Jeep on a rocky mountain trail" />
              </div>
              <div className="promo-copy">
                <span className="badge-outline" style={{ width: "fit-content" }}>Builds</span>
                <h2 style={{ fontSize: 28 }}>Rhino Rock: Built For The Long Way Home</h2>
                <p>Inside the choices, challenges, and trail-tested upgrades behind Jose&apos;s flagship build.</p>
                <a href="/builds/rhino-rock" className="btn btn-primary" style={{ width: "fit-content" }}>
                  Read Story
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </a>
              </div>
            </div>
          </div>
        </section>
      </BlogList>

      <section className="section-pt-tight">
        <div className="container">
          <div className="eyebrow">Popular Right Now</div>
          <div className="grid grid-3 mt-4">
            {POPULAR_RIGHT_NOW.map((post) => (
              <div className="card" key={post.slug}>
                <div className="card-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.image.src} alt={post.image.alt} />
                </div>
                <div className="card-body">
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                  <span className="date" style={{ fontSize: 12 }}>
                    {new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
