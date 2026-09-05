import Script from "next/script";

// Show-wide podcast ID on Buzzsprout — constant across every episode.
const BUZZSPROUT_PODCAST_ID = "2641565";

/** Buzzsprout's "small" single-episode player. Renders as a div Buzzsprout's
 *  own script fills in client-side, styled to match brand orange (#F86000)
 *  from the Embed Player builder in the Buzzsprout dashboard. The src is
 *  unique per episode ID, so Next re-fetches/re-runs it on every episode
 *  page rather than reusing a cached script from a different episode. */
export default function BuzzsproutPlayer({ episodeId }: { episodeId: string }) {
  const containerId = `buzzsprout-small-player-episode-id-${episodeId}`;

  return (
    <>
      <div id={containerId} />
      <Script
        src={`https://www.buzzsprout.com/${BUZZSPROUT_PODCAST_ID}/episodes/${episodeId}.js?container_id=${containerId}&player=small`}
        strategy="afterInteractive"
      />
    </>
  );
}
