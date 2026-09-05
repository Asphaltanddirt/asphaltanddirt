// Generic collapsed-by-default section, styled to match Transcript's
// <details> so "Read Full Description" and "Show Full Transcript" look
// like one consistent pattern on the episode page.
export default function ExpandableSection({
  summary,
  children,
}: {
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <details className="transcript-details">
      <summary>{summary}</summary>
      <div className="transcript-body mt-3">{children}</div>
    </details>
  );
}
