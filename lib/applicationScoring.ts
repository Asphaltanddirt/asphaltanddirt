/** Road & Trail Crew application scoring. Safe to import on the client. */

/** The six review scores (1 to 5 each), with the weights Airtable's
 *  "Weighted Score" formula uses. Keep the two in step. */
export const SCORE_CATEGORIES = [
  { key: "brand", field: "Score: Brand & Culture Alignment", label: "Brand & culture fit", weight: 25, hint: "Do they get what A&D stands for: real builds, street to trail, done right?" },
  { key: "content", field: "Score: Content Quality", label: "Content quality", weight: 20, hint: "Photos, video and posts: would we be proud to share them?" },
  { key: "community", field: "Score: Community Involvement", label: "Community involvement", weight: 20, hint: "Clubs, events, meets, helping people out." },
  { key: "engagement", field: "Score: Engagement & Trust", label: "Engagement & trust", weight: 15, hint: "Real followers who talk back, not just numbers." },
  { key: "reliability", field: "Score: Reliability & Communication", label: "Reliability & communication", weight: 10, hint: "Clear, complete application; easy to reach." },
  { key: "geo", field: "Score: Geographic Audience Value", label: "Where their audience is", weight: 10, hint: "Reaches areas and people we want to grow in." },
] as const;
export type ScoreKey = (typeof SCORE_CATEGORIES)[number]["key"];
export type Scores = Record<ScoreKey, number | null>;

/** Same math as Airtable's Weighted Score: blank until all six are scored. */
export function weightedScore(scores: Scores): number | null {
  let total = 0;
  for (const c of SCORE_CATEGORIES) {
    const v = scores[c.key];
    if (!v) return null;
    total += (v / 5) * c.weight;
  }
  return Math.round(total * 10) / 10;
}

/** Same bands as Airtable's Suggested Decision Band. A suggestion only. */
export function suggestedBand(score: number | null): string {
  if (score === null) return "";
  if (score >= 90) return "Exceptional candidate";
  if (score >= 75) return "Accept";
  if (score >= 55) return "Hold / second review";
  return "Decline";
}

