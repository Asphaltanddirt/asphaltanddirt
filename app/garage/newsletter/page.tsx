import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageNewsletterActions from "@/components/GarageNewsletterActions";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { DAILY_SEND_CAP, getSubscriberStats, listIssues, thisMonday } from "@/lib/garageNewsletter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Newsletter · A and D Garage",
  robots: { index: false, follow: false },
};

const day = (iso: string, withYear = false) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}) }) : "";
const STATE_LABEL = { set: "Filled in", auto: "Automatic", out: "Left out" } as const;

/** The Dirt Line: who's on the list, this week's issue, send it. */
export default async function GarageNewsletterPage() {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeOwnerOnly(session)) redirect("/garage");

  const [stats, issues] = await Promise.all([getSubscriberStats().catch(() => null), listIssues().catch(() => null)]);
  const draft = issues?.find((i) => i.status === "Draft") || null;
  const sent = issues?.filter((i) => i.status === "Sent") || [];
  const monday = thisMonday();
  const testInbox = process.env.NEWSLETTER_TEST_EMAIL || "";

  return (
    <div className="garage">
      <GarageBack title="Newsletter" />
      <div className="garage-body">
        <h1 className="garage-event-title">The Dirt Line</h1>

        <section className="garage-panel">
          <h2>Subscribers</h2>
          {!stats ? (
            <p className="garage-error">Couldn&apos;t read the Subscribers table.</p>
          ) : (
            <>
              <p className="garage-count">
                {stats.newsletter} <span>on the weekly newsletter</span>
              </p>
              <p className="garage-form-note">
                {stats.eventUpdates} on Event Updates · {stats.newLast7} new this week · {stats.newLast30} new in 30 days ·{" "}
                {stats.leftLast30} left in 30 days · {stats.inWelcomeSeries} still getting the welcome emails
              </p>
            </>
          )}
        </section>

        <section className="garage-panel">
          <h2>This week&apos;s issue</h2>
          {!issues ? (
            <p className="garage-error">Couldn&apos;t read the Newsletters table.</p>
          ) : draft ? (
            <>
              <p>
                <strong>Week of {day(draft.weekOf, true) || "(no date)"}</strong>
                {draft.weekOf && draft.weekOf !== monday && <span className="garage-form-note"> · not this week</span>}
              </p>
              <ul className="garage-issue-sections">
                {draft.sections.map((s) => (
                  <li key={s.label} className={`is-${s.state}`}>
                    <span>{s.label}</span>
                    <span>{STATE_LABEL[s.state]}</span>
                  </li>
                ))}
              </ul>
              <p className="garage-form-note">Automatic = the newest post, event, video or product is used. Left out = that section won&apos;t appear.</p>
              <p className="garage-links">
                <Link href={`/garage/newsletter/${draft.id}`} className="btn btn-outline btn-sm">Edit issue</Link>
              </p>
              <GarageNewsletterActions
                hasDraft
                recipients={stats?.newsletter ?? null}
                testInbox={testInbox}
                overCap={(stats?.newsletter ?? 0) > DAILY_SEND_CAP}
              />
            </>
          ) : (
            <>
              <p className="garage-form-note">Nothing in progress. Start one and fill in what you have; blank sections fill themselves.</p>
              <GarageNewsletterActions hasDraft={false} recipients={null} testInbox={testInbox} overCap={false} />
            </>
          )}
        </section>

        {sent.length > 0 && (
          <section className="garage-panel">
            <h2>Sent</h2>
            <ul className="garage-roster">
              {sent.slice(0, 12).map((i) => (
                <li key={i.id}>
                  <Link href={`/garage/newsletter/${i.id}`} className="garage-app-row">
                    <span className="garage-app-main">
                      <strong>{i.subject || `Week of ${day(i.weekOf, true)}`}</strong>
                      <span className="garage-roster-meta">
                        {[i.sentDate && `Sent ${day(i.sentDate, true)}`, i.recipients !== null && `${i.recipients} people`].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span aria-hidden="true">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
