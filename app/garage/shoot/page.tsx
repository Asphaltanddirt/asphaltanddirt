import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import { getSession } from "@/lib/garageAuth";
import { footageStock } from "@/lib/garagePlan";
import { getMediaLibrary, type MediaRow } from "@/lib/mediaLibrary";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Shoot Guide · A and D Garage",
  robots: { index: false, follow: false },
};

/**
 * Garage → Shoot guide (punchlist #19c, 9/25). One screen to glance at before
 * and during an event: what to film, how, what never to post, and what the
 * Library is short on right now, so the crew fills the gaps instead of
 * shooting the same rolling-out clip ten times. Open to every signed-in
 * Garage user: the crew shoots most of the footage.
 */

/** The words the content plan runs out of first. Counted live from the
 *  Library's keywords (the Garage Upload chips write these same words). */
const WATCH_WORDS = ["mud", "water", "rocks", "recovery", "night", "street cruise", "car show", "talking"];

function keywordCounts(rows: MediaRow[]) {
  const unused = rows.filter((r) => !r.usedAt);
  return WATCH_WORDS.map((w) => ({
    word: w,
    count: unused.filter((r) =>
      r.keywords
        .toLowerCase()
        .split(",")
        .map((k) => k.trim())
        .includes(w),
    ).length,
  })).sort((a, b) => a.count - b.count);
}

const SHOTS: { title: string; how: string }[] = [
  { title: "The lineup", how: "Wide shot of every rig at the meetup before anyone leaves. Walk it slowly, one pass." },
  { title: "Rolling out", how: "Low and to the side as each rig passes you. Stay put; let them drive through the frame." },
  { title: "Mud and water", how: "The crossings on the road itself: tires going in, the splash, coming out. Hold 10 seconds past the splash." },
  { title: "A recovery", how: "If someone gets stuck: the strap going on, the pull, the cheer. Ask the driver before it gets posted." },
  { title: "From the seat", how: "Dash or passenger POV for a full minute of trail. Mount it or brace it; no hand shake." },
  { title: "Details", how: "Close-ups: a muddy tire, a fender, lights, a badge. 5 seconds each. These fill every gap in an edit." },
  { title: "One line on camera", how: "Ask one person: \"Why'd you come out today?\" One take, landscape, face the light." },
  { title: "The group at the end", how: "Everyone together, dirty rigs behind them. This is the recap thumbnail." },
];

export default async function GarageShootPage() {
  const session = await getSession();
  if (!session) redirect("/garage");

  const rows = await getMediaLibrary().catch(() => [] as MediaRow[]);
  const video = rows.filter((r) => /\.(mov|mp4|m4v)$/i.test(r.fileName));
  const stock = footageStock(rows);
  const words = keywordCounts(video);

  return (
    <div className="garage">
      <GarageBack title="Shoot guide" />
      <div className="garage-body">
        <h1 className="garage-event-title">Shoot guide</h1>
        <p className="garage-event-area">What to film at an event, and what the Library is short on right now.</p>

        <section className="garage-panel garage-shoot-need" aria-labelledby="shoot-need">
          <h2 id="shoot-need" className="garage-section">The Library needs</h2>
          <ul className="garage-shoot-stock">
            {stock.map((s) => (
              <li key={s.side} className={s.weeks < 2 ? "is-low" : ""}>
                <strong>{s.side}</strong> {s.unused} unused clip{s.unused === 1 ? "" : "s"}, about {s.weeks} week
                {s.weeks === 1 ? "" : "s"}
                {s.weeks < 2 ? " · film this" : ""}
              </li>
            ))}
          </ul>
          <p className="garage-form-note">
            Fewest unused clips tagged:{" "}
            {words
              .slice(0, 4)
              .map((w) => `${w.word} (${w.count})`)
              .join(" · ")}
            . Get these first.
          </p>
        </section>

        <h2 className="garage-section">Before you roll</h2>
        <ul className="garage-shoot-list">
          <li>
            <strong>4K, landscape.</strong> Every vertical clip gets cropped from it later; film 4K or the crops go soft.
          </li>
          <li>
            <strong>Wipe the lens.</strong> Dust and mud on the glass ruin more clips than anything else.
          </li>
          <li>
            <strong>20 GB free and a battery pack.</strong> Running out halfway is the usual way the best part gets missed.
          </li>
          <li>
            <strong>Hold every shot 10 seconds.</strong> Short clips can&apos;t be cut into anything.
          </li>
        </ul>

        <h2 className="garage-section">The shot list</h2>
        <ol className="garage-shoot-shots">
          {SHOTS.map((s) => (
            <li key={s.title}>
              <strong>{s.title}</strong>
              <span>{s.how}</span>
            </li>
          ))}
        </ol>

        <h2 className="garage-section">At night</h2>
        <ul className="garage-shoot-list">
          <li>Headlights and light bars coming at you in a line: the one shot only a night run has.</li>
          <li>Film from a parked spot, never while driving. Brace the phone; low light blurs every wobble.</li>
          <li>No flash or lights pointed at drivers.</li>
        </ul>

        <h2 className="garage-section">Never post</h2>
        <ul className="garage-shoot-list is-never">
          <li>
            Anything off the mapped roads: no woods, bogs or fields, even if someone else went there. We follow the forest rules
            to the letter, and footage is proof either way.
          </li>
          <li>Readable license plates (blur them) or other clubs&apos; stickers (remove before posting).</li>
          <li>Kids, unless their parent is fine with it. Anyone who says no.</li>
          <li>Risky driving, even as a joke.</li>
        </ul>

        <h2 className="garage-section">After</h2>
        <p>
          Upload the same day in <Link href="/garage/upload">Garage → Upload</Link>. Pick the event and it tags Dirt or Asphalt
          for you; tap the Rig and What happened words so the clip can be found again.
        </p>
      </div>
    </div>
  );
}
