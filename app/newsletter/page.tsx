import type { Metadata } from "next";
import Link from "next/link";
import SubscribeButton from "@/components/SubscribeButton";
import { issuePath, listSentIssues } from "@/lib/newsletterArchive";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "The Dirt Line: Past Issues",
  description: "Every issue of The Dirt Line, the weekly Asphalt & Dirt newsletter: builds, trails, gear and the people in the scene.",
  alternates: { canonical: "/newsletter" },
};

/** Past issues of The Dirt Line (Jose 10/8), newest first. Each opens as the
 *  email it was (app/newsletter/[date]/route.ts). */
export default async function NewsletterArchivePage() {
  const issues = await listSentIssues().catch(() => []);
  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container legal-page">
        <div className="eyebrow">The Dirt Line</div>
        <h1>Past Issues</h1>
        <p>Our weekly newsletter, every Thursday at 7 PM. Here&apos;s everything we&apos;ve sent so far.</p>
        <p>
          <SubscribeButton source="newsletter_archive" label="Get It Every Thursday" returnTo="/newsletter" />
        </p>
        {issues.length === 0 ? (
          <p>The first issue is on its way.</p>
        ) : (
          <ul className="newsletter-archive">
            {issues.map((i) => (
              <li key={i.date}>
                <Link href={issuePath(i.date)} prefetch={false}>
                  <strong>{i.subject}</strong>
                </Link>
                <br />
                <small>
                  {new Date(`${i.date}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  {i.previewText ? ` · ${i.previewText}` : ""}
                </small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
