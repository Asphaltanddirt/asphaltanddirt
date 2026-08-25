"use client";

import { track } from "@/lib/analytics";
import type { Episode } from "@/lib/episodes";

const PLATFORMS: {
  key: keyof Pick<Episode, "spotifyUrl" | "appleUrl" | "amazonMusicUrl" | "youtubeMusicUrl">;
  label: string;
  color: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "spotifyUrl",
    label: "Spotify",
    color: "#1DB954",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
    ),
  },
  {
    key: "appleUrl",
    label: "Apple Podcasts",
    color: "#9b3fe0",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 13a9 9 0 0 1 18 0" /><rect x="3" y="13" width="4" height="7" rx="1.5" /><rect x="17" y="13" width="4" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    key: "amazonMusicUrl",
    label: "Amazon Music",
    color: "#00A8E1",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
    ),
  },
  {
    key: "youtubeMusicUrl",
    label: "YouTube Music",
    color: "#FF0000",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg>
    ),
  },
];

export default function PlatformLinks({ episode }: { episode: Episode }) {
  return (
    <div className="platform-grid">
      {PLATFORMS.map((p) => {
        const url = episode[p.key];
        const content = (
          <>
            <div className="platform-left">
              <div className="platform-icon" style={{ background: p.color, color: "#fff" }}>
                {p.icon}
              </div>
              {p.label}
            </div>
            <span className="badge-outline">{url ? "Listen" : "Coming Soon"}</span>
          </>
        );
        return url ? (
          <a
            key={p.key}
            href={url}
            target="_blank"
            rel="noopener"
            className="platform"
            onClick={() => track("platform_link_click", { platform: p.label, slug: episode.slug })}
          >
            {content}
          </a>
        ) : (
          <div key={p.key} className="platform" style={{ opacity: 0.5, cursor: "default" }} aria-disabled="true">
            {content}
          </div>
        );
      })}
    </div>
  );
}
