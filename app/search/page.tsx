import type { Metadata } from "next";
import Link from "next/link";
import { searchSite, type SearchResultType } from "@/lib/search";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true }, // results pages aren't worth indexing individually
};

const TYPE_LABELS: Record<SearchResultType, string> = {
  Blog: "Blog Post",
  Podcast: "Podcast Episode",
  Build: "Build",
  Team: "Team",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query ? await searchSite(query) : [];

  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container" style={{ maxWidth: 900 }}>
        <h1>Search</h1>
        <form action="/search" method="get" className="mt-4" style={{ maxWidth: 480 }}>
          <div className="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search builds, episodes, blog posts, people…"
              autoFocus
            />
          </div>
        </form>

        {query && (
          <p className="mt-4 mb-0" style={{ color: "var(--text-dim)" }}>
            {results.length
              ? `${results.length} result${results.length === 1 ? "" : "s"} for "${query}"`
              : `No results for "${query}" — try a different word or spelling.`}
          </p>
        )}

        {results.length > 0 && (
          <div className="mt-4" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {results.map((r, i) => (
              <Link
                href={r.href}
                key={`${r.type}-${r.href}-${i}`}
                className="build-row"
                style={{ gridTemplateColumns: "120px 1fr" }}
              >
                <div className="build-thumb" style={{ aspectRatio: "1/1" }}>
                  {r.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image} alt={r.title} />
                  ) : null}
                </div>
                <div>
                  <div className="build-kicker">{TYPE_LABELS[r.type]}</div>
                  <h3 style={{ fontSize: 17 }}>{r.title}</h3>
                  <p className="mb-0" style={{ fontSize: 13.5 }}>{r.description}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
