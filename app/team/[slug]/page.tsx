import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HOSTS, TRAIL_AMBASSADORS, findTeamMemberBySlug } from "@/lib/team";
import { findFeaturedAmbassadorBySlug } from "@/lib/ambassadors";
import { socialLinks } from "@/lib/social";
import { SOCIAL_ICON_PATHS, normalizePlatform, type SocialPlatform } from "@/lib/socialIcons";
import { excerpt } from "@/lib/text";
import { SITE_URL } from "@/lib/site";

// One shared bio-page shape for all three "types" of crew member (Host,
// Trail Ambassador, Brand Ambassador) so the page below only has to render
// one template. Hosts/Trail Ambassadors are hardcoded (lib/team.ts, known at
// build time); Brand Ambassadors come from Airtable and aren't known until
// request time — same split as team builds vs. community builds.
type SocialKey = "instagram" | "facebook" | "x" | "tiktok" | "youtube";

interface Social {
  key: SocialPlatform;
  url: string;
  label: string;
}

interface Profile {
  slug: string;
  name: string;
  photo: string;
  roleLabel: string;
  tagline: string;
  bio: string;
  experience?: string;
  experienceLine2?: string;
  drives?: string;
  buildSlug?: string;
  socials: Social[];
}

// Hosts and Trail Ambassadors show their own personal links when lib/team.ts
// has them, falling back to this brand row until then. Brand Ambassadors'
// personal handles come from Airtable (below).
const BRAND_SOCIALS: Social[] = [
  { key: "instagram", url: socialLinks.instagram, label: "Instagram" },
  { key: "facebook", url: socialLinks.facebook, label: "Facebook" },
  { key: "x", url: socialLinks.x, label: "X" },
];

const DRIVES_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 16V11l2.2-4.4A2 2 0 0 1 8 5.5h8a2 2 0 0 1 1.8 1.1L20 11v5" />
    <path d="M4 16h16v3H4z" /><circle cx="8" cy="19" r="1.4" /><circle cx="16" cy="19" r="1.4" />
  </svg>
);

const SOCIAL_LABELS: Record<SocialKey, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  x: "X",
};

async function getProfile(slug: string): Promise<Profile | undefined> {
  const member = findTeamMemberBySlug(slug);
  if (member) {
    const personalSocials = (Object.keys(SOCIAL_LABELS) as SocialKey[])
      .filter((key) => member.socials?.[key])
      .map((key) => ({ key, url: member.socials![key]!, label: SOCIAL_LABELS[key] }));
    return {
      slug: member.slug,
      name: member.name,
      photo: member.photo,
      roleLabel: member.role,
      tagline: member.tagline,
      bio: member.bio,
      experience: member.experience,
      experienceLine2: member.experienceLine2,
      drives: member.drives,
      buildSlug: member.buildSlug,
      socials: personalSocials.length ? personalSocials : BRAND_SOCIALS,
    };
  }

  const ambassador = await findFeaturedAmbassadorBySlug(slug);
  if (!ambassador) return undefined;

  // Every link on their record that's a real web address, any platform.
  const socials: Social[] = ambassador.socials
    .filter((l) => /^https?:\/\//i.test(l.url))
    .map((l) => ({ key: normalizePlatform(l.platform), url: l.url, label: l.platform === "Other" ? "Link" : l.platform }));

  return {
    slug: ambassador.slug,
    name: ambassador.name,
    photo: ambassador.photo,
    roleLabel: ambassador.tier,
    tagline: ambassador.tagline,
    bio: ambassador.bio,
    drives: ambassador.vehicle,
    buildSlug: ambassador.buildSlug,
    socials,
  };
}

// Hosts/Trail Ambassadors are known at build time; a Brand Ambassador's slug
// isn't known until they're marked Featured in Airtable — Next renders those
// on first request and caches the result (dynamicParams defaults to true),
// same pattern as /builds/[slug] and community builds.
export function generateStaticParams() {
  return [...HOSTS, ...TRAIL_AMBASSADORS].map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProfile(slug);
  if (!profile) return {};

  const description = `${profile.roleLabel} — ${excerpt(profile.bio, 150)}`;
  const url = `${SITE_URL}/team/${profile.slug}`;
  return {
    title: profile.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: profile.name,
      description,
      url,
      type: "profile",
      images: [{ url: profile.photo, alt: `${profile.name} portrait` }],
    },
  };
}

export default async function TeamMemberPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await getProfile(slug);
  if (!profile) notFound();

  return (
    <section>
      <div className="container">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <Link href="/team" className="back-link mb-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
            Back To Team
          </Link>
          {profile.socials.length > 0 && (
            <div className="social-row">
              {profile.socials.map((s) => (
                <a key={s.url} href={s.url} target="_blank" rel="noopener" aria-label={s.label}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    {SOCIAL_ICON_PATHS[s.key]}
                  </svg>
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="two-col mt-4" style={{ alignItems: "center" }}>
          <div>
            <div className="team-role">{profile.roleLabel}</div>
            <h1 style={{ fontSize: "clamp(40px,6vw,72px)" }}>{profile.name}</h1>
            {profile.tagline && (
              <p className="team-tagline mt-2" style={{ fontSize: 16 }}>{profile.tagline}</p>
            )}
            <p className="mt-3">{profile.bio}</p>
            {profile.experience && (
              <>
                <div className="exp-label">Experience In The Culture</div>
                <div className="exp-box">
                  {profile.experience}
                  {profile.experienceLine2 && (
                    <>
                      <br />
                      {profile.experienceLine2}
                    </>
                  )}
                </div>
              </>
            )}
            {profile.drives && (
              <div className="drives-line">
                {DRIVES_ICON} Drives: {profile.drives}
              </div>
            )}
            {profile.buildSlug && (
              <Link href={`/builds/${profile.buildSlug}`} className="btn btn-outline btn-sm mt-3">
                View The Build
              </Link>
            )}
          </div>
          <div className="team-photo" style={{ maxWidth: 420, width: "100%", marginInline: "auto" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profile.photo} alt={`${profile.name} portrait`} />
          </div>
        </div>
      </div>
    </section>
  );
}
