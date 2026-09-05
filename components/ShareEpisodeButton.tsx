"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

export default function ShareEpisodeButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    track("episode_share_click", { url });

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User backed out of the native share sheet — nothing to do.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (permissions/unsupported) — the URL is still
      // right there in the address bar, so fail silently.
    }
  }

  return (
    <button type="button" className="btn btn-outline btn-sm" onClick={handleShare}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" />
        <path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6" />
      </svg>
      {copied ? "Link Copied!" : "Share This Episode"}
    </button>
  );
}
