/** Clean, word-boundary-safe excerpt for card previews — e.g. raw YouTube
 *  descriptions, which vary wildly (blank first line, one giant paragraph,
 *  no punctuation for a while). Never trust a naive `.split("\n")[0]` on
 *  user/creator-authored text; this normalizes whitespace first so an empty
 *  leading line doesn't produce a blank card, and a wall of text doesn't
 *  blow past the card's intended size. */
export function excerpt(text: string, maxLength = 140): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const cut = normalized.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
