"use client";

import { useState } from "react";
import { renderTranscriptBlocks } from "@/lib/transcriptRenderer";

/** One panel covering both the full episode description and the
 *  transcript — most visitors never open either (they're mainly here for
 *  SEO/GEO substance), so this stays a single low-key block rather than
 *  two separate CTAs. The tabs act as this section's header (no separate
 *  eyebrow needed) and sit above the bordered content box, not inside it.
 *  Both tab bodies always render in the markup (only the inactive one is
 *  visually hidden), so the full text is still present in the page's HTML
 *  regardless of which tab is active. */
export default function DescriptionTranscriptPanel({
  description,
  transcript,
}: {
  description?: string;
  transcript?: string;
}) {
  const [tab, setTab] = useState<"description" | "transcript">("description");
  const hasBoth = Boolean(description) && Boolean(transcript);

  return (
    <div>
      {hasBoth ? (
        <div className="desc-transcript-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "description"}
            className={`desc-transcript-tab${tab === "description" ? " active" : ""}`}
            onClick={() => setTab("description")}
          >
            Description
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "transcript"}
            className={`desc-transcript-tab${tab === "transcript" ? " active" : ""}`}
            onClick={() => setTab("transcript")}
          >
            Transcript
          </button>
        </div>
      ) : (
        <div className="eyebrow">{description ? "Description" : "Transcript"}</div>
      )}

      <div className="desc-transcript-panel mt-3">
        <div className="desc-transcript-body">
          {description && (
            <div hidden={hasBoth && tab !== "description"} style={{ whiteSpace: "pre-wrap" }}>
              {description}
            </div>
          )}
          {transcript && (
            <div hidden={hasBoth && tab !== "transcript"}>
              {renderTranscriptBlocks(transcript)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
