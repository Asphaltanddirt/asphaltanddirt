// Generated from the Road & Trail Crew Docs artifact (Onboarding Guide section),
// 2026-09-16. Keep in sync with that document and with lib/ambassadorAgreement.ts.

export type GuidePart =
  | { type: "h2" | "h3" | "h4" | "p"; text: string }
  | { type: "ul"; items: string[] };

export type GuideBlock = GuidePart | { type: "card"; parts: GuidePart[] };

export const CREW_GUIDE: GuideBlock[] = [
  {
    type: "h2",
    text: "Welcome to the Crew",
  },
  {
    type: "p",
    text: "You're here because Asphalt & Dirt believes you bring something real to automotive culture.",
  },
  {
    type: "p",
    text: "Maybe you build cars in your garage. Maybe weekends mean trails, track days, meets, wrenching, camping, riding, filming, or organizing the people who make those things happen.",
  },
  {
    type: "p",
    text: "Maybe you have 500 followers. Maybe you have 50,000. That isn't what got you here.",
  },
  {
    type: "p",
    text: "The A&D Road & Trail Crew isn't a follower-count contest and it isn't a network of people whose only job is posting discount codes. We're building a crew of enthusiasts who actually participate in the culture.",
  },
  {
    type: "p",
    text: "Street cars. Trail rigs. Jeeps. Trucks. Imports. Muscle. UTVs. ATVs. Bikes. Overlanding. Racing. Builds. Photography. Events. Families. Asphalt and dirt.",
  },
  {
    type: "p",
    text: "Your job isn't to become an A&D salesperson. Your job is to keep doing what made us want you here in the first place — and bring Asphalt & Dirt into that story naturally.",
  },
  {
    type: "p",
    text: "**Welcome to the crew.**",
  },
  {
    type: "h2",
    text: "What Asphalt & Dirt Stands For",
  },
  {
    type: "p",
    text: "Asphalt & Dirt exists because automotive culture is bigger than one lane. Some of us would rather spend Saturday chasing a lap time. Some would rather disappear down a trail. Some are under a project car until midnight. Some are loading a UTV onto a trailer at 5 a.m. A lot of us do more than one. That's the point.",
  },
  {
    type: "p",
    text: "Our community is built around:",
  },
  {
    type: "ul",
    items: [
      "Real vehicles and real builds",
      "Hands-on ownership",
      "Responsible automotive culture",
      "Legitimate meets, races, trail rides, and events",
      "Craftsmanship and creativity",
      "Helping newcomers without gatekeeping",
      "Respect for other enthusiasts",
      "Respect for trails, venues, property, and communities",
      "People who participate instead of just watching from the sidelines",
    ],
  },
  {
    type: "p",
    text: "We're not interested in manufactured drama. We don't glorify street takeovers, reckless public-road driving, illegal racing, trail destruction, trespassing, or behavior that makes the rest of automotive culture look bad. We want this culture to stay worth showing up for.",
  },
  {
    type: "h2",
    text: "Your Role in the Road & Trail Crew",
  },
  {
    type: "p",
    text: "As an ambassador, you represent both your own automotive identity and Asphalt & Dirt. We want your voice, your build, your perspective. We do not want every ambassador publishing the same caption with the same product sitting in the same pose. Good ambassador content should look like something you would have created anyway — A&D simply becomes part of it.",
  },
  {
    type: "p",
    text: "Your contribution might include: build and modification content, garage work, track-day or motorsports content, responsible trail rides, UTV/ATV/dirt-bike content, overlanding and camping, shows and legitimate meets, photography and videography, event coverage, product-in-use content, technical knowledge, podcast reactions, community stories, trail cleanup or charitable work, introducing us to interesting vehicles or people, or helping represent A&D at local events.",
  },
  {
    type: "p",
    text: "Sales matter. But they are not the only way you bring value to this crew.",
  },
  {
    type: "h2",
    text: "Road & Trail Crew Tiers",
  },
  {
    type: "h3",
    text: "Tier 1 — Road & Trail Member",
  },
  {
    type: "p",
    text: "This is where most ambassadors begin.",
  },
  {
    type: "card",
    parts: [
      {
        type: "h4",
        text: "Your Benefits",
      },
      {
        type: "ul",
        items: [
          "Personal 10% customer discount code",
          "10% commission on eligible tracked net merchandise sales",
          "A welcome merch package to get you started",
          "Road & Trail Crew digital badge and media kit",
          "Reposts and possible features through A&D",
          "Early access to product announcements",
          "Eligibility for future product-seeding campaigns",
        ],
      },
      {
        type: "h4",
        text: "Your Monthly Expectations",
      },
      {
        type: "ul",
        items: [
          "At least two relevant A&D mentions or pieces of content",
          "Include your A&D code or tracking link when it naturally makes sense",
          "Participate constructively in the community",
          "Submit at least one usable photo or short video to A&D",
          "Follow all safety, conduct, and disclosure standards",
        ],
      },
    ],
  },
  {
    type: "h3",
    text: "Tier 2 — Featured Ambassador",
  },
  {
    type: "p",
    text: "Featured Ambassador status recognizes members who have demonstrated consistent participation and contribution. It is earned — not automatic.",
  },
  {
    type: "card",
    parts: [
      {
        type: "h4",
        text: "Typical Qualification",
      },
      {
        type: "ul",
        items: [
          "At least three consecutive active months",
          "Consistent, brand-appropriate content",
          "At least 10 tracked orders or another meaningful contribution",
          "No conduct or disclosure problems",
        ],
      },
      {
        type: "p",
        text: "Meaningful contribution can include outstanding content, event participation, photography, community leadership, referrals, technical knowledge, or other value to A&D.",
      },
      {
        type: "h4",
        text: "Your Benefits",
      },
      {
        type: "ul",
        items: [
          "10% customer discount code",
          "12% commission",
          "Periodic complimentary products",
          "Priority features and collaboration opportunities",
          "Potential podcast, event, or build-feature appearances",
          "Early access to campaign briefs",
        ],
      },
      {
        type: "h4",
        text: "Your Monthly Expectations",
      },
      {
        type: "ul",
        items: [
          "Approximately two to four content pieces",
          "At least one original short-form video",
          "Timely participation in campaigns you agree to join",
          "Quarterly feedback on products, trends, and the automotive community",
        ],
      },
    ],
  },
  {
    type: "h3",
    text: "Tier 3 — Crew Partner",
  },
  {
    type: "p",
    text: "Crew Partner is a selective tier for proven creators, organizers, builders, and community leaders. It represents a deeper relationship with Asphalt & Dirt.",
  },
  {
    type: "card",
    parts: [
      {
        type: "h4",
        text: "Your Benefits",
      },
      {
        type: "ul",
        items: [
          "10% customer discount code",
          "15% commission",
          "Quarterly merchandise allowance",
          "Potential collaborative products or limited collections",
          "Featured podcast, build, or event coverage",
          "Priority consideration for paid campaigns",
          "Event materials and limited local activation support",
        ],
      },
      {
        type: "h4",
        text: "Expectations",
      },
      {
        type: "ul",
        items: [
          "Consistent content and community activity",
          "Professional communication",
          "Reliable campaign execution",
          "Responsible public conduct",
          "Measurable contribution through sales, reach, events, content, partnerships, or other meaningful work",
        ],
      },
      {
        type: "p",
        text: "Crew Partner status is reviewed every six months. It is not automatically permanent.",
      },
    ],
  },
  {
    type: "h2",
    text: 'What Does "Active Ambassador" Mean?',
  },
  {
    type: "p",
    text: "An Active Ambassador is an ambassador who meets their tier's minimum participation requirements during a calendar month or has an approved exception or alternative contribution agreed upon with A&D.",
  },
  {
    type: "p",
    text: "We understand that not every month looks the same. You might attend an event one month and produce a full gallery of reusable photography instead of two conventional social posts. You might help connect A&D with a major build, podcast guest, charity, or event. That can matter just as much.",
  },
  {
    type: "p",
    text: "Communication is key. If life gets busy or something changes, talk to us.",
  },
  {
    type: "h2",
    text: "How Your Commission Works",
  },
  {
    type: "p",
    text: "We want compensation to be simple and transparent. Your commission is calculated using the merchandise subtotal after discounts, excluding taxes and shipping. Returns, cancellations, refunds, and chargebacks do not generate commission.",
  },
  {
    type: "card",
    parts: [
      {
        type: "h4",
        text: "Example",
      },
      {
        type: "p",
        text: "A customer places a $100 merchandise order using your 10% customer discount. The merchandise subtotal after the discount is **$90**. A Tier 1 Road & Trail Member earning 10% commission would earn **$9 commission**. Taxes and shipping are not included in that calculation.",
      },
    ],
  },
  {
    type: "h3",
    text: "Payouts",
  },
  {
    type: "p",
    text: 'Commission reports show the amount of eligible commission earned during each monthly reporting period. There is no minimum payout threshold and no "below threshold" status. Each monthly report reflects the commission earned for that period based on eligible tracked net merchandise sales. Returned, canceled, refunded, or charged-back orders do not earn commission and may be removed from the applicable commission calculation.',
  },
  {
    type: "h3",
    text: "Personal Purchases",
  },
  {
    type: "p",
    text: "Personal purchases — items you buy for yourself — do not generate ambassador commission. Don't attempt to route personal purchases through your affiliate link, customer code, another account, or another method for the purpose of generating commission.",
  },
  {
    type: "h2",
    text: "Your Customer Code",
  },
  {
    type: "p",
    text: "Your customer code gives your audience 10% off eligible A&D merchandise. Use it naturally. A build video with an A&D shirt in it? Perfectly reasonable place to mention the code. Posting the code every day underneath unrelated content? That's not what we're building. Your audience should never feel like they became a sales list the minute you joined the crew. People first. Product second.",
  },
  {
    type: "h2",
    text: "The 70 / 20 / 10 Content Approach",
  },
  {
    type: "p",
    text: "This isn't a rigid posting formula. Think of it as a guardrail.",
  },
  {
    type: "card",
    parts: [
      {
        type: "h4",
        text: "70% — Your Automotive Life",
      },
      {
        type: "p",
        text: "Builds, mods, racing, trails, garage work, events, road trips, repairs, photography — whatever makes your automotive life yours.",
      },
    ],
  },
  {
    type: "card",
    parts: [
      {
        type: "h4",
        text: "20% — Community + A&D",
      },
      {
        type: "p",
        text: "Introduce people to the crew, share what A&D is doing, react to a podcast topic, show an event, feature another build.",
      },
    ],
  },
  {
    type: "card",
    parts: [
      {
        type: "h4",
        text: "10% — Direct Promotion",
      },
      {
        type: "p",
        text: "Merchandise, your code, product launches, campaigns.",
      },
    ],
  },
  {
    type: "p",
    text: "We'd rather have one natural product mention that people trust than ten forced advertisements they scroll past.",
  },
  {
    type: "h2",
    text: "Content We Want",
  },
  {
    type: "p",
    text: "Create in your own voice. We especially encourage: vehicle builds and modifications, garage and behind-the-scenes work, legitimate racing and track-day content, responsible trail riding, overlanding, car shows and organized meets, product-in-use photography, event coverage, podcast reactions or clips, honest product feedback, community service, trail cleanups, family involvement in automotive culture, useful technical information, real ownership experiences.",
  },
  {
    type: "p",
    text: "You do not have to pretend everything is perfect. Authenticity matters more than fake enthusiasm.",
  },
  {
    type: "h2",
    text: "What We Don't Want",
  },
  {
    type: "p",
    text: "Avoid: scripted corporate advertising, constant discount-code promotion, misleading product claims, content completely disconnected from automotive culture, forced or excessive logo placement, reposting another creator's work without permission, artificial engagement, misrepresenting your relationship with A&D, presenting personal opinions as official statements from Asphalt & Dirt.",
  },
  {
    type: "p",
    text: "**Most importantly: don't stop being yourself because you became an ambassador. That's exactly backwards.**",
  },
  {
    type: "h2",
    text: "Safety & Conduct",
  },
  {
    type: "p",
    text: "When you're publicly representing A&D, how you participate in automotive culture matters. Road & Trail Crew members must not promote or glorify: street takeovers, reckless public-road driving, illegal street racing, impaired driving, destruction of public or private property, trail damage, trespassing, bypassing trail closures, harassment, discrimination, threats, hate speech, fraudulent orders, self-referral abuse, discount-code manipulation, or unsafe conduct presented as endorsed by A&D.",
  },
  {
    type: "p",
    text: "Motorsports and higher-risk activities should take place at sanctioned tracks, controlled events, or legitimate off-road locations. We love horsepower. We love trails. We don't need to destroy either community to enjoy them. Serious safety, conduct, or reputation issues may result in immediate suspension or removal from the program.",
  },
  {
    type: "h2",
    text: "Promotional Disclosures",
  },
  {
    type: "p",
    text: 'If you earn money from a sale or receive a product from Asphalt & Dirt, your audience needs to understand that relationship. Keep disclosures clear and visible. Examples: "A&D Ambassador," "Affiliate link — I may earn a commission," "A&D provided this product," or platform-provided paid partnership/affiliate labels. Do not bury disclosures among a pile of hashtags. This protects you, protects A&D, and — more importantly — keeps the relationship with your audience honest.',
  },
  {
    type: "h2",
    text: "Submitting Content to A&D",
  },
  {
    type: "p",
    text: "We want to feature the people in this program. Each Road & Trail Member should submit at least one usable photo or short video per month. Good submissions include clean vehicle photos, action footage, garage/build progress, event photography, vertical short-form clips, trail footage, track footage, behind-the-scenes content.",
  },
  {
    type: "p",
    text: "Whenever possible, submit the original high-quality file rather than a screenshot or downloaded social-media copy. Submission does not guarantee publication, but strong content may be featured across A&D social channels, the website, newsletter, podcast promotion, or other community content consistent with the program terms.",
  },
  {
    type: "h2",
    text: "Moving Up Through the Crew",
  },
  {
    type: "p",
    text: "Tier advancement isn't based on follower count alone. We look at the whole contribution: content consistency, content quality, tracked sales, community participation, photography/video contribution, event representation, podcast or build referrals, technical knowledge, audience engagement, reliability, communication, conduct.",
  },
  {
    type: "p",
    text: "Someone generating great local automotive coverage may be just as valuable as someone selling merchandise. Someone connecting A&D with events, builders, or guests may create opportunities that can't be measured with a discount code. We pay attention to all of it.",
  },
  {
    type: "h2",
    text: "Your First 30 Days",
  },
  {
    type: "card",
    parts: [
      {
        type: "h4",
        text: "Week 1 — Get Set Up",
      },
      {
        type: "ul",
        items: [
          "Review this guide",
          "Accept the program terms",
          "Activate your code and tracking link",
          "Download the A&D media kit",
          "Confirm your profile and vehicle information",
        ],
      },
    ],
  },
  {
    type: "card",
    parts: [
      {
        type: "h4",
        text: "Week 2 — Introduce Yourself",
      },
      {
        type: "p",
        text: "Create your first Road & Trail Crew post. Tell people what you drive or build, where you fit into automotive culture, whether you're asphalt, dirt, or somewhere in between, and why you joined the crew. People should meet you before they meet your discount code.",
      },
    ],
  },
  {
    type: "card",
    parts: [
      {
        type: "h4",
        text: "Week 3 — Show Us What You Do",
      },
      {
        type: "p",
        text: "Create something authentic — a garage clip, trail footage, track content, a build update, event photography, a vehicle walk-around. Then submit at least one usable photo or short video to A&D.",
      },
    ],
  },
  {
    type: "card",
    parts: [
      {
        type: "h4",
        text: "Week 4 — Contribute",
      },
      {
        type: "p",
        text: "Complete your second A&D-related mention or content piece. Then send us one thing we should know about — an interesting build, an upcoming event, a potential podcast guest, a community story, a product issue, a trend, an idea worth covering. That's how this becomes a network instead of an affiliate program.",
      },
    ],
  },
  {
    type: "h2",
    text: "Your First 90 Days",
  },
  {
    type: "p",
    text: "The first 90 days give both you and A&D a chance to see how the partnership works. We will look at participation, content, communication, audience response, submitted media, sales when applicable, community contribution, and conduct.",
  },
  {
    type: "p",
    text: "You should also evaluate us. Tell us what's working, what's confusing, what would make the program better. At the end of the pilot period, strong performers may become eligible for advancement, additional opportunities, product seeding, collaborations, or other roles within the A&D community.",
  },
  {
    type: "h2",
    text: "Founding Road & Trail Crew — 2026",
  },
  {
    type: "p",
    text: "Members selected for the first Road & Trail Crew cohort are part of something that only happens once — the founding crew. That designation does not automatically change your commission rate or program tier. It recognizes the people who helped build this program from the beginning. As Asphalt & Dirt grows, we want that to mean something.",
  },
  {
    type: "h2",
    text: "The First Crew Campaign — Where Asphalt Meets Dirt",
  },
  {
    type: "p",
    text: "Your first campaign is simple. Introduce yourself. Show your vehicle or current build. Tell people where you come from in automotive culture — street, trail, track, overland, two wheels, four wheels, all of it. And answer one question: **what do you want automotive culture to become?**",
  },
  {
    type: "p",
    text: "If you have an A&D product, work it into the content naturally — don't build the entire post around selling it. Use **#AsphaltAndDirtCrew** and **#TeamAsphaltAndDirt**. People first. Merchandise second. Always.",
  },
  {
    type: "h2",
    text: "Quick Reference",
  },
  {
    type: "card",
    parts: [
      {
        type: "h4",
        text: "Road & Trail Member",
      },
      {
        type: "ul",
        items: [
          "Customer code: 10%",
          "Commission: 10%",
          "Monthly: 2 mentions/content, 1 media submission, constructive participation",
        ],
      },
    ],
  },
  {
    type: "card",
    parts: [
      {
        type: "h4",
        text: "Featured Ambassador",
      },
      {
        type: "ul",
        items: [
          "Customer code: 10%",
          "Commission: 12%",
          "Monthly: 2–4 pieces, 1 original short-form video, agreed campaigns, quarterly feedback",
        ],
      },
    ],
  },
  {
    type: "card",
    parts: [
      {
        type: "h4",
        text: "Crew Partner",
      },
      {
        type: "ul",
        items: [
          "Customer code: 10%",
          "Commission: 15%",
          "Quarterly merchandise allowance",
          "Six-month status review",
        ],
      },
    ],
  },
  {
    type: "h2",
    text: "One Last Thing",
  },
  {
    type: "p",
    text: "A&D doesn't need another person holding up a shirt and saying \"use my code.\" We need builders, drivers, riders, photographers, organizers, families, creators — people who actually care whether automotive culture gets better or worse. That's why you're here.",
  },
  {
    type: "p",
    text: "Bring your build. Bring your perspective. Bring your corner of the community. We'll build the rest together.",
  },
  {
    type: "p",
    text: "**Welcome to the A&D Road & Trail Crew. Real people. Real builds. Street to trail.**",
  },
];
