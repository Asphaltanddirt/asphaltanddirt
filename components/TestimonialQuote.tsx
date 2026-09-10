"use client";

import { useState } from "react";

// Long reviews get clamped to a preview with an inline "Read more" — only
// where the grid passes expandable (currently the home-page 3-up).
const CLAMP = 160;

export default function TestimonialQuote({
  quote,
  expandable = false,
}: {
  quote: string;
  expandable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const needsClamp = expandable && quote.length > CLAMP + 20;

  const shown = needsClamp && !open ? `${quote.slice(0, CLAMP).trimEnd()}…` : quote;

  return (
    <p className="testimonial-quote">
      &ldquo;{shown}&rdquo;
      {needsClamp && (
        <button type="button" className="testimonial-more" onClick={() => setOpen((v) => !v)}>
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </p>
  );
}
