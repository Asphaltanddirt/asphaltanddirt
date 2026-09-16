import type { Metadata } from "next";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import CrewResourceLinks from "@/components/CrewResourceLinks";
import { CREW_GUIDE, type GuideBlock, type GuidePart } from "@/lib/crewGuide";

export const metadata: Metadata = {
  title: "Road & Trail Crew Guide",
  description: "The Asphalt & Dirt Road & Trail Crew onboarding guide — tiers, commission, content, conduct and your first 30 days.",
  robots: { index: false, follow: false },
};

/** Onboarding steps that have a page of their own get linked. */
const STEP_LINKS: Record<string, string> = {
  "Accept the program terms": "/ambassadors/agreement",
  "Download the A&D media kit": "/ambassadors/media-kit",
};

/** `**bold**` markers from the source document become <strong>. */
function inline(text: string): ReactNode {
  return text.split(/\*\*(.+?)\*\*/g).map((piece, i) =>
    i % 2 === 1 ? <strong key={i}>{piece}</strong> : <Fragment key={i}>{piece}</Fragment>,
  );
}

function Part({ part }: { part: GuidePart }) {
  if (part.type === "ul") {
    return (
      <ul>
        {part.items.map((item) => (
          <li key={item}>{STEP_LINKS[item] ? <Link href={STEP_LINKS[item]}>{item}</Link> : inline(item)}</li>
        ))}
      </ul>
    );
  }
  if (part.type === "h2") return <h2>{part.text}</h2>;
  if (part.type === "h3") return <h3>{part.text}</h3>;
  if (part.type === "h4") return <h4>{part.text}</h4>;
  return <p>{inline(part.text)}</p>;
}

/** Runs of short cards (70/20/10, the four weeks, quick reference) sit side
 *  by side; a single card stays full width. */
function group(blocks: GuideBlock[]) {
  const out: (GuideBlock | GuideBlock[])[] = [];
  for (const block of blocks) {
    const last = out[out.length - 1];
    if (block.type === "card" && Array.isArray(last)) last.push(block);
    else if (block.type === "card") out.push([block]);
    else out.push(block);
  }
  return out;
}

function Card({ block }: { block: GuideBlock }) {
  if (block.type !== "card") return null;
  return (
    <div className="card crew-guide-card">
      {block.parts.map((part, i) => (
        <Part key={i} part={part} />
      ))}
    </div>
  );
}

export default function CrewGuidePage() {
  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container build-form-page">
        <Link href="/ambassadors" className="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 18 5 12l6-6M5 12h14" /></svg>
          Back To Road &amp; Trail Crew
        </Link>
        <div className="eyebrow accent mt-3">Road &amp; Trail Crew</div>
        <h1 className="mt-2">Brand Ambassador Onboarding Guide</h1>
        <p className="lead mt-2">Real people. Real builds. Street to trail.</p>
        <CrewResourceLinks current="/ambassadors/guide" />

        <div className="crew-guide mt-4">
          {group(CREW_GUIDE).map((item, i) =>
            Array.isArray(item) ? (
              <div key={i} className={item.length > 1 ? "crew-guide-cards" : undefined}>
                {item.map((block, j) => (
                  <Card key={j} block={block} />
                ))}
              </div>
            ) : (
              <Part key={i} part={item as GuidePart} />
            ),
          )}
        </div>
      </div>
    </section>
  );
}
