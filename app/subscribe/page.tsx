import type { Metadata } from "next";
import SubscribeForm from "@/components/SubscribeForm";
import { ALL_TOPICS, type Topic } from "@/lib/newsletterSubscribers";

export const metadata: Metadata = {
  title: "Subscribe",
  description: "Get The Dirt Line newsletter and/or event updates from Asphalt & Dirt — no Facebook required.",
};

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; source?: string; returnTo?: string }>;
}) {
  const { topic, source, returnTo } = await searchParams;
  const requestedTopic = ALL_TOPICS.find((t) => t.toLowerCase() === topic?.toLowerCase()) as Topic | undefined;
  const defaultTopics = requestedTopic ? [requestedTopic] : ["Newsletter"];
  // Only ever send them back to a path on this site — never an absolute URL
  // (which could be attacker-supplied via the query string).
  const safeReturnTo = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : undefined;

  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container legal-page">
        <h1>Stay In The Loop</h1>
        <p>
          Pick what you want to hear about — the weekly newsletter, event updates, or both. You can
          change this anytime from the link at the bottom of any email.
        </p>
        <SubscribeForm
          source={source || "subscribe_page"}
          defaultTopics={defaultTopics}
          returnTo={safeReturnTo}
        />
      </div>
    </section>
  );
}
