import Link from "next/link";

// Temporary stub — the full Home page migration from the static site is follow-up
// work, not part of today's scope (see plan: Next.js foundation + first episode page).
export default function HomePage() {
  return (
    <section className="hero">
      <div className="container hero-inner">
        <div className="hero-content">
          <h1>
            <span className="line">Where</span>
            <span className="line accent-text">Horsepower</span>
            <span className="line">Meets Mud</span>
          </h1>
          <p className="lead mt-2">
            Home page migration is in progress. In the meantime, check out the first live episode page:
          </p>
          <Link href="/podcast/asphalt-and-dirt-official-trailer" className="btn btn-primary mt-3">
            View The Trailer Episode
          </Link>
        </div>
      </div>
    </section>
  );
}
