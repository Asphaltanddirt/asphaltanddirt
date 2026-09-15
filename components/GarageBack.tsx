import Link from "next/link";

/** Header on every Garage screen below Home: the wordmark doubles as the way
 *  back, so there's one obvious exit on a phone. */
export default function GarageBack({ title }: { title: string }) {
  return (
    <header className="garage-header">
      <Link href="/garage" className="garage-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18 9 12l6-6" />
        </svg>
        <span className="garage-wordmark small">Garage</span>
      </Link>
      <span className="garage-screen-title">{title}</span>
    </header>
  );
}
