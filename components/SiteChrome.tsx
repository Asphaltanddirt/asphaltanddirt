"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

// Paths meant to be handed out as a standalone link (e.g. to real people for
// review collection) skip the site header/footer entirely — no main nav to
// wander off into unfinished pages through, just the page itself.
const BARE_PATHS = new Set<string>(["/reviews/submit", "/qr"]);

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Event Comms is a focused in-field tool (people are standing in a
  // parking lot with one hand on the phone) — every /comms/* page skips
  // the header/footer too, not just an exact path.
  // A&D Garage is the crew's own app, not a page of the public site: its own
  // header lives inside it, so the site chrome stays out of the way.
  if (BARE_PATHS.has(pathname) || pathname.startsWith("/comms/") || pathname === "/garage" || pathname.startsWith("/garage/")) {
    return <main id="main">{children}</main>;
  }

  return (
    <>
      {/* First thing a keyboard user reaches: jump past the nav. */}
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer returnTo={pathname} />
    </>
  );
}
