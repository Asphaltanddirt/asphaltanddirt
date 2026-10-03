import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageEngageItem from "@/components/GarageEngageItem";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { getEngageTargets, planSession, TIER_ORDER, type EngageTarget } from "@/lib/engage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Engage · A and D Garage",
  robots: { index: false, follow: false },
};

/** Where our own comments and replies wait, checked first every session. */
const OWN_INBOXES = [
  { label: "FB + IG comments (Meta inbox)", href: "https://business.facebook.com/latest/inbox/all" },
  { label: "X notifications", href: "https://x.com/notifications" },
  { label: "Threads activity", href: "https://www.threads.com/activity" },
  { label: "YouTube comments", href: "https://studio.youtube.com/channel/UCxW12IVrVrAx-UKFoNfq45Q/comments/inbox" },
  { label: "TikTok inbox", href: "https://www.tiktok.com/messages" },
];

export default async function GarageEngagePage() {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeOwnerOnly(session)) redirect("/garage");

  const targets = await getEngageTargets().catch((): EngageTarget[] | null => null);
  const plan = targets ? planSession(targets) : null;
  const rest = plan
    ? plan.active
        .filter((t) => !plan.session.includes(t) && !plan.doneToday.includes(t))
        .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || a.name.localeCompare(b.name))
    : [];

  return (
    <div className="garage">
      <GarageBack title="Engage" />
      <div className="garage-body garage-body-wide">
        <div className="garage-social-top">
          <div>
            <h1 className="garage-event-title">Engage</h1>
            <p className="garage-event-area">
              {plan ? `${plan.doneToday.length} done today · ${plan.session.length} to go` : ""}
            </p>
          </div>
          <nav className="garage-links garage-links-wrap" aria-label="Related">
            <Link href="/garage/replies">X replies</Link>
            <Link href="/garage/comments">Comments</Link>
          </nav>
        </div>

        <section className="garage-panel">
          <h2>1. Our own comments first</h2>
          <p>Answer everyone who commented on our posts before anything else.</p>
          <div className="garage-links garage-links-wrap">
            {OWN_INBOXES.map((i) => (
              <a key={i.href} href={i.href} target="_blank" rel="noopener">
                {i.label} ↗
              </a>
            ))}
          </div>
        </section>

        <section className="garage-panel">
          <h2>2. Today&apos;s accounts</h2>
          <p>
            As <strong>A&amp;D</strong> (on Facebook, switch to the Page first). One or two real sentences about their post, a question if
            you can. No links, no &ldquo;check us out&rdquo;, never the same comment twice. Tapping <strong>Open</strong> marks it done; Undo if you didn&apos;t comment.
          </p>
        </section>

        {!plan ? (
          <p className="garage-error">Couldn&apos;t read the Engage list.</p>
        ) : plan.session.length === 0 ? (
          <section className="garage-panel">
            <h2>All done for today</h2>
            <p>Nice work. Pick more from the full list below if you have time.</p>
          </section>
        ) : (
          <div className="garage-social-grid">
            {plan.session.map((t) => (
              <GarageEngageItem key={t.id} target={t} />
            ))}
          </div>
        )}

        {plan && plan.doneToday.length > 0 && (
          <>
            <h2 className="garage-section">Done today</h2>
            <div className="garage-social-grid">
              {plan.doneToday.map((t) => (
                <GarageEngageItem key={t.id} target={t} done />
              ))}
            </div>
          </>
        )}

        {rest.length > 0 && (
          <details className="garage-panel">
            <summary>Full list ({rest.length} more)</summary>
            <div className="garage-social-grid">
              {rest.map((t) => (
                <GarageEngageItem key={t.id} target={t} />
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
