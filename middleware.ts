import { NextRequest, NextResponse } from "next/server";

// Temporary launch gate: the real domain isn't ready to show the full
// (still-in-progress) site to cold search/direct traffic yet, so every path
// on it gets rewritten to the coming-soon splash instead. asphaltanddirt.vercel.app
// (and any preview deployment) is untouched — the full site keeps working
// there exactly as before, for our own QA.
//
// To retire this once the site is ready to launch for real: delete this
// file (or just the GATED_HOSTS check) and the app/coming-soon page. /qr is
// exempted below and is unaffected either way — it's a permanent page, not
// part of this gate.
const GATED_HOSTS = new Set(["asphaltanddirt.com", "www.asphaltanddirt.com"]);

// Paths that should keep working normally even while the gate is active.
const EXEMPT_PREFIXES = ["/qr", "/api", "/img", "/images"];
const EXEMPT_EXACT = new Set(["/coming-soon", "/favicon.ico", "/robots.txt", "/sitemap.xml"]);

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  if (!GATED_HOSTS.has(host)) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (EXEMPT_EXACT.has(pathname)) return NextResponse.next();
  if (EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return NextResponse.next();

  return NextResponse.rewrite(new URL("/coming-soon", req.url));
}

export const config = {
  // Runs for everything except Next's own built asset pipeline — public
  // folder files (/img, /images) still pass through this middleware, which
  // is why they're explicitly exempted above rather than matched out here.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
