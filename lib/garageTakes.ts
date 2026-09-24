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
  /** Explicit headline line breaks; falls back to the punctuation split. */
  titleLines?: string[];
  /** Phrases in the summary that must not be split across lines. */
  keepTogether?: string[];
  transcript: string;
}

export const garageTakes: GarageTake[] = [
  {
    slug: "ko2-vs-ko3-vs-km3",
    title: "KO2 vs KO3 vs KM3: What Anthony's Buying Next",
    videoId: "3OfRavreR4Q",
    publishedAt: "2026-09-24",
    liveFrom: "2026-09-24",
    summary:
      "Anthony has put 26,000 miles on BFGoodrich KO2s. He'd consider KO3s, but the KM3 is probably his next tire, and he says the install and balance matter as much as the tire.",
    blogSlug: "bfgoodrich-ko3-reviews-upgrade-or-switch",
    transcript: `What's up, everybody? All right. Today we're gonna talk a little bit about the BFGoodrich KO3s.

So, I personally run the BFGoodrich KO2 tire on my 2025 Jeep Wrangler.

Roughly 26,000 miles on them. What I could say about the tire is great on-road tire. Never really had problems off-road with it. Great tire in the snow and in the wet weather. I know everybody talks about how the KO3 has a bunch of vibrations and that, you know, they can't balance them.

You know, based on my experience with the KO2s, I've got two friends that run them. You know, one of my buddies, he's on his fourth set, another buddy's on his third. No issues with the KO2s, no issues with the wall splitting.

The big problem that people do run into with sidewall splits and everything like that, is because people don't realize that there's different load range tires for different vehicles, right? So, like a load range C that's on a, let's say, Bronco Raptor or even my Jeep Wrangler. It's a softer compound tire than, let's say, a load range E or an F, right?

Now, if you're constantly airing up and airing down your tires and you're doing some serious off-roading and some serious rock crawling, you're probably gonna want to go a step up with, meaning, like, from a load range C to a load range D, right? That'll keep your sidewall a little bit stiffer. Now, if you're just a daily driver, like most of my driving is on-road driving, a good bit of off-road that I do do, the BFGoodrich tires have never let me down, right?

Listen, I could talk about Nittos. We had a Bronco with Nitto Ridge Grapplers out there. The thing was like, you know, like a cow on ice, just slipping and sliding, no traction, can't get up anywhere. Do they look good? Yeah, they look good, but they're useless.

To me, when I'm looking at a tire, I need this tire to be reliable on-road, reliable off-road. Like I said, in my experiences with the KO2s, great tire. Would I get the KO3s?

Personally, yes, only because I had a great experience with the KO2s. I actually, myself, had Toyo R/T Trail, and that tire was atrocious. In the wet weather, that truck was slipping all over the place. Off-road, the tire was great, meaning it climbed great, in the rock it did well, sand did well.

But as soon as I was on pavement and it was raining, I was slipping and sliding everywhere, where with the KO2s, rain does great. The past year that we had this crazy snowstorm, I was out there in the Jeep having a bunch of fun in the pines with the Jeep.

KO2s didn't let me down. As far as people say, airing up and airing down, I've probably aired down my tires, I don't know, 10, 15 times. I've yet to have an issue with my sidewalls, luckily. But my next tire is probably gonna be the BFG KM3.

It is one of my favorite tires. It looks good. It's knobby. They're not too loud, just like the KO2s, actually. 25,000 miles later, and there's no road noise compared to the DuraTracs. For example, the Goodyear DuraTracs, those things are just super noisy.

After, like, 15,000 miles, you hear the hum on them. They're not the best tire, honestly. I've had those tires give up in the snow. I've had those tires let me down in the sleet. I've had those tires even let me down in dirt. Right. So my personal take on the BFG KO2, KO3, great tire.

When it comes down to the balancing issue, a lot of people just go get your regular balance done. Bigger tires do require being road-force balanced, which not many shops do. So that's also a big problem because my KO2s, no issues, no rattle, no shake, no wobble. They are road-force balanced, though, so try that out before you guys badmouth the tire.

Or you guys also gotta make sure that your installer is putting the tire on right. There are marks on a tire, which is a high side and a low side. So if your installer isn't installing them right, you will also have a shake.

Other than that, guys, we'll catch you on the next one.`,
  },
  {
    slug: "c6-z06-ls7-pull-the-heads-or-keep-driving",
    title: "C6 Z06 LS7: Pull the Heads or Keep Driving?",
    videoId: "V9D4LT3rT9M",
    publishedAt: "2026-09-24",
    liveFrom: "2026-09-24",
    summary:
      "A C6 Z06's LS7 runs fine. Anthony wouldn't pull the heads for the valve guides; he'd drive it and watch for symptoms. The blog makes the case for measuring anyway.",
    blogSlug: "c6-z06-valve-issues-fix-an-ls7-that-runs-fine",
    transcript: `All right, guys. Welcome back, everybody. Let's talk a little bit about the valve issues in the C6 Z06 Corvette, right? So the big discussion is, is, You know, would you dig into your C6 Z06 Vette, LS7, before you have an issue with the valves?

So my take on this is, there are things that are called preventive maintenance, right? And then there's things called abuse on a car, and then we break them, and then we're gonna sit there and cry about it, right? So, The valve issues on the C6, in my opinion, right, they've been—the C6 has been around for quite some time.

The reason that people are like, "Oh, well, I have a valve issue," right? Nobody buys a Corvette to, you know, drive it nicely. Nobody buys a Corvette to, you know, not have fun with it, right? If I'm buying a Corvette, I promise you I'm revving it high.

I'm constantly gonna be running it— not constantly, but for the most part. I'm buying it to have fun, right? I'm not looking to grandpa it around. That's where people start breaking things, right? Now there's reports, 88,000 miles, you know, "My valves went bad and my head cracked." Listen, 88,000 miles out of essentially a sports car, you did pretty good, in my opinion, right?

You were able to keep it in one piece for 88,000 miles, where most sports cars, you probably break them in the first 10, 15,000 miles. So now, my personal take on would you dig into your C6 Z06, right, and fix a problem, or what people think is a problem? Would you get—go in there and replace the valves before they break?

Me? No. Why? Just because somebody had a problem means I'm gonna have the same problem? If that was the case, guys, then, oh my God, we better get rid of all of our vehicles, because guess what? Every car has all the issues in the world that you can think of, and it all comes down to maintenance, maintenance, maintenance.

You don't beat on the car and you maintain it, it'll last you longer. You drive it like you stole it, like it's meant to be driven, you're gonna break it sooner than later. Um, there's nothing wrong with that, though. That's what you bought the car for.

Have fun. Beat on it. Destroy it. Break it. Fix it. And do it all over again, right? Some people, and it's very— some very slim amounts of people, right? They buy a car, 5,000 miles, they baby it, you know, valves go bad. It happens, right?

Manufacturers are not perfect. No manufacturer's perfect. Especially today's day and age. Ford's got its issues. GM's got its issues. Honda's got its issues. Honda's using GM, for—for crying out loud.

Every car manufacturer has their issues, some more than others, some less than others, right? Now, what are we talking about? We're talking about specifically the C6 Z06, and would we dig into it if we don't have a problem? Would we start looking for one? No. I'm not gonna start digging into it until it's broken, or I start getting signs that it's running poorly, running incorrectly, or there are some type of actual mechanical issues.

Up until then, I'm gonna sit there and enjoy and drive the car. That's just me. Now, some guys, right, they're sitting at home after dinner, scrolling on TikTok, Facebook, one of the forums, or whatever it may be, and they're like, "Oh my God, look at this.

My C6 only got 30,000 miles, but this guy, you know, at 15,000 miles said he had an issue with his valves, and he went out and replaced them." He might want to go and replace them. But in my opinion, that's a waste of money. Wait till you have to replace them, if you ever do.

For all you know, you might not need to replace them. So why spend the money unless you already have signs that, you know, that it's failing, that you need to do some type of work? But other than that, don't touch what's not broken.

Don't try and fix a problem that's not there. And everything will be all right. And enjoy your C6s, guys. Have fun.

## A correction

At 1:15 Anthony mentions an 88,000-mile car with failed valves. The owner report in our blog says those heads checked within GM spec at 88,000 miles, so that's a different story. If you know the car he means, tell us.`,
  },
  {
    slug: "would-you-daily-an-e36-m3",
    title: "Would You Daily an E36 M3? Anthony's Honest Take",
    videoId: "zAFPyxzNkuM",
    publishedAt: "2026-09-17",
    liveFrom: "2026-09-17",
    summary:
      "Anthony would happily park an E36 M3 in the garage. Asking it to handle Monday morning is where his answer changes \u2014 and where a 370Z enters the conversation.",
    blogSlug: "e36-m3-ownership-would-you-daily-one",
    keepTogether: ["is where"],
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
    liveFrom: "2026-09-17",
    summary:
      "Roof whistle starts the conversation, then Anthony gets into Bronco versus Wrangler: cabin space, daily driving, trail width, removable roofs and the aftermarket.",
    blogSlug: "bronco-hardtop-wind-noise-diagnose-before-you-buy",
    titleLines: ["Bronco Hardtop Wind Noise:", "Anthony's Take on the", "Bronco vs. Jeep Debate"],
    keepTogether: ["cabin space"],
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
/** Break a take title onto two lines at its question mark or colon, so the
 *  headline doesn't wrap mid-thought. Returns one line if there's no break. */
/** The summary with its keepTogether phrases bound by non-breaking spaces, so
 *  a line breaks before the phrase instead of inside it. The stored summary
 *  stays plain for metadata and feeds. */
export function takeSummaryForDisplay(take: GarageTake): string {
  return (take.keepTogether ?? []).reduce(
    (text, phrase) => text.split(phrase).join(phrase.replace(/ /g, "\u00A0")),
    take.summary,
  );
}

export function takeTitleLines(take: GarageTake): string[] {
  if (take.titleLines?.length) return take.titleLines;
  const m = take.title.match(/^(.*?[?:])\s+(.+)$/);
  return m ? [m[1], m[2]] : [take.title];
}

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
