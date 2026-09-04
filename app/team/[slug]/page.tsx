import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HOSTS, TRAIL_AMBASSADORS, findTeamMemberBySlug } from "@/lib/team";
import { findFeaturedAmbassadorBySlug } from "@/lib/ambassadors";
import { socialLinks } from "@/lib/social";
import { excerpt } from "@/lib/text";
import { SITE_URL } from "@/lib/site";

// One shared bio-page shape for all three "types" of crew member (Host,
// Trail Ambassador, Brand Ambassador) so the page below only has to render
// one template. Hosts/Trail Ambassadors are hardcoded (lib/team.ts, known at
// build time); Brand Ambassadors come from Airtable and aren't known until
// request time — same split as team builds vs. community builds.
type SocialKey = "instagram" | "facebook" | "x" | "tiktok" | "youtube";

interface Social {
  key: SocialKey;
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

// Hosts and Trail Ambassadors run the brand's own accounts, so their bio
// page shows the same brand social row every /builds/[slug] page already
// shows. Brand Ambassadors get their own personal handles instead (below),
// since showcasing an individual ambassador's own channel is the point.
const BRAND_SOCIALS: Social[] = [
  { key: "instagram", url: socialLinks.instagram, label: "Instagram" },
  { key: "facebook", url: socialLinks.facebook, label: "Facebook" },
  { key: "x", url: socialLinks.x, label: "X" },
];

const SOCIAL_ICONS: Record<SocialKey, ReactNode> = {
  instagram: <><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" /></>,
  facebook: <path d="M14 8.5h2.5V5H14c-2 0-3.5 1.5-3.5 3.5V11H8v3.5h2.5V21h3.5v-6.5h2.5l.5-3.5h-3V9c0-.5.3-.5.5-.5z" />,
  x: <path d="M4 4l16 16M20 4 4 20" />,
  tiktok: <><path d="M14.5 3v11.3a3.7 3.7 0 1 1-3.7-3.7c.35 0 .7.04 1 .13" /><path d="M14.5 3a5 5 0 0 0 5 5" /></>,
  youtube: <><rect x="2.5" y="6" width="19" height="12" rx="4" /><path d="M10.3 9.3v5.4l5-2.7z" fill="currentColor" stroke="none" /></>,
};

const DRIVES_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 16V11l2.2-4.4A2 2 0 0 1 8 5.5h8a2 2 0 0 1 1.8 1.1L20 11v5" />
    <path d="M4 16h16v3H4z" /><circle cx="8" cy="19" r="1.4" /><circle cx="16" cy="19" r="1.4" />
  </svg>
);

async function getProfile(slug: string): Promise<Profile | undefined> {
  const member = findTeamMemberBySlug(slug);
  if (member) {
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
      socials: BRAND_SOCIALS,
    };
  }

  const ambassador = await findFeaturedAmbassadorBySlug(slug);
  if (!ambassador) return undefined;

  const candidateSocials: (Social | undefined)[] = [
    ambassador.instagramUrl ? { key: "instagram", url: ambassador.instagramUrl, label: "Instagram" } : undefined,
    ambassador.tiktokUrl ? { key: "tiktok", url: ambassador.tiktokUrl, label: "TikTok" } : undefined,
    ambassador.youtubeUrl ? { key: "youtube", url: ambassador.youtubeUrl, label: "YouTube" } : undefined,
  ];
  const socials = candidateSocials.filter((s): s is Social => s !== undefined);

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
                <a key={s.key} href={s.url} target="_blank" rel="noopener" aria-label={s.label}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    {SOCIAL_ICONS[s.key]}
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
