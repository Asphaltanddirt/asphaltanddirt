import Link from "next/link";

const LINKS = [
  { href: "/ambassadors/guide", label: "Crew Guide" },
  { href: "/ambassadors/agreement", label: "Agreement" },
  { href: "/ambassadors/media-kit", label: "Media Kit" },
];

/** The three pages an approved ambassador needs, linked from each other and
 *  from the welcome emails. `current` marks the page you're on. */
export default function CrewResourceLinks({ current }: { current: string }) {
  return (
    <nav className="crew-resource-links" aria-label="Road & Trail Crew resources">
      {LINKS.map((link) =>
        link.href === current ? (
          <span key={link.href} aria-current="page">
            {link.label}
          </span>
        ) : (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ),
      )}
    </nav>
  );
}
