import type { Metadata } from "next";
import LandingSplash from "@/components/LandingSplash";

export const metadata: Metadata = {
  title: "Coming Soon",
  description: "The full Asphalt & Dirt site is under construction. Subscribe and follow along in the meantime.",
};

// The temporary front door for the real domain while the full site is still
// being built — see middleware.ts for how this gets served for every path
// on asphaltanddirt.com. Not tied to /qr's lifecycle: this page (and the
// middleware rule pointing at it) gets deleted once the full site launches
// for real; /qr keeps working unchanged either way.
export default function ComingSoonPage() {
  return (
    <LandingSplash
      eyebrow="Coming Soon"
      heading="Something's Building"
      description="The Asphalt & Dirt website is under construction — podcast episodes, community builds, events, and merch, all in one place. In the meantime, subscribe so you don't miss a drop, and catch every episode where you already listen."
      source="coming-soon"
    />
  );
}
