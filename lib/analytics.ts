import { track as vercelTrack } from "@vercel/analytics";

/**
 * Analytics event helper. Provider: Vercel Analytics — cookieless, already
 * covered under the Vercel Pro plan, no consent-banner needed. The <Analytics />
 * component (app/layout.tsx) handles pageviews/visitors/referrers automatically;
 * this covers custom named events.
 *
 * Event names follow the taxonomy from the podcast/video experience spec:
 * listen_start, youtube_embed_play, watch_on_youtube_click, platform_link_click,
 * newsletter_signup, sponsor_link_click, affiliate_link_click,
 * event_registration_click, merch_link_click.
 *
 * Never fire listen_start or a "watch" event just because the page/player loaded —
 * only on a genuine user action (clicking play, not merely rendering the player).
 */
export function track(eventName: string, props: Record<string, string | number | boolean | undefined> = {}) {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[analytics]", eventName, props);
    return;
  }
  // Vercel's <Analytics /> sets up window.va inside a Suspense boundary, so on a
  // first page load it can mount after components that track right away (e.g.
  // UtmLanding) — and its track() silently drops events when window.va isn't
  // there yet. This is the same queue shim @vercel/analytics installs itself:
  // early events wait in window.vaq and are sent once the script loads.
  const w = window as unknown as { va?: (...params: unknown[]) => void; vaq?: unknown[][] };
  if (!w.va) {
    w.va = (...params: unknown[]) => {
      (w.vaq = w.vaq || []).push(params);
    };
  }
  vercelTrack(eventName, props);
}
