import Link from "next/link";

/**
 * Replaces the old inline "email + Subscribe" capture across the site — one
 * click lands on /subscribe, where people pick Newsletter and/or Event
 * Updates and (optionally) give a name/phone. Keeps the same `source`
 * attribution the old inline form used for segmentation.
 */
export default function SubscribeButton({
  source,
  topic,
  returnTo,
  label = "Subscribe",
  className = "btn btn-primary",
}: {
  source: string;
  topic?: "Newsletter" | "Event Updates";
  /** Path to send them back to once they've signed up (e.g. "/blog"). */
  returnTo?: string;
  label?: string;
  className?: string;
}) {
  const params = new URLSearchParams({ source });
  if (topic) params.set("topic", topic);
  if (returnTo) params.set("returnTo", returnTo);
  return (
    <Link href={`/subscribe?${params.toString()}`} className={className}>
      {label}
    </Link>
  );
}
