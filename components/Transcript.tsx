// Renders an episode's cleaned Riverside transcript. Two light conventions:
// a line starting with "## " becomes a segment heading, and a paragraph
// starting with "Name: " bolds the speaker's name. See the `transcript`
// field doc on Episode (lib/episodes.ts) for the authoring convention.
function renderTranscriptBlocks(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((block, i) => {
      if (block.startsWith("## ")) {
        return <h3 key={i}>{block.slice(3).trim()}</h3>;
      }
      const speakerMatch = block.match(/^([A-Za-z][A-Za-z .'-]{0,30}):\s*([\s\S]*)$/);
      if (speakerMatch) {
        return (
          <p key={i}>
            <strong>{speakerMatch[1]}:</strong> {speakerMatch[2]}
          </p>
        );
      }
      return <p key={i}>{block}</p>;
    });
}

export default function Transcript({ text }: { text: string }) {
  return (
    <details className="transcript-details">
      <summary>Show Full Transcript</summary>
      <div className="transcript-body mt-3">{renderTranscriptBlocks(text)}</div>
    </details>
  );
}
