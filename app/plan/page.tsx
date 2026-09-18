import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Content Plan",
  description: "How Asphalt & Dirt turns one newsletter into a week of content — for Anthony's review.",
  robots: { index: false, follow: false },
};

/** Unlisted review page, shared by link with Anthony while he isn't in the Garage yet.
 *  Same noindex pattern as /ambassadors/guide and /ambassadors/media-kit. */

function Ask({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="exp-box pair-box mt-3">
      <strong>{n}. {title}</strong>
      <p>{children}</p>
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
          One newsletter builds the whole week. Everything below comes out of something we already
          make — the goal is more reach without more filming. Read it, then tell me what you&apos;d change.
        </p>

        <h2 className="mt-6" style={{ fontSize: 24 }}>Your week</h2>
        <p>Roughly <strong>3–4 hours</strong>. That&apos;s the whole ask.</p>

        <div className="grid grid-2 mt-3">
          <div className="card"><div className="card-body">
            <h3 style={{ fontSize: 18 }}>The Live</h3>
            <p className="mb-0">
              ~2 hours. We record the podcast live, talk through the week&apos;s topics, and take
              questions at the end if anyone&apos;s watching. Riverside cleans it up and cuts the
              clips automatically — no editing on your side.
            </p>
          </div></div>
          <div className="card"><div className="card-body">
            <h3 style={{ fontSize: 18 }}>Garage Takes</h3>
            <p className="mb-0">
              ~1 hour, same day as the live. Two short takes — one per blog topic. Once the podcast
              is running these can come straight out of it, so it may cost you nothing extra.
            </p>
          </div></div>
          <div className="card"><div className="card-body">
            <h3 style={{ fontSize: 18 }}>Events</h3>
            <p className="mb-0">
              1–2 a month. On camera, reacting to what&apos;s actually happening. No script. The
              stuff that works best is you responding to someone getting stuck.
            </p>
          </div></div>
          <div className="card"><div className="card-body">
            <h3 style={{ fontSize: 18 }}>That&apos;s it</h3>
            <p className="mb-0">
              No daily posting on your side, no editing, no thumbnails. Jose handles everything
              after the camera stops.
            </p>
          </div></div>
        </div>

        <h2 className="mt-6" style={{ fontSize: 24 }}>What we&apos;d change</h2>
        <p>Four things. These are the bits I actually need you to sign off on.</p>

        <Ask n="1" title="Your take opens the argument instead of closing it">
          Nothing changes about how you film — you already work from the topic, not the article.
          What changes is <strong>when it lands</strong>. Right now the take is the last word on a
          topic. Instead it becomes the first: your gut call goes up, the blog makes the researched
          case, and <strong>the live is where the two meet.</strong> Sometimes you&apos;ll change
          your mind on air. That&apos;s the best clip of the week.
        </Ask>

        <Ask n="2" title="Jose plays devil&apos;s advocate">
          On the podcast I take the other side on purpose, whether I believe it or not, and we
          actually argue it out. Not fake drama — real disagreement about real things. 35s vs 37s,
          Bronco vs Wrangler, whether anyone needs a locker. That format works on any topic and
          needs nothing but a room.
        </Ask>

        <Ask n="3" title="Blog topics are the staple, not the ceiling">
          The two weekly blog topics are the reliable spine — they&apos;re always there and they
          generate themselves. But the live doesn&apos;t have to stay on them. Anything happening
          in the niche is fair game.
        </Ask>

        <Ask n="4" title="Events become filming days">
          Not &ldquo;we went wheeling and got some footage.&rdquo; We turn up knowing what we&apos;re
          capturing. The biggest one: the <strong>30 minutes before roll-out</strong>, while everyone&apos;s
          parked and standing around. Twenty seconds per rig — walkaround, tyres, mods,
          &ldquo;what did you do to it?&rdquo; That fills Rig of the Week for months.
        </Ask>

        <h2 className="mt-6" style={{ fontSize: 24 }}>The series idea</h2>
        <div className="take-summary mt-3">
          <p className="mb-0">
            <strong>Jeep Badge of Honor.</strong> Registered trails where you check in through the
            Jeep app and earn a physical badge. There are about six within a day&apos;s drive —
            Rausch Creek has two in one park, and we&apos;ve already been to AOAA.
            One trail per episode, one badge, real stakes: <em>do we actually make it?</em>
          </p>
        </div>
        <p className="mt-3">
          Honest version: our rigs are close to stock with skid plates. Some of these trails are
          rated extreme and we have no business on them yet. <strong>That&apos;s the story.</strong>{" "}
          We start with what we can actually do and let the series find its ceiling. The episode
          where the trail beats us is the one people will watch.
        </p>

        <h2 className="mt-6" style={{ fontSize: 24 }}>What this is all aimed at</h2>
        <p>
          <strong>5,000 followers.</strong> That&apos;s the bar for the onX Offroad ambassador
          programme — revenue-share code, gear, free membership. Their other requirements, weekly
          posting and a video every couple of weeks, <strong>we already meet.</strong> The follower
          count is the only thing short. We&apos;re at roughly 1,100 across TikTok and Meta.
        </p>
        <p>
          onX is also the app you&apos;d use to plan and run the Badge of Honor trails — so the
          series is the exact thing they&apos;d want to sponsor. It&apos;s the portfolio we apply with.
        </p>

        <div className="discuss-box mt-5">
          <h2 className="eyebrow mb-0">What I need from you</h2>
          <p>
            Tell me which of the four changes you&apos;re good with and which you&apos;d push back
            on. Especially number one — flipping the Garage Takes to go first changes how you&apos;d
            film them. If that doesn&apos;t feel right, say so and we&apos;ll find another way.
          </p>
        </div>
      </div>
    </section>
  );
}
