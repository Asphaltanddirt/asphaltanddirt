import type { Metadata } from "next";
import Link from "next/link";
import { rallyLive } from "@/lib/rally";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Rally Rewards rules", robots: rallyLive() ? undefined : { index: false, follow: false } };
}

/** Plain summary first, full rules one tap away (site rule 2026-09-17).
 *  Draft from 2026-10-04: Jose reviews before launch. */
export default function RallyRulesPage() {
  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container legal-page">
        <h1>Rally Rewards: the rules</h1>
        <h2>The short version</h2>
        <p>Show up, earn points, trade them for gear you can&apos;t buy.</p>
        <ul>
          <li><strong>10 points</strong> for every A&amp;D event you come to (asphalt or dirt). Special events count double.</li>
          <li><strong>5 points</strong> to start, 5 in your birthday month, and 5 for a store order (once a month).</li>
          <li>Spend them in the locker: gear you can&apos;t buy, and at 250, an A&amp;D experience.</li>
          <li>Points never expire. Your rank (Rookie, Regular, Mainstay, Legend) comes from every point you&apos;ve ever earned, so spending never lowers it.</li>
          <li>18+. The points board shows your first name and last initial; you can opt out.</li>
        </ul>
        <p><strong>EARNED. NOT GIVEN.</strong></p>

        <details>
          <summary>Full rules</summary>
          <h3>Who can join</h3>
          <p>Anyone 18 or older. One person, one email, one account. Your account is made the first time you RSVP, subscribe or order, and you sign in with a link we email you. The A&amp;D founding team doesn&apos;t earn points.</p>
          <h3>Earning</h3>
          <ul>
            <li>Events: 10 points per A&amp;D event listed on our Events page, once you&apos;re recorded as there: checked in on the day, or confirmed with &ldquo;I was there&rdquo; in the thank-you email. Events we mark as special earn 20. Passengers and walk-ups earn once they&apos;re recorded with a signed waiver. Someone we mark as not there earns nothing for that event.</li>
            <li>Head start: 5 points when your account is made.</li>
            <li>Birthday: 5 points in your birth month. We ask month and year only.</li>
            <li>Store: 5 points per order from our store, up to one order a month. A cancelled or refunded order takes its points back.</li>
            <li>Points start with the A&amp;D Community Mud Run (October 17, 2026). Earlier events don&apos;t earn points.</li>
          </ul>
          <h3>Ranks</h3>
          <p>Rookie from your first point, Regular at 50, Mainstay at 150, Legend at 300 lifetime points. Legends are earned two ways: 300 lifetime points, or named by the founders for what they&apos;ve given the community. Rank gear: you can claim gear for your rank or any rank below it.</p>
          <h3>Spending</h3>
          <p>Pick anything in the locker you have enough points for; its points come off your balance. Gear ships from our store and you pay the shipping. Locker items are earn-only and their designs change each year; a claim gets the current design. The 250-point experience is all of it together: you pick the ride, you lead it, you get featured in the photos and video from it, and your story runs in our newsletter. We arrange it with you.</p>
          <h3>The fine print</h3>
          <p>Points have no cash value and can&apos;t be sold, transferred or swapped for money. We can add items to the locker; prices in the locker don&apos;t go up. We can correct points earned by mistake and close accounts that abuse the program. If we ever change or end the program, we&apos;ll email you at least 30 days before, and you&apos;ll have that time to spend your points.</p>
          <h3>Your info</h3>
          <p>We keep your name, email, birth month and year, the events you came to and your points. It&apos;s used only to run Rally Rewards and is never sold. See our <Link href="/privacy-policy">Privacy Policy</Link>.</p>
          <p>Questions: <a href="mailto:crew@asphaltanddirt.com">crew@asphaltanddirt.com</a></p>
        </details>
        <p className="mt-4"><Link href="/rally">Back to Rally Rewards</Link></p>
      </div>
    </section>
  );
}
