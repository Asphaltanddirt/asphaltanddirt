import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, getPublishedPosts } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return getPublishedPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  const url = `${SITE_URL}/blog/${post.slug}`;
  const title = post.seoTitle ?? post.title;
  const description = post.metaDescription ?? post.excerpt;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: [{ url: post.image.src, alt: post.image.alt }],
    },
  };
}

/** Parses **bold** markers into <strong> — the only inline markdown the
 *  blog body model supports right now. */
function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      part
    ),
  );
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const formattedDate = new Date(post.date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <section>
      <div className="container" style={{ maxWidth: 760 }}>
        <Link href="/blog" className="back-link mb-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
          Back To Blog
        </Link>

        <div className="tag-row mt-4">
          <span className="badge-outline">{post.category}</span>
          <span className="date">{formattedDate}</span>
        </div>
        <h1 className="mt-2" style={{ fontSize: "clamp(32px,5vw,48px)" }}>{post.title}</h1>
        <p className="lead mt-2">{post.excerpt}</p>

        <div className="build-thumb mt-4" style={{ aspectRatio: "16/9", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.image.src} alt={post.image.alt} />
        </div>

        <div className="mt-4">
          {post.body?.map((block, i) =>
            block.type === "heading" ? (
              <h2 key={i} className="mt-4" style={{ fontSize: 24 }}>{block.text}</h2>
            ) : (
              <p key={i}>{renderInline(block.text)}</p>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
