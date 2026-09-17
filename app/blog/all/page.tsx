import type { Metadata } from "next";
import Link from "next/link";
import BlogArchive from "@/components/BlogArchive";
import { CATEGORY_SLUGS, getAllPostsSorted } from "@/lib/blog";

export const metadata: Metadata = {
  alternates: { canonical: "/blog/all" },
  title: "All Stories",
  description: "Every story from the Asphalt & Dirt blog — builds, adventures, gear, and the people who keep the culture moving.",
};

export default async function BlogArchivePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const posts = getAllPostsSorted();
  const { category } = await searchParams;
  const initialCategory = category ? CATEGORY_SLUGS[category.toLowerCase()] : undefined;

  return (
    <section>
      <div className="container">
        <Link href="/blog" className="back-link mb-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
          Back To Blog
        </Link>
        <h1 className="mt-4" style={{ fontSize: "clamp(32px,5vw,48px)" }}>All Stories</h1>
        <div className="mt-4">
          <BlogArchive posts={posts} initialCategory={initialCategory} />
        </div>
      </div>
    </section>
  );
}
