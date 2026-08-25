/**
 * Analytics event stub. Not wired to a real provider yet — that's a deliberate
 * separate decision (GA4 / Plausible / etc.), not something to pick silently.
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
  }
  // TODO: forward to a real analytics provider once one is chosen.
}
