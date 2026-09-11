import type { Metadata } from "next";
import Link from "next/link";
import ManageForm from "@/components/ManageForm";
import { getSubscriberByToken } from "@/lib/newsletterSubscribers";

export const metadata: Metadata = {
  title: "Manage Preferences",
  robots: { index: false, follow: false },
};

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const subscriber = token ? await getSubscriberByToken(token) : null;

  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container legal-page">
        <h1>Manage Preferences</h1>
        {!token || !subscriber ? (
          <>
            <p>This link isn&apos;t recognized — it may be out of date.</p>
            <p>
              <Link href="/subscribe" className="btn btn-primary" style={{ marginTop: "var(--sp-3)" }}>
                Subscribe Instead
              </Link>
            </p>
          </>
        ) : (
          <>
            <p>{subscriber.email}</p>
            <ManageForm token={token} initialTopics={subscriber.topics} />
          </>
        )}
      </div>
    </section>
  );
}
