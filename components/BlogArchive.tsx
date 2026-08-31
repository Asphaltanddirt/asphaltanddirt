"use client";

import { useMemo, useState } from "react";
import type { BlogCategory, BlogPost } from "@/lib/blog";

const CATEGORIES: { key: "All" | BlogCategory; icon: React.ReactNode }[] = [
  {
    key: "All",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    key: "Builds",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4l-2.6 2.6-2-2z" />
      </svg>
    ),
  },
  {
    key: "Trail & Travel",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 19 9 8l4 6.5L15 11l6 8z" />
      </svg>
    ),
  },
  {
    key: "Gear",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M9 15l3-7 3 7M10 13h4" />
      </svg>
    ),
  },
  {
    key: "Events",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" />
      </svg>
    ),
  },
  {
    key: "Culture",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3" /><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" /><circle cx="18" cy="9" r="2.4" /><path d="M15.5 14.2c2.7.4 4.5 2.4 4.5 5.8" />
      </svg>
    ),
  },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default function BlogArchive({ posts }: { posts: BlogPost[] }) {
  const [filter, setFilter] = useState<"All" | BlogCategory>("All");

  const visiblePosts = useMemo(
    () => posts.filter((p) => filter === "All" || p.category === filter),
    [posts, filter]
  );

  return (
    <>
      <div className="chip-row" style={{ borderBottom: "1px solid var(--border-soft)", paddingBottom: "var(--sp-3)" }}>
        {CATEGORIES.map((c) => (
          <div
            key={c.key}
            className={`chip${filter === c.key ? " active" : ""}`}
            onClick={() => setFilter(c.key)}
            role="button"
            tabIndex={0}
          >
            {c.icon} {c.key === "All" ? "All Stories" : c.key}
          </div>
        ))}
      </div>

      <div className="mt-4">
        {visiblePosts.length ? (
          <div className="grid grid-3">
            {visiblePosts.map((post) => (
              <div className="card" key={post.slug}>
                <div className="card-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.image.src} alt={post.image.alt} />
                </div>
                <div className="card-body">
                  <div className="tag-row">
                    <span className="badge-outline">{post.category}</span>
                    <span className="date">{formatDate(post.date)}</span>
                  </div>
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                  {post.body && (
                    <a href={`/blog/${post.slug}`} className="view-all" style={{ fontSize: 12 }}>
                      Read More
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-0">No stories in this category yet &mdash; check back soon.</p>
        )}
      </div>
    </>
  );
}
