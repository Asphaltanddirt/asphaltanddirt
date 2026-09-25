import type { TrailTalk } from "@/lib/trailTalk";

/** Community page: this week's Trail Talk question and where to answer it. */
export default function TrailTalkSection({ talk }: { talk: TrailTalk }) {
  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container">
        <div className="section-head">
          <h2 className="eyebrow">This Week&apos;s Trail Talk</h2>
        </div>
        <div className={talk.imageUrl ? "two-col trail-talk" : "trail-talk"}>
          {talk.imageUrl && (
            <div className="trail-talk-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={talk.imageUrl} alt="" loading="lazy" />
            </div>
          )}
          <div className="trail-talk-copy">
            <h3 className="trail-talk-question">{talk.title}</h3>
            {talk.body && <p className="trail-talk-body">{talk.body}</p>}
            <p className="trail-talk-lead">Pick a spot and weigh in:</p>
            <div className="trail-talk-actions">
              <a className="btn btn-primary" href={talk.groupUrl} target="_blank" rel="noopener">
                Weigh in on Facebook
              </a>
              <a className="btn btn-outline" href={talk.xUrl} target="_blank" rel="noopener">
                {talk.xIsPost ? "Answer on X" : "Find us on X"}
              </a>
              <a className="btn btn-outline" href={talk.threadsUrl} target="_blank" rel="noopener">
                {talk.threadsIsPost ? "Answer on Threads" : "Find us on Threads"}
              </a>
            </div>
            <p className="trail-talk-note">The Facebook group is private: not a member yet? You&apos;ll be asked to join first.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
