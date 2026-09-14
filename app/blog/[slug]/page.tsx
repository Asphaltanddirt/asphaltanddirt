import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BlogCover from "@/components/BlogCover";
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

function renderBold(text: string, keyPrefix: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    ) : (
      part
    ),
  );
}

/** Parses the inline markdown the blog body model supports: **bold** and
 *  [link text](https://…). Source links open in a new tab and are underlined
 *  so they read as links, not just orange text. */
function renderInline(text: string) {
  return text.split(/(\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g).flatMap((part, i) => {
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (!link) return renderBold(part, String(i));
    return [
      <a
        key={i}
        href={link[2]}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: 3 }}
      >
        {link[1]}
      </a>,
    ];
  });
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

        <div className="build-thumb mt-4" style={{ aspectRatio: "16/10", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
          <BlogCover src={post.image.src} alt={post.image.alt} />
        </div>

        <div className="mt-4">
          {post.body?.map((block, i) =>
            block.type === "heading" ? (
              <h2 key={i} className="mt-4" style={{ fontSize: 24 }}>{block.text}</h2>
            ) : block.type === "subheading" ? (
              <h3 key={i} className="mt-3" style={{ fontSize: 19 }}>{block.text}</h3>
            ) : block.type === "table" ? (
              <div key={i} className="post-table-wrap mt-3">
                <table className="post-table">
                  {block.caption && <caption>{block.caption}</caption>}
                  <thead>
                    <tr>
                      {block.headers.map((h, j) => (
                        <th key={j} scope="col">{renderInline(h)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, c) =>
                          c === 0 ? (
                            <th key={c} scope="row">{renderInline(cell)}</th>
                          ) : (
                            <td key={c}>{renderInline(cell)}</td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p key={i}>{renderInline(block.text)}</p>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
