import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Content Plan",
  description: "How Asphalt & Dirt turns one newsletter into a week of content — for Anthony's review.",
  robots: { index: false, follow: false },
};

/** Unlisted review page, shared by link with Anthony while he isn't in the Garage yet.
 *  Same noindex, nofollow pattern as /ambassadors/guide and /ambassadors/media-kit. */

function Ask({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="exp-box pair-box mt-3">
      <strong>{n}. {title}</strong>
      <p>{children}</p>
    </div>
  );
}

function Phase({ label, hours, children }: { label: string; hours: string; children: React.ReactNode }) {
  return (
    <div className="take-summary mt-3">
      <p className="mb-0">
        <strong>{label}</strong> — {hours}
      </p>
      <p className="mb-0 mt-2" style={{ fontSize: 15, color: "var(--text-muted)" }}>{children}</p>
    </div>
  );
}

export default function PlanPage() {
  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container" style={{ maxWidth: 820 }}>
        <p className="eyebrow">For Anthony · draft for review</p>
        <h1 className="mt-2">The Content Plan</h1>
        <p className="lead mt-2">
          One newsletter builds the whole week. Everything else comes out of something we already
          make — the goal is more reach without more filming.
        </p>
        <p className="mt-2">
          This splits into two parts: <strong>what happens now</strong>, and{" "}
          <strong>what changes when the podcast starts</strong>. Nothing in part two happens until
          we&apos;ve banked two or three episodes, so there&apos;s no rush on it.
        </p>

        {/* ---------------- PART ONE ---------------- */}
        <h2 className="mt-6" style={{ fontSize: 26 }}>Part one — now</h2>
        <p>Your week is about <strong>an hour</strong>, plus events. Basically what you already do.</p>

        <Phase label="Garage Takes" hours="~1 hour, filmed on their own">
          Two short takes, one per blog topic. You work from the topic, not the article — same as
          the E36 and Bronco ones. Nothing changes here yet.
        </Phase>

        <Phase label="Events" hours="1–2 a month">
          On camera, reacting to what&apos;s actually happening. No script. The stuff that works
          best is you responding to someone getting stuck.
        </Phase>

        <p className="mt-4">
          <strong>The only thing I need from you before the Mud Run on the 26th</strong> is the one
          below.
        </p>

        <Ask n="1" title="Events become filming days">
          Not &ldquo;we went wheeling and got some footage.&rdquo; We turn up knowing what we&apos;re
          capturing. The big one is the <strong>30 minutes before roll-out</strong>, while everyone&apos;s
          parked and standing around — twenty seconds per rig: walkaround, tyres, mods,
          &ldquo;what did you do to it?&rdquo; That alone fills Rig of the Week for months.
          Last ride we came home with almost no faces in the footage, and that&apos;s the gap.
        </Ask>

        {/* ---------------- PART TWO ---------------- */}
        <h2 className="mt-6" style={{ fontSize: 26 }}>Part two — when the podcast starts</h2>
        <p>
          Your week goes to about <strong>3–4 hours</strong>. Still no editing, no thumbnails, no
          daily posting on your side — I handle everything after the camera stops.
        </p>

        <Phase label="The Live" hours="~2 hours, one evening">
          We record the podcast live, talk through the week&apos;s topics, and take questions at the
          end if anyone&apos;s watching. Riverside cleans it up and cuts the clips automatically.
        </Phase>

        <Phase label="Garage Takes" hours="~0 extra">
          Once the live is running, your takes can come straight out of it — same day, same sitting.
          They may stop being a separate shoot entirely.
        </Phase>

        <p className="mt-4">These three are the ones I&apos;d want you to sign off on, whenever you get to it.</p>

        <Ask n="2" title="Your take opens the argument instead of closing it">
          Nothing changes about how you film. What changes is <strong>when it lands</strong>. Right
          now the take is the last word on a topic. Instead it becomes the first: your gut call goes
          up, the blog makes the researched case, and <strong>the live is where the two meet.</strong>{" "}
          Sometimes you&apos;ll change your mind on air. That&apos;s the best clip of the week.
        </Ask>

        <Ask n="3" title="I play devil&apos;s advocate">
          On the live I take the other side on purpose, whether I believe it or not, and we actually
          argue it out. Not fake drama — real disagreement about real things. 35s vs 37s, Bronco vs
          Wrangler, whether anyone needs a locker. That format works on any topic and needs nothing
          but a room.
        </Ask>

        <Ask n="4" title="Blog topics are the staple, not the ceiling">
          The two weekly blog topics are the reliable spine — they&apos;re always there and they
          generate themselves. But the live doesn&apos;t have to stay on them. Anything happening in
          the niche is fair game.
        </Ask>

        {/* ---------------- SERIES ---------------- */}
        <h2 className="mt-6" style={{ fontSize: 26 }}>The series idea</h2>
        <p className="mb-0">
          <strong>Jeep Badge of Honor.</strong> Registered trails where you check in through the Jeep
          app and earn a physical badge. About six within a day&apos;s drive — Rausch Creek has two in
          one park, and we&apos;ve already been to AOAA. One trail per episode, one badge, real stakes:{" "}
          <em>do we actually make it?</em>
        </p>
        <p className="mt-3">
          Honest version: our rigs are close to stock with skid plates, and some of these trails are
          rated extreme. We have no business on those yet. <strong>That&apos;s the story.</strong> We
          start with what we can actually do and let the series find its ceiling. The episode where
          the trail beats us is the one people will watch.
        </p>

        {/* ---------------- TARGET ---------------- */}
        <h2 className="mt-6" style={{ fontSize: 26 }}>What this is all aimed at</h2>
        <p>
          <strong>5,000 followers.</strong> That&apos;s the bar for the onX Offroad ambassador
          programme — revenue-share code, gear, free membership. Their other requirements, weekly
          posting and a video every couple of weeks, <strong>we already meet.</strong> The follower
          count is the only thing short. We&apos;re at roughly 1,100 across TikTok and Meta.
        </p>
        <p>
          onX is also the app you&apos;d use to plan and run the Badge of Honor trails — so the series
          is the exact thing they&apos;d want to sponsor. It&apos;s the portfolio we apply with.
        </p>

        <div className="discuss-box mt-5">
          <h2 className="eyebrow mb-0">What I need from you</h2>
          <p>
            <strong>Before the 26th:</strong> just number one — are you good with events being
            filming days, and with grabbing the rigs before roll-out?
          </p>
          <p style={{ marginTop: 8 }}>
            <strong>Whenever you get to it:</strong> two, three and four. If any of them don&apos;t
            feel right, say so and we&apos;ll find another way.
          </p>
        </div>
      </div>
    </section>
  );
}
