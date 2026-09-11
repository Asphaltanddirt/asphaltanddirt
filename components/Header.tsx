"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "./CartContext";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/podcast", label: "Podcast" },
  { href: "/team", label: "Team" },
  { href: "/builds", label: "Builds" },
  { href: "/community", label: "Community" },
  { href: "/events", label: "Events" },
  { href: "/merch", label: "Merch" },
  { href: "/blog", label: "Blog" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { cart, open: openCart } = useCart();

  function submitSearch() {
    const q = searchQuery.trim();
    if (!q) return;
    setSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <>
      <header className="site-header">
        <div className="container nav-row">
          <Link href="/" className="logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/branding/asphalt-and-dirt-horizontal.png" alt="Asphalt & Dirt" className="logo-image" />
          </Link>
          <nav className="nav-links">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={isActive(link.href) ? "active" : ""}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="nav-actions">
            {searchOpen && (
              <input
                className="header-search-input"
                type="text"
                placeholder="Search the site…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitSearch();
                  if (e.key === "Escape") setSearchOpen(false);
                }}
                autoFocus
                onBlur={() => setSearchOpen(false)}
              />
            )}
            <button
              className="icon-btn"
              aria-label="Search"
              // mousedown (not click) fires before the input's onBlur, so
              // toggling here — rather than in onClick — avoids a race where
              // blur closes the box and the click immediately reopens it.
              onMouseDown={(e) => {
                e.preventDefault();
                setSearchOpen((o) => !o);
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
              </svg>
            </button>
            <button className="icon-btn" aria-label="Cart" onClick={openCart}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" />
                <path d="M2 3h2l2.6 12.4A2 2 0 0 0 8.5 17h9a2 2 0 0 0 2-1.6L21 7H6" />
              </svg>
              {cart && cart.itemCount > 0 && (
                <span className="cart-count-badge">{cart.itemCount}</span>
              )}
            </button>
            <button
              className="icon-btn nav-toggle"
              aria-label="Menu"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
              )}
            </button>
          </div>
        </div>
      </header>
      {/* Rendered as a sibling of <header>, not a child — .site-header has
          backdrop-filter, which creates a containing block for fixed-position
          descendants and would trap this drawer inside the header's own box. */}
      <div className={`mobile-drawer${open ? " open" : ""}`}>
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={isActive(link.href) ? "active" : ""}
            onClick={() => setOpen(false)}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </>
  );
}
