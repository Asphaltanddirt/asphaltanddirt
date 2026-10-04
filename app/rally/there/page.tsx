import type { Metadata } from "next";
import { verifyWasThere } from "@/lib/rallyAuth";
import { WasThereButton } from "@/components/RallyAccount";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "I was there | Rally Rewards",
  robots: { index: false, follow: false },
};

/** From the thank-you email (events without Tailgate). Asks first; the
 *  button records it, never the page load (mail scanners open links). */
export default async function WasTherePage({ searchParams }: { searchParams: Promise<{ s?: string; id?: string; t?: string }> }) {
  const { s, id, t } = await searchParams;
  const ok = verifyWasThere(s, id, t);
  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container" style={{ maxWidth: 560, marginInline: "auto" }}>
        <div className="eyebrow accent">Rally Rewards</div>
        {ok && s && id && t ? (
          <>
            <h1 className="mt-2">Were you there?</h1>
            <p className="lead mt-2">Tap the button and the event&apos;s Rally Points go on your account.</p>
            <WasThereButton s={s} id={id} t={t} />
          </>
        ) : (
          <>
            <h1 className="mt-2">That link didn&apos;t work</h1>
            <p className="lead mt-2">It may have been broken when it was copied. Reply to the email we sent and we&apos;ll sort it out.</p>
          </>
        )}
      </div>
    </section>
  );
}
