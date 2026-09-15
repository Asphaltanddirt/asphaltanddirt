import { NextResponse } from "next/server";

/**
 * Makes A&D Garage installable: Add to Home Screen gives the crew the GARAGE
 * icon and a full-screen app with no Safari address bar. Served from /garage
 * so the app's scope is the Garage only — the public site keeps its own icon.
 */
export function GET() {
  return NextResponse.json(
    {
      name: "A&D Garage",
      short_name: "Garage",
      description: "Asphalt & Dirt crew app: events, Tailgate, photos and the team's own tools.",
      start_url: "/garage",
      scope: "/garage",
      display: "standalone",
      orientation: "portrait",
      background_color: "#0b0b0b",
      theme_color: "#0b0b0b",
      icons: [
        { src: "/img/garage/icon/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/img/garage/icon/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "/img/garage/icon/icon-1024.png", sizes: "1024x1024", type: "image/png", purpose: "any" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
