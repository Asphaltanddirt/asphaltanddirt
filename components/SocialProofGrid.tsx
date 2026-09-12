"use client";

import { useEffect } from "react";
import type { SocialProofPost } from "@/lib/socialProof";
import { excerpt } from "@/lib/text";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

function loadScriptOnce(src: string, id: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.src = src;
  script.async = true;
  document.body.appendChild(script);
}

// Fallback for posts with no thumbnail (Instagram — its oEmbed needs a Meta
// app token we don't have set up yet — or a TikTok oEmbed that failed).
// Uses the platform's own live widget script, which can render taller/
// shorter than a thumbnail card depending on the post.
function InstagramEmbed({ url }: { url: string }) {
  return (
    <blockquote
      className="instagram-media"
      data-instgrm-permalink={url}
      data-instgrm-version="14"
      style={{ margin: 0, width: "100%" }}
    />
  );
}

function TikTokEmbed({ url }: { url: string }) {
  const videoId = url.match(/\/video\/(\d+)/)?.[1];
  return (
    <blockquote className="tiktok-embed" cite={url} data-video-id={videoId} style={{ margin: 0, maxWidth: 605, minWidth: 325 }}>
      <section />
    </blockquote>
  );
}

export default function SocialProofGrid({ posts }: { posts: SocialProofPost[] }) {
  const fallbackPosts = posts.filter((p) => !p.thumbnailUrl);
  const hasInstagramFallback = fallbackPosts.some((p) => p.platform === "Instagram");
  const hasTikTokFallback = fallbackPosts.some((p) => p.platform === "TikTok");

  useEffect(() => {
    if (hasInstagramFallback) {
      loadScriptOnce("https://www.instagram.com/embed.js", "instagram-embed-script");
      window.instgrm?.Embeds.process();
    }
    if (hasTikTokFallback) {
      loadScriptOnce("https://www.tiktok.com/embed.js", "tiktok-embed-script");
    }
  }, [hasInstagramFallback, hasTikTokFallback]);

  if (posts.length === 0) return null;

  return (
    <div className="grid grid-5">
      {posts.map((post) =>
        post.thumbnailUrl ? (
          <a className="card" key={post.id} href={post.postUrl} target="_blank" rel="noopener">
            <div className="card-media card-media-vertical">
              <div className="play-overlay">
                <div className="play-circle">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.thumbnailUrl} alt={post.caption || `${post.posterName || "A fan"}'s ${post.platform} post`} />
            </div>
            <div className="card-body" style={{ padding: "var(--sp-2)" }}>
              <h3 style={{ fontSize: 14 }}>{post.caption ? excerpt(post.caption, 70) : `${post.posterName || "A fan"} on ${post.platform}`}</h3>
            </div>
          </a>
        ) : (
          <div className="social-proof-card" key={post.id}>
            <div className="social-proof-caption">
              <span>{post.posterName || "A fan"} on {post.platform}</span>
              <a href={post.postUrl} target="_blank" rel="noopener">
                View original
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M8 7h9v9" /></svg>
              </a>
            </div>
            {post.platform === "TikTok" ? <TikTokEmbed url={post.postUrl} /> : <InstagramEmbed url={post.postUrl} />}
          </div>
        ),
      )}
    </div>
  );
}
