import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Team",
  description: "We're racers, builders, explorers, and storytellers. Meet the Asphalt & Dirt crew.",
};

const DRIVES_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 16V11l2.2-4.4A2 2 0 0 1 8 5.5h8a2 2 0 0 1 1.8 1.1L20 11v5" />
    <path d="M4 16h16v3H4z" /><circle cx="8" cy="19" r="1.4" /><circle cx="16" cy="19" r="1.4" />
  </svg>
);

const HOSTS = [
  {
    name: "Jose",
    photo: "/img/team/jose.jpg",
    role: "Host",
    tagline: "Gearhead, racer, and off-road explorer.",
    bio: "Jose helps shape the voice of Asphalt & Dirt with a mix of street performance, trail culture, and real-world community connection. He brings the perspective of someone who lives the build, the ride, and the stories behind both.",
    experience: "Street builds • Off-road rides",
    experienceLine2: "Community leadership",
    drives: "Rhino Rock",
  },
  {
    name: "Anthony",
    photo: "/img/team/anthony.jpg",
    role: "Host",
    tagline: "Builder, storyteller, and weekend adventurer.",
    bio: "Anthony brings a builder's eye and a storyteller's mindset, helping turn the culture into content that feels real, useful, and entertaining. He connects the technical side of the hobby with the community side.",
    experience: "Build culture • Event coverage",
    experienceLine2: "Weekend wheeling",
    drives: "TBD",
  },
];

const TRAIL_AMBASSADORS = [
  {
    name: "Dan",
    photo: "/img/team/dan.jpg",
    role: "Trail Ambassadors",
    tagline: "Trail guide, gear tester, and off-road advocate.",
    bio: "Dan represents the trail-first side of Asphalt & Dirt, bringing practical trail knowledge, honest gear feedback, and a deep appreciation for getting rigs dirty. He helps connect the brand to the off-road community in a grounded, authentic way.",
    experience: "Trail guidance • Gear testing",
    experienceLine2: "Off-road community",
    drives: "Iron Bandit",
  },
  {
    name: "Jack",
    photo: "/img/team/jack.jpg",
    role: "Trail Ambassadors",
    tagline: "Explorer, content creator, and trail enthusiast.",
    bio: "Jack brings energy to the community through content, adventure, and a passion for documenting the experience. He helps turn rides, events, and moments on the trail into stories people want to be part of.",
    experience: "Content creation • Ride recaps",
    experienceLine2: "Community adventures",
    drives: "Shockwave",
  },
];

function TeamCard({
  name,
  photo,
  role,
  tagline,
  bio,
  experience,
  experienceLine2,
  drives,
}: {
  name: string;
  photo: string;
  role: string;
  tagline: string;
  bio: string;
  experience: string;
  experienceLine2: string;
  drives: string;
}) {
  return (
    <div className="team-card">
      <div className="team-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt={`${name}, ${role.toLowerCase()} portrait`} />
      </div>
      <div>
        <div className="team-role">{role}</div>
        <h3 className="team-name">{name}</h3>
        <p className="team-tagline">{tagline}</p>
        <p>{bio}</p>
        <div className="exp-label">Experience In The Culture</div>
        <div className="exp-box">
          {experience}
          <br />
          {experienceLine2}
        </div>
        <div className="drives-line">
          {DRIVES_ICON} Drives: {drives}
        </div>
      </div>
    </div>
  );
}

export default function TeamPage() {
  return (
    <>
      <section className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/team/hero.jpg"
          className="hero-bg"
          alt="The crew standing together by their rigs in the garage at sunset"
        />
        <div className="hero-scrim" />
        <div className="container hero-inner">
          <div className="hero-content">
            <h1>
              <span className="line">Meet The <span className="accent-text">Crew</span></span>
            </h1>
            <div className="eyebrow mt-2" style={{ fontSize: 16 }}>The People Behind Asphalt &amp; Dirt.</div>
            <p className="lead mt-4">
              We&apos;re racers, builders, explorers, and storytellers who live for the open road and the
              dirt beyond it. This is our crew. This is our story.
            </p>
          </div>
        </div>
      </section>

      <section className="section-pb-tight">
        <div className="container">
          <h2 className="text-center mb-0">Hosts</h2>
          <div className="grid grid-2 mt-4">
            {HOSTS.map((host) => (
              <TeamCard key={host.name} {...host} />
            ))}
          </div>
        </div>
      </section>

      <section className="section-alt section-pt-tight section-pb-tight">
        <div className="container">
          <h2 className="text-center mb-0">Trail Ambassadors</h2>
          <div className="grid grid-2 mt-4">
            {TRAIL_AMBASSADORS.map((ambassador) => (
              <TeamCard key={ambassador.name} {...ambassador} />
            ))}
          </div>
        </div>
      </section>

      <section className="section-pt-tight section-pb-tight">
        <div className="container">
          <h2 className="text-center mb-0">Brand Ambassadors</h2>
          <div className="ambassadors-row mt-4">
            <div className="card" style={{ padding: 28, justifyContent: "center" }}>
              <div className="eyebrow">Join The Movement.</div>
              <h3 className="accent-text mt-2" style={{ fontFamily: "var(--font-display)", fontSize: 24 }}>
                Rep The Culture.
              </h3>
              <p className="mt-2">
                Brand Ambassadors represent the heart of our community. If you live the lifestyle, support
                the brand, and inspire others &mdash; let&apos;s ride.
              </p>
              <a href="mailto:team@asphaltanddirt.com?subject=Brand%20Ambassador%20Application" className="btn btn-primary mt-2">
                Apply To Become An Ambassador
              </a>
            </div>
            <div className="grid grid-3">
              {[1, 2, 3].map((i) => (
                <div className="ambassador-card" key={i}>
                  <div className="ambassador-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="8" r="3" /><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" /><circle cx="18" cy="9" r="2.4" /><path d="M15.5 14.2c2.7.4 4.5 2.4 4.5 5.8" />
                    </svg>
                  </div>
                  <h3 style={{ fontSize: 15 }}>Future Ambassador</h3>
                  <div className="ambassador-tag">Intro Coming Soon</div>
                  <p className="mb-0">Building the crew. Stay tuned.</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-alt section-pt-tight">
        <div className="container">
          <div className="card" style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 28, padding: 28 }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>One Crew. One Mission.</h3>
              <h3 className="accent-text" style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>Built On Passion.</h3>
              <p className="mt-2 mb-0">
                From street to summit, we live for the ride, the build, and the stories in between. Thanks
                for being part of the journey.
              </p>
            </div>
            <div className="feature-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="8" r="3" /><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" /><circle cx="18" cy="9" r="2.4" /><path d="M15.5 14.2c2.7.4 4.5 2.4 4.5 5.8" />
              </svg>
              <span>Real People.<br />Real experiences.<br />No filters.</span>
            </div>
            <div className="feature-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 19 9 8l4 6.5L15 11l6 8z" />
              </svg>
              <span>Real Adventure.<br />Exploring farther.<br />Going harder.</span>
            </div>
            <div className="feature-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4l-2.6 2.6-2-2z" />
              </svg>
              <span>Real Community.<br />Built together.<br />Stronger together.</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
