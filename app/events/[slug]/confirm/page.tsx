import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventBySlug } from "@/lib/events";
import { getRsvpForConfirm, verifyReconfirmLink } from "@/lib/rsvpReconfirm";
import RsvpConfirmButtons from "@/components/RsvpConfirmButtons";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Does the new date work? | Asphalt & Dirt",
  robots: { index: false, follow: false },
};

const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

/**
 * "Does the new date work?" — one tap, from the postponement email.
 *
 * Deliberately NOT a form and NOT a login. Their waiver is already signed and
 * stays on file; the only open question is whether they can make the new day.
 * Asking for anything more would be asking them to do the registration again,
 * which is exactly what Jose said not to do.
 */
export default async function ReconfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ id?: string; d?: string; t?: string }>;
}) {
  const { slug } = await params;
  const { id, d, t } = await searchParams;

  const event = await getEventBySlug(slug, { includeCrewOnly: true }).catch(() => null);
  if (!event) notFound();

  const ok = verifyReconfirmLink(id, d, t);
  const rsvp = ok && id ? await getRsvpForConfirm(id).catch(() => null) : null;

  if (!ok || !rsvp) {
    return (
      <section className="section-pt-tight section-pb-tight">
        <div className="container" style={{ maxWidth: 560, marginInline: "auto" }}>
          <div className="eyebrow accent">Asphalt &amp; Dirt</div>
          <h1 className="mt-2">That link didn&apos;t work</h1>
          <p className="lead mt-2">
            It may have been for an earlier date, or copied from somewhere it broke. Reply to the email we sent and
            we&apos;ll sort it out.
          </p>
        </div>
      </section>
    );
  }

  const newDate = d as string;
  const alreadyAnswered = rsvp.answeredFor === newDate ? rsvp.answer : "";

  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container" style={{ maxWidth: 560, marginInline: "auto" }}>
        <div className="eyebrow accent">{event.title.trim()}</div>
        <h1 className="mt-2">Does {formatDate(newDate)} work?</h1>
        <p className="lead mt-2">
          Hey {rsvp.name.split(/\s+/)[0] || "there"} — we had to move this one. Your waiver is already on file, so
          there&apos;s nothing to fill in again. Just let us know if the new day works.
        </p>

        <RsvpConfirmButtons
          id={rsvp.id}
          slug={slug}
          date={newDate}
          token={t as string}
          initial={alreadyAnswered}
        />
      </div>
    </section>
  );
}
