import Link from "next/link";

/** Header on every Garage screen below Home. Top-level screens go back to
 *  Home (the wordmark); a screen inside another one (an application, an
 *  event's edit form, a Studio record) gets `back` so its arrow goes up one
 *  level to that screen instead, with Home still one tap away. */
export default function GarageBack({ title, back }: { title: string; back?: { href: string; label: string } }) {
  const arrow = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18 9 12l6-6" />
    </svg>
  );
  return (
    <header className="garage-header">
      {back ? (
        <Link href={back.href} className="garage-back garage-back-up">
          {arrow}
          <span>{back.label}</span>
        </Link>
      ) : (
        <Link href="/garage" className="garage-back">
          {arrow}
          <span className="garage-wordmark small">Garage</span>
        </Link>
      )}
      {back ? (
        <Link href="/garage" className="garage-home-link">
          Garage
        </Link>
      ) : (
        <span className="garage-screen-title">{title}</span>
      )}
    </header>
  );
}
