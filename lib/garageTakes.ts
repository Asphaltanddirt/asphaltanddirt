import { getPostBySlug, type BlogPost } from "@/lib/blog";

/**
 * Garage Takes — Anthony's weekly vlog, one per blog post. Same model as
 * lib/blog.tsx: the list lives here in code, each take gets its own page at
 * /garage-takes/[slug] with the video, the story link and a transcript.
 *
 * Weekly routine: vlogs go up on YouTube as Unlisted on Thursday for the
 * newsletter, then Public on Friday. `liveFrom` is that Friday — a take only
 * shows on the site from that date, so the site never gets ahead of the
 * newsletter. Transcript convention matches episodes (see lib/episodes.ts):
 * blank line between paragraphs, "## " for a section heading.
 */
export interface GarageTake {
  slug: string;
  title: string;
  videoId: string;
  /** YouTube upload date (ISO). */
  publishedAt: string;
  /** The date it goes public on the site (Friday of that week). */
  liveFrom: string;
  summary: string;
  /** The companion blog post's slug, when there is one. */
  blogSlug?: string;
  transcript: string;
}

export const garageTakes: GarageTake[] = [
  {
    slug: "would-you-daily-an-e36-m3",
    title: "Would You Daily an E36 M3? Anthony's Honest Take",
    videoId: "zAFPyxzNkuM",
    publishedAt: "2026-09-17",
    liveFrom: "2026-09-18",
    summary:
      "Anthony would happily park an E36 M3 in the garage. Asking it to handle Monday morning is where his answer changes \u2014 and where a 370Z enters the conversation.",
    blogSlug: "e36-m3-ownership-would-you-daily-one",
    transcript: `Alright, so for this week, we got a topic of, would you daily drive an E36 M3? E36 M3, awesome car, raw driving feel. That inline 6, true M3. great car, overall.

would I daily drive one specifically? No. Would I like to have one in the garage? Yes, but at the same time, in today's day and age, there's plenty of other vehicles that you can pick up for, you know, a fraction of the price when we're talking about a clean E36 M3.

Uh, you can pick up a 370Z, for example, right? Uh, much cheaper, much more reliable. We can all agree JDM, right? Much more reliable than German power.

Um, is it as fun as an M3? Probably not, but I can, you can make it fast for, you know, a fraction of the cost that you can with the M3. Maintenance wise, it's a lot cheaper than the M3, easier to access parts. there's a bunch of aftermarket parts out there available for the 370Z.

I'm sure there's quite a bit available for the E36 M3 as well. it's just not as much. Prices cost more harder to find. you know, a lot of mechanics aren't really versed in the older vehicles compared to, you know, like something like a 370 or some kind of like, you know, G37 or some kind of VQ or, you know, some type of JDM, newer JDM, or something compared to a Bimmer, right?

New Bimmers, you're taking them to a mechanic, new mechanics that you're going to be taking into is probably going to be the dealership because everything's computerized. Even though the E36 M3 is not computerized. as far as it being a daily driver, definitely not, not the most reliable thing out there. you'd want it to be a weekend car.

You'd want to have a second car that you can daily drive that's more reliable. as far as fun, there is nothing, there's not going to be a car that's going to be funner to drive. Because again, that BMW rear wheel drive feel that's 6MT. Uh, but like I said, reliability wise, big question there, fun wise, no questions.

but again, what you're paying for a clean E36 versus what you're paying for a clean 370Z is day and night, right? Uh, so my personal preferences is would I daily drive one? No. Would I like to have one?

Yes. Would I weekend drive it? Probably yes. More so.

it's the older M3, uh, great fun car. Would not mind owning one. Uh, the 370Z though, something to think about because again, you know, you could buy one for 15, 20 grand with 70K miles, throw a ProCharger on it, throw some big brakes on it. If you didn't get the, you know, get a sport, let's say with the big brake kit in it, you can get, you know, 500, 600 horses out of there, which in my eyes is a baby GT-R.`,
  },
  {
    slug: "bronco-hardtop-wind-noise-bronco-vs-jeep",
    title: "Bronco Hardtop Wind Noise: Anthony's Take on the Bronco vs. Jeep Debate",
    videoId: "Pxl5XvuNZgM",
    publishedAt: "2026-09-17",
    liveFrom: "2026-09-18",
    summary:
      "Roof whistle starts the conversation, then Anthony gets into Bronco versus Wrangler: cabin space, daily driving, trail width, removable roofs and the aftermarket.",
    blogSlug: "bronco-hardtop-wind-noise-diagnose-before-you-buy",
    transcript: `Well, well, well, guys, what do we have? An interesting topic. Everyone's talking about the, uh, new Ford Broncos. Everyone's finally realizing that, you know, they are actually whistling in certain areas, whether it be the seals around the roof or the C-pillars.

Uh, you know, all cars have their issues, right? Um, my personal take on the Bronco, they look good with the bigger wheels and everything like that. Um, you know, but they are still IFS, a glorified Jeep. Uh, my personal opinion, right?

Uh, it's a lot smaller inside, right? I'm six foot five. I fit in the JL a lot better than I do fit in a Bronco Raptor. Um, but, you know, most Ford guys, they, uh, they love, love saying how Jeep is garbage and how they leak and there's wind noise.

Well, guess what, Ford guys? The leak caught you too. Um, all cars are going to have their issues. Some less than others, some more than others, right?

Bronco and Jeep, people are always going to say, Oh, the Bronco is better. The Jeep is better. But there are two completely different cars, right? One is a glorified Jeep mall crawler, right?

IFS. Um, again, cool car, right? Probably funner than an everyday car cause you can remove the doors on it. You can remove the roof on it, just like you can with the Jeep, but the Jeep does have that solid front axle.

Um, yes, of course you can put portals on it and drop 20 grand under your $90,000 truck and you can put, you know, 40s on it. Um, the other thing is, is right. The Raptor does come with the 37s, but it's super wide for the Northeast. Um, do I personally like the Raptor?

Yes. Would I drive one? Yeah, probably, but only the Raptor. Um, but other than that really, right?

I feel like this finally is starting to solve some sort of debates here between, you know, the roofs on Jeeps leak and well, yours seeps air. Um, again, you know, every car make is going to have their issues, whether it's going to be the Bronco, whether it's going to be the Ford, whether it's going to be the Jeep, whether it's going to be Toyota, right? Um, at the end of the day, it's, you know, what you prefer, what you like, what you're using the vehicle for, right? Not everybody is getting a Jeep with the intent to off-road it.

So that person would probably prefer a Bronco. It drives better. It's smoother. It's more of an enjoyable ride.

Still gives you the option to take the doors off, the roof off. Um, as far as aftermarket, right? Jeep's been around for so long, meaning the Wrangler, right? I'm, I'm not saying the Bronco hasn't been around, the new, we all know the new Bronco is not the old Bronco.

Um, the new Broncos are pretty fairly new, right? They just came around not too long ago. So there's not much aftermarket for them as much as there is for the Jeeps. Um, which I also feel like kind of makes the Jeep more of a toy opposed to the Broncos.

Kind of like you're gonna, you're not going to do as much modifications as you would with the Jeep because the Jeep parts are more accessible. There's a lot more variation of different things for them. Um, but yeah, you know, as far as Bronco guys and Jeep guys going back and forth, uh, hate to say it, but it's only a matter of time before the Bronco issue starts to show like they're starting to show now, right? The Jeep issues are so prominent because they've been around for so long, because there's so many of them out there on the road.

The more Broncos there are on the road, the more people start to get them, the more people start to use them, the more we're going to start learning about their issues, right? So for you Ford guys, you guys are not better than us. You guys are still leaking and you guys are just glorified Jeeps, but we still love you. You guys are still always welcome.

Um, again, each car is made for a different person. Each car is made for a different type of use. I personally have a Wrangler. I love it.

I wouldn't trade it for a Bronco, but that is because I plan on going big. I do plan on doing some serious off-roading with it. Um, in some tight trails where exactly the Bronco wouldn't exactly fit, which is another big downside in my eyes to the Bronco Raptor. Other than that guys, see you later.

Catch you on the next one.`,
  },
];

/** Takes whose Friday has arrived, newest first. */
export function publishedGarageTakes(today = new Date().toISOString().slice(0, 10)): GarageTake[] {
  return garageTakes
    .filter((t) => t.liveFrom <= today)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getGarageTakeBySlug(slug: string, today = new Date().toISOString().slice(0, 10)): GarageTake | undefined {
  return publishedGarageTakes(today).find((t) => t.slug === slug);
}

export function takeCompanionPost(take: GarageTake): BlogPost | undefined {
  return take.blogSlug ? getPostBySlug(take.blogSlug) : undefined;
}

/** The take that goes with a blog post, for the "watch the take" box. */
export function takeForPost(blogSlug: string, today = new Date().toISOString().slice(0, 10)): GarageTake | undefined {
  return publishedGarageTakes(today).find((t) => t.blogSlug === blogSlug);
}
