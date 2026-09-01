import type { Metadata } from "next";
import LandingSplash from "@/components/LandingSplash";

export const metadata: Metadata = {
  title: "Welcome",
  description: "Scanned the Asphalt & Dirt QR code? Everything you need is right here.",
  robots: { index: false, follow: false },
};

// Permanent QR-code destination — printed on physical materials (events,
// flyers, podcast show notes), so this URL never changes and this page
// stays live even after the full site launches on the real domain. It's
// deliberately independent of the coming-soon gate in middleware.ts: while
// that gate is active this page is one of the exempted paths, and once the
// gate is removed at launch this page just keeps working as a normal route.
export default function QrLandingPage() {
  return (
    <LandingSplash
      eyebrow="You Found Us"
      heading="Welcome To Asphalt & Dirt"
      description="Thanks for scanning in. Podcast episodes, builds, community, and merch — subscribe below to stay in the loop, or head straight into the full site."
      source="qr-landing"
      // The full site is still hidden behind a coming-soon gate on the real
      // domain (see middleware.ts) — link straight to the Vercel deployment
      // for now. Once the site fully launches, swap this for the real
      // domain (or drop the prop entirely and let people just navigate).
      enterSiteHref="https://asphaltanddirt.vercel.app"
    />
  );
}
