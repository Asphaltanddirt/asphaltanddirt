"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Build, BuildCategory } from "@/lib/builds";

const FILTERS: { key: "all" | BuildCategory; label: string; icon: React.ReactNode }[] = [
  {
    key: "all",
    label: "View All",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    key: "daily-driven",
    label: "Daily Driven",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 16V11l2.2-4.4A2 2 0 0 1 8 5.5h8a2 2 0 0 1 1.8 1.1L20 11v5" /><path d="M4 16h16v3H4z" /><circle cx="8" cy="19" r="1.4" /><circle cx="16" cy="19" r="1.4" />
      </svg>
    ),
  },
  {
    key: "trail-built",
    label: "Trail Built",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 19 9 8l4 6.5L15 11l6 8z" />
      </svg>
    ),
  },
  {
    key: "overland",
    label: "Overland",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 7h11v9H2z" /><path d="M13 10h4l3 3v3h-7z" /><circle cx="6" cy="18" r="1.6" /><circle cx="17.5" cy="18" r="1.6" />
      </svg>
    ),
  },
  {
    key: "performance",
    label: "Performance",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
      </svg>
    ),
  },
];

type SortOption = "newest" | "oldest" | "az";

export default function BuildsList({ builds }: { builds: Build[] }) {
  const [filter, setFilter] = useState<"all" | BuildCategory>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");

  const visibleBuilds = useMemo(() => {
    let list = builds.filter((b) => filter === "all" || b.category === filter);

    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter((b) =>
        [b.nameLines.join(" "), b.kicker, b.vehicle].join(" ").toLowerCase().includes(query)
      );
    }

    list = [...list];
    if (sort === "az") {
      list.sort((a, b) => a.nameLines.join(" ").localeCompare(b.nameLines.join(" ")));
    } else if (sort === "oldest") {
      list.reverse();
    }

    return list;
  }, [builds, filter, search, sort]);

  return (
    <>
      <div className="filter-row">
        <div className="chip-row">
          {FILTERS.map((f) => (
            <div
              key={f.key}
              className={`chip${filter === f.key ? " active" : ""}`}
              onClick={() => setFilter(f.key)}
              role="button"
              tabIndex={0}
            >
              {f.icon} {f.label}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div className="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input
              placeholder="Search builds..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value as SortOption)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="az">A–Z</option>
          </select>
        </div>
      </div>

      {visibleBuilds.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {visibleBuilds.map((build) => (
            <div className="build-row" key={build.slug}>
              <div className="build-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={build.listingImage.src} alt={build.listingImage.alt} />
              </div>
              <div>
                <div className="build-kicker">{build.kicker}</div>
                <h3>{build.nameLines.join(" ")}</h3>
                <div className="accent-text" style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                  {build.vehicle}
                </div>
                <p className="mb-0">{build.lead}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-end" }}>
                <div className="build-specs">
                  {build.listingSpecs.map((spec) => (
                    <div key={spec.label}>
                      <div className="label">{spec.label}</div>
                      <div className="value">{spec.value}</div>
                    </div>
                  ))}
                </div>
                <Link href={`/builds/${build.slug}`} className="btn btn-outline-accent btn-sm">
                  View Build
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-0">No builds match your search &mdash; try a different filter or term.</p>
      )}
    </>
  );
}
