import type { Metadata, Viewport } from "next";

/** Every Garage screen: the app icon and manifest for Add to Home Screen, and
 *  a dark ground so the status bar area matches the app instead of flashing
 *  white. Kept off the public site, which has its own icon and theme. */
export const metadata: Metadata = {
  manifest: "/garage/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Garage", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/img/garage/icon/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/img/garage/icon/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0b",
  viewportFit: "cover",
};

export default function GarageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
