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
  vercelTrack(eventName, props);
}
