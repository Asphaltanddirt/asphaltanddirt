import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import { NIGHT_SHOTS, OWNER_SHOTS, POSTING_REMINDERS } from "@/lib/crewEve";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { footageStock } from "@/lib/garagePlan";
import { getMediaLibrary, type MediaRow } from "@/lib/mediaLibrary";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Shot List · A and D Garage",
  robots: { index: false, follow: false },
};

/**
 * Garage → Shot list (Jose 9/25). Owners only: the crew are volunteers with
 * their own gear, so they get a thank-you and three light tips in the
 * night-before email (lib/crewEve.ts), never a list. This is the reminder for
 * the two people running the day, the same list their email carries.
 */

const WATCH_WORDS = ["mud", "water", "night", "recovery", "street cruise", "car show", "talking"];

export default async function GarageShotListPage() {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeOwnerOnly(session)) redirect("/garage");

  const rows = await getMediaLibrary().catch(() => [] as MediaRow[]);
  const stock = footageStock(rows);
  const unusedVideo = rows.filter((r) => /\.(mov|mp4|m4v)$/i.test(r.fileName) && !r.usedAt);
  const words = WATCH_WORDS.map((w) => ({
    word: w,
    count: unusedVideo.filter((r) =>
      r.keywords
        .toLowerCase()
        .split(",")
        .map((k) => k.trim())
        .includes(w),
    ).length,
  })).sort((a, b) => a.count - b.count);

  const list = (shots: typeof OWNER_SHOTS) => (
    <ol className="garage-shoot-shots">
      {shots.map((s) => (
        <li key={s.title}>
          <strong>{s.title}</strong>
          <span>{s.how}</span>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="garage">
      <GarageBack title="Shot list" />
      <div className="garage-body">
        <h1 className="garage-event-title">Shot list</h1>
        <p className="garage-event-area">
          Owners only. The crew gets a thank-you and three tips in the night-before email instead.
        </p>

        <section className="garage-panel garage-shoot-need" aria-labelledby="shoot-need">
          <h2 id="shoot-need" className="garage-section">The Library is short on</h2>
          <ul className="garage-shoot-stock">
            {stock.map((s) => (
              <li key={s.side} className={s.weeks < 3 ? "is-low" : ""}>
                <strong>{s.side}</strong> {s.unused} unused clip{s.unused === 1 ? "" : "s"}, about {s.weeks} week
                {s.weeks === 1 ? "" : "s"}
              </li>
            ))}
          </ul>
          <p className="garage-form-note">
            Fewest unused clips tagged:{" "}
            {words
              .slice(0, 4)
              .map((w) => `${w.word} (${w.count})`)
              .join(" · ")}
          </p>
        </section>

        <h2 className="garage-section">Every event</h2>
        {list(OWNER_SHOTS)}

        <h2 className="garage-section">Night runs</h2>
        {list(NIGHT_SHOTS)}

        <h2 className="garage-section">Before anything posts</h2>
        <ul className="garage-shoot-list">
          {POSTING_REMINDERS.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
