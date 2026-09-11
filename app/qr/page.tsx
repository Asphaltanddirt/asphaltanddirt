import type { Metadata } from "next";
import LandingSplash from "@/components/LandingSplash";

export const metadata: Metadata = {
  title: "Welcome",
  description: "Scanned the Asphalt & Dirt QR code? Everything you need is right here.",
  robots: { index: false, follow: false },
};

// Permanent QR-code destination — printed on physical materials (events,
// flyers, podcast show notes), so this URL never changes and this page
// stays live as a normal route on the real domain.
export default function QrLandingPage() {
  return (
    <LandingSplash
      eyebrow="You Found Us"
      heading="Welcome To Asphalt & Dirt"
      description="Thanks for scanning in. Podcast episodes, builds, community, and merch — subscribe below to stay in the loop, or head straight into the full site."
      source="qr-landing"
      returnTo="/qr"
      enterSiteHref="/"
    />
  );
}
