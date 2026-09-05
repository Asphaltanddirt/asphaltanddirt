import type { Metadata } from "next";
import Link from "next/link";
import BuildsList from "@/components/BuildsList";
import { builds } from "@/lib/builds";
import { getApprovedCommunityBuilds } from "@/lib/communityBuilds";

export const metadata: Metadata = {
  title: "All Builds",
  description: "Every build in the Asphalt & Dirt garage — filter by category or search by name.",
};

export default async function AllBuildsPage() {
  // Team builds always come first — community submissions are appended
  // after, not mixed in ahead of them.
  const communityBuilds = await getApprovedCommunityBuilds();
  const allBuilds = [...builds, ...communityBuilds];

  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container">
        <Link href="/builds" className="back-link mb-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
          Back To Builds
        </Link>
        <h1 className="mt-4">All Builds</h1>
        <p className="lead mt-2">Every rig in the garage — filter by category or search by name.</p>
        <div className="mt-4">
          <BuildsList builds={allBuilds} />
        </div>
      </div>
    </section>
  );
}
