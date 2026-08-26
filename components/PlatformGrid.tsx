"use client";

import { track } from "@/lib/analytics";

type Platform = {
  name: string;
  color: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  url?: string;
};

const WATCH_PLATFORMS: Platform[] = [
  {
    name: "YouTube",
    color: "#FF0000",
    badge: "Live & Video",
    badgeColor: "#ff4a1f",
    url: "https://www.youtube.com/@Asphaltanddirtpodcast",
    icon: <path d="M8 5v14l11-7z" fill="currentColor" />,
  },
  {
    name: "Spotify",
    color: "#1DB954",
    badge: "Video",
    url: "https://open.spotify.com/show/1OJaB7uFY09JChAwTNpoko?si=902839da51f04b52",
    icon: (
      <>
        <rect x="4" y="10" width="3" height="7" fill="currentColor" />
        <rect x="10.5" y="6" width="3" height="11" fill="currentColor" />
        <rect x="17" y="3" width="3" height="14" fill="currentColor" />
      </>
    ),
  },
  {
    name: "Apple Podcasts",
    color: "#9b3fe0",
    badge: "Video",
    url: "https://podcasts.apple.com/us/podcast/asphalt-dirt-podcast/id6805523570",
    icon: <path d="M3 13a9 9 0 0 1 18 0M3 13v7a1.5 1.5 0 0 0 1.5 1.5h1A1.5 1.5 0 0 0 7 20v-6a1.5 1.5 0 0 0-1.5-1.5h-1A1.5 1.5 0 0 0 3 14zM21 13v7a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5v-6a1.5 1.5 0 0 1 1.5-1.5h1A1.5 1.5 0 0 1 21 14z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />,
  },
];

const LISTEN_PLATFORMS: Platform[] = [
  {
    name: "Amazon Music",
    color: "#00A8E1",
    icon: (
      <>
        <path d="M9 18V5l10-2v13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="6.5" cy="18" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="16.5" cy="16" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </>
    ),
  },
  {
    name: "iHeartRadio",
    color: "#FF3D57",
    url: "https://www.iheart.com/podcast/953-asphalt-dirt-podcast-342401764",
    icon: <path d="M12 21s-7-4.35-9.5-8.8C1 9 2.5 5.5 6 5c2-.3 3.5.8 4.5 2.3C11.5 5.8 13 4.7 15 5c3.5.5 5 4 3.5 7.2C19 16.65 12 21 12 21z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
  },
  {
    name: "Podcast Index",
    color: "#00A99D",
    url: "https://rss.buzzsprout.com/2641565.rss",
    icon: (
      <>
        <circle cx="12" cy="18" r="1.5" fill="currentColor" />
        <path d="M8.5 14.5a5 5 0 0 1 7 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M5.5 11.5a9 9 0 0 1 13 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  {
    name: "Castbox",
    color: "#F55B23",
    icon: (
      <>
        <path d="M3 8l9-4 9 4-9 4-9-4z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M3 8v8l9 4 9-4V8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M12 12v8" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </>
    ),
  },
  {
    name: "Overcast",
    color: "#4FA8D8",
    icon: <path d="M7 18a4 4 0 0 1-.5-7.97A5 5 0 0 1 16 8.5a4.5 4.5 0 0 1 1 8.9H7z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />,
  },
];

export default function PlatformGrid({ compact = false }: { compact?: boolean }) {
  if (compact) {
    const allPlatforms = [...WATCH_PLATFORMS, ...LISTEN_PLATFORMS];
    return (
      <div>
        <div className="platform-row">
          {allPlatforms.map((p) => {
            const content = (
              <>
                <div className="platform-row-icon" style={{ background: p.color, color: "#fff" }}>
                  <svg viewBox="0 0 24 24">{p.icon}</svg>
                </div>
                <div>
                  <div>{p.name}</div>
                  {p.badge && (
                    <span className="platform-row-badge" style={p.badgeColor ? { color: p.badgeColor } : undefined}>
                      {p.badge}
                    </span>
                  )}
                </div>
              </>
            );
            return p.url ? (
              <a
                key={p.name}
                href={p.url}
                target="_blank"
                rel="noopener"
                className="platform-row-item"
                onClick={() => track("platform_link_click", { platform: p.name })}
              >
                {content}
              </a>
            ) : (
              <div className="platform-row-item" key={p.name}>
                {content}
              </div>
            );
          })}
          <div className="platform-row-item">
            <div className="platform-row-icon" style={{ background: "#4a4b4d", color: "#fff" }}>
              <svg viewBox="0 0 24 24">
                <circle cx="6" cy="12" r="1.7" fill="currentColor" />
                <circle cx="12" cy="12" r="1.7" fill="currentColor" />
                <circle cx="18" cy="12" r="1.7" fill="currentColor" />
              </svg>
            </div>
            <div>and more</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="platform-groups">
      <div className="platform-group">
        <div className="platform-group-label">Watch</div>
        <div className="platform-card-grid">
          {WATCH_PLATFORMS.map((p) => {
            const content = (
              <>
                <div className="platform-card-icon" style={{ background: p.color, color: "#fff" }}>
                  <svg viewBox="0 0 24 24">{p.icon}</svg>
                </div>
                <div className="platform-card-name">{p.name}</div>
                <span className="platform-card-badge" style={p.badgeColor ? { color: p.badgeColor } : undefined}>
                  {p.badge}
                </span>
              </>
            );
            return p.url ? (
              <a
                key={p.name}
                href={p.url}
                target="_blank"
                rel="noopener"
                className="platform-card"
                onClick={() => track("platform_link_click", { platform: p.name })}
              >
                {content}
              </a>
            ) : (
              <div className="platform-card" key={p.name}>
                {content}
              </div>
            );
          })}
        </div>
      </div>

      <div className="platform-group">
        <div className="platform-group-label">Listen</div>
        <div className="platform-card-grid">
          {LISTEN_PLATFORMS.map((p) => {
            const content = (
              <>
                <div className="platform-card-icon" style={{ background: p.color, color: "#fff" }}>
                  <svg viewBox="0 0 24 24">{p.icon}</svg>
                </div>
                <div className="platform-card-name">{p.name}</div>
              </>
            );
            return p.url ? (
              <a
                key={p.name}
                href={p.url}
                target="_blank"
                rel="noopener"
                className="platform-card"
                onClick={() => track("platform_link_click", { platform: p.name })}
              >
                {content}
              </a>
            ) : (
              <div className="platform-card" key={p.name}>
                {content}
              </div>
            );
          })}
          <div className="platform-card">
            <div className="platform-card-icon" style={{ background: "#4a4b4d", color: "#fff" }}>
              <svg viewBox="0 0 24 24">
                <circle cx="6" cy="12" r="1.7" fill="currentColor" />
                <circle cx="12" cy="12" r="1.7" fill="currentColor" />
                <circle cx="18" cy="12" r="1.7" fill="currentColor" />
              </svg>
            </div>
            <div className="platform-card-name">and more</div>
          </div>
        </div>
      </div>
    </div>
  );
}
