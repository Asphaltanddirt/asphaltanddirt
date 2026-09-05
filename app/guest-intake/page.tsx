import type { Metadata } from "next";
import GuestIntakeForm from "@/components/GuestIntakeForm";

// Deliberately not linked from site nav or the sitemap — this is a direct
// link handed to a specific guest, not a public entry point.
export const metadata: Metadata = {
  title: "Guest Info",
  robots: { index: false, follow: false },
};

export default function GuestIntakePage() {
  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container" style={{ maxWidth: 640 }}>
        <h1>Coming On The Show?</h1>
        <p className="lead mt-2">
          Thanks for joining us — fill this out so we have everything we need for your episode.
          Nothing here gets published without your say-so; we&apos;ll follow up before anything goes live.
        </p>
        <div className="mt-4">
          <GuestIntakeForm />
        </div>
      </div>
    </section>
  );
}
