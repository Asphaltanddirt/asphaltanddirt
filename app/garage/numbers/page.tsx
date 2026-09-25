import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageNumbers from "@/components/GarageNumbers";
import { getSession } from "@/lib/garageAuth";
import { canSeeControlRoom } from "@/lib/garageControl";
import { getNumbers } from "@/lib/garageNumbers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Numbers · A and D Garage",
  robots: { index: false, follow: false },
};

/** Garage → Numbers (punchlist #9). Jose only for now (9/25): it carries
 *  merch revenue, and it's easier to get right for one reader first. */
export default async function GarageNumbersPage() {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeControlRoom(session)) redirect("/garage");
  const numbers = await getNumbers();

  return (
    <div className="garage">
      <GarageBack title="Numbers" />
      <div className="garage-body">
        <h1 className="garage-event-title">Numbers</h1>
        <p className="garage-event-area">What changed, not what happened. Filled by the Monday and daily crons.</p>
        <GarageNumbers numbers={numbers} />
      </div>
    </div>
  );
}
