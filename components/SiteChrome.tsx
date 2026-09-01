"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

// Paths meant to be handed out as a standalone link (e.g. to real people for
// review collection) skip the site header/footer entirely — no main nav to
// wander off into unfinished pages through, just the page itself.
const BARE_PATHS = new Set<string>(["/reviews/submit", "/coming-soon", "/qr"]);

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (BARE_PATHS.has(pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
