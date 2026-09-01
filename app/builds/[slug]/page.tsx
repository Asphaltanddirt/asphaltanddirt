import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { builds, findBuildBySlug, findAdjacentBuilds, BUILD_ICONS } from "@/lib/builds";
import { getApprovedCommunityBuilds } from "@/lib/communityBuilds";
import { socialLinks } from "@/lib/social";
import BuildGallery from "@/components/BuildGallery";
import { SITE_URL } from "@/lib/site";

// Only the 4 team builds are known at build time — a community build's slug
// isn't known until someone submits and it's approved. Next renders those
// on first request and caches the result (dynamicParams defaults to true),
// so this stays fast without an Airtable-dependent build step.
export function generateStaticParams() {
  return builds.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const communityBuilds = await getApprovedCommunityBuilds();
  const build = findBuildBySlug([...builds, ...communityBuilds], slug);
  if (!build) return {};

  const name = build.nameLines.join(" ");
  const description = `${build.vehicle} — full spec sheet, photo gallery, and build story.`;
  const url = `${SITE_URL}/builds/${build.slug}`;
  return {
    title: `${name} Build`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${name} Build`,
      description,
      url,
      type: "article",
      images: [{ url: `${SITE_URL}${build.heroImage.src}`, alt: build.heroImage.alt }],
    },
  };
}

export default async function BuildDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const communityBuilds = await getApprovedCommunityBuilds();
  const allBuilds = [...builds, ...communityBuilds];
  const build = findBuildBySlug(allBuilds, slug);
  if (!build) notFound();

  const { prev, next } = findAdjacentBuilds(allBuilds, slug);
  const useTwoColSpecs = build.specs.length > 6;
  const specColumns = useTwoColSpecs
    ? [build.specs.slice(0, Math.ceil(build.specs.length / 2)), build.specs.slice(Math.ceil(build.specs.length / 2))]
    : [build.specs];

  return (
    <>
      <section>
        <div className="container">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <Link href="/builds" className="back-link mb-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
              Back To Builds
            </Link>
            <div className="social-row">
              <a href={socialLinks.instagram} target="_blank" rel="noopener" aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" /></svg>
              </a>
              <a href={socialLinks.facebook} target="_blank" rel="noopener" aria-label="Facebook">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 8.5h2.5V5H14c-2 0-3.5 1.5-3.5 3.5V11H8v3.5h2.5V21h3.5v-6.5h2.5l.5-3.5h-3V9c0-.5.3-.5.5-.5z" /></svg>
              </a>
              <a href={socialLinks.x} target="_blank" rel="noopener" aria-label="X">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l16 16M20 4 4 20" /></svg>
              </a>
            </div>
          </div>
          <div className="two-col mt-4" style={{ alignItems: "center" }}>
            <div>
              {build.badge && <div className="badge-outline mb-0">{build.badge}</div>}
              <h1 className={build.badge ? "mt-2" : undefined} style={{ fontSize: "clamp(48px,7vw,84px)" }}>
                {build.nameLines.map((line) => (
                  <span className="line" key={line}>{line}</span>
                ))}
              </h1>
              <div className="accent-text mt-2" style={{ fontWeight: 800, letterSpacing: ".03em" }}>{build.vehicle}</div>
              <p className="lead mt-2">{build.lead}</p>
              <div className="stat-row mt-3">
                {build.stats.map((stat) => (
                  <div className="stat-item" key={stat.unit}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{BUILD_ICONS[stat.icon]}</svg>
                    <div>
                      <div className="num">{stat.value}</div>
                      <div className="unit">{stat.unit}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="build-thumb" style={{ aspectRatio: "4/3", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={build.heroImage.src} alt={build.heroImage.alt} />
            </div>
          </div>
        </div>
      </section>

      {build.gallery && (
        <section className="section-alt">
          <div className="container">
            <BuildGallery images={build.gallery} />
          </div>
        </section>
      )}

      <section className={build.gallery ? undefined : "section-alt"}>
        <div className="container two-col">
          <div>
            <div className="eyebrow">Build Specs</div>
            {useTwoColSpecs ? (
              <div className="grid grid-2 mt-3">
                {specColumns.map((column, i) => (
                  <div className="spec-list" key={i}>
                    {column.map((spec) => (
                      <div className="spec-row" key={spec.label}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{BUILD_ICONS[spec.icon]}</svg>
                        <div>
                          <div className="spec-label">{spec.label}</div>
                          <div className="spec-value">{spec.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="spec-list mt-3">
                {build.specs.map((spec) => (
                  <div className="spec-row" key={spec.label}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{BUILD_ICONS[spec.icon]}</svg>
                    <div>
                      <div className="spec-label">{spec.label}</div>
                      <div className="spec-value">{spec.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="eyebrow">About This Build</div>
            <p className="mt-3">{build.aboutText}</p>
            {build.aboutStats.length > 0 && (
              <div className="about-stats">
                {build.aboutStats.map((stat) => (
                  <div className="about-stat" key={stat.label}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{BUILD_ICONS[stat.icon]}</svg>
                    <div className="label">{stat.label}</div>
                    <div className="value">{stat.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section-alt">
        <div className="container">
          <div className="prevnext">
            <Link href={`/builds/${prev.slug}`} className="prevnext-item">
              <div className="prevnext-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={prev.listingImage.src} alt={`${prev.nameLines.join(" ")} build`} />
              </div>
              <div>
                <div className="prevnext-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
                  Previous Build
                </div>
                <div style={{ fontWeight: 700 }}>{prev.nameLines.join(" ")}</div>
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{prev.vehicle}</div>
              </div>
            </Link>
            <Link href="/builds" style={{ textAlign: "center" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", marginTop: 6 }}>View All Builds</div>
            </Link>
            <Link href={`/builds/${next.slug}`} className="prevnext-item next">
              <div className="prevnext-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={next.listingImage.src} alt={`${next.nameLines.join(" ")} build`} />
              </div>
              <div>
                <div className="prevnext-label">
                  Next Build
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
                </div>
                <div style={{ fontWeight: 700 }}>{next.nameLines.join(" ")}</div>
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{next.vehicle}</div>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
