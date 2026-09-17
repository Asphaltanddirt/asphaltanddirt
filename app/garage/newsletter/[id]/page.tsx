import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import GarageStudioForm from "@/components/GarageStudioForm";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { getStudioRecord } from "@/lib/garageStudio";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Newsletter issue · A and D Garage",
  robots: { index: false, follow: false },
};

export default async function GarageNewsletterIssuePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeOwnerOnly(session)) redirect("/garage");
  const { id } = await params;
  const issue = await getStudioRecord("issues", id).catch(() => null);
  if (!issue) notFound();
  const weekOf = String(issue.values.weekOf || "");

  return (
    <div className="garage">
      <GarageBack title="Issue" back={{ href: "/garage/newsletter", label: "Newsletter" }} />
      <div className="garage-body">
        <h1 className="garage-event-title">
          Week of {weekOf ? new Date(`${weekOf}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric" }) : "(no date)"}
        </h1>
        {issue.group === "Sent" ? (
          <p className="garage-form-note garage-warn">Already sent. Changes here are kept for the record but don&apos;t resend it.</p>
        ) : (
          <p className="garage-form-note">Fill in what you have. Anything blank uses the automatic pick described under it.</p>
        )}
        <GarageStudioForm tableKey="issues" record={issue} linkOptions={{}} />
      </div>
    </div>
  );
}
