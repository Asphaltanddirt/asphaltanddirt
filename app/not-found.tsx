import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <section className="section-pt-tight section-pb-tight">
      <div
        className="container"
        style={{ textAlign: "center", maxWidth: 560, marginInline: "auto" }}
      >
        <div className="eyebrow accent">Error 404</div>
        <h1 className="mt-2">Took A Wrong Turn</h1>
        <p className="lead mt-2">
          This page doesn&apos;t exist &mdash; bad link, old URL, or it just isn&apos;t built yet.
          Air back up and get back on the trail.
        </p>
        <div
          className="card-actions mt-4"
          style={{ justifyContent: "center", flexWrap: "wrap" }}
        >
          <Link href="/" className="btn btn-primary btn-sm">Back Home</Link>
          <Link href="/podcast" className="btn btn-outline btn-sm">Podcast</Link>
          <Link href="/builds" className="btn btn-outline btn-sm">Builds</Link>
          <Link href="/blog" className="btn btn-outline btn-sm">Blog</Link>
          <Link href="/merch" className="btn btn-outline btn-sm">Merch</Link>
        </div>
      </div>
    </section>
  );
}
