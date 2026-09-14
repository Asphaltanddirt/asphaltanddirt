"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics";

/**
 * Social-link attribution without Vercel's paid UTM add-on: when a visitor
 * lands from a UTM-tagged link (bio links, posts), log one `utm_landing` event
 * with the tags as properties. The weekly analytics cron groups those events
 * by `utm` / `utm_source` (lib/analyticsSnapshot.ts). Once per browser session
 * per unique tag set, so refreshes and in-site clicks don't inflate counts.
 * Only the tag values are sent — nothing about the visitor.
 */
export default function UtmLanding() {
  const pathname = usePathname();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clean = (key: string) => (params.get(key) || "").trim().toLowerCase().slice(0, 60);
    const source = clean("utm_source");
    if (!source) return;
    const medium = clean("utm_medium");
    const campaign = clean("utm_campaign");

    const key = `ad-utm:${source}|${medium}|${campaign}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // Storage blocked — still count it once for this page load.
    }

    track("utm_landing", {
      utm: `${source} / ${medium || "(none)"}`,
      utm_source: source,
      utm_medium: medium || undefined,
      utm_campaign: campaign || undefined,
      landing_page: pathname,
    });
    // Only the first landing matters; later client-side navigations drop the query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
