import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageWeeklySocials from "@/components/GarageWeeklySocials";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { getWeeklySocials } from "@/lib/weeklySocials";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Weekly Socials · A and D Garage",
  robots: { index: false, follow: false },
};

/** Garage → Weekly Socials (punchlist #10). Owners only. */
export default async function GarageSocialsPage() {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeOwnerOnly(session)) redirect("/garage");
  const state = await getWeeklySocials();

  return (
    <div className="garage">
      <GarageBack title="Weekly Socials" />
      <div className="garage-body">
        <h1 className="garage-event-title">Weekly Socials</h1>
        <p className="garage-event-area">
          Week of {state.monday}. The three numbers we can&apos;t pull automatically. YouTube, Instagram and the Facebook
          Page fill themselves every Monday.
        </p>
        <GarageWeeklySocials state={state} />
      </div>
    </div>
  );
}
