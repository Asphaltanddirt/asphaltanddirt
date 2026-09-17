"use client";

/**
 * Small shared pieces that make long forms easier to get through:
 * - FormBeforeYouStart: time estimate + "What you'll need" up front, so nobody
 *   finds out halfway that they need photos they don't have handy.
 * - DraftRestoredNotice: tells people their earlier answers came back (and that
 *   photos need adding again), with a way to start over.
 * - LegalShortVersion + FullTerms: legal wording never takes over the page
 *   (Jose, 2026-09-17). A plain-language summary shows first; the full text,
 *   word for word and unchanged, is one tap away. The summary is a reading
 *   aid only; the full terms are what people agree to.
 */

export function FormBeforeYouStart({ time, needs, note }: { time?: string; needs: string[]; note?: React.ReactNode }) {
  return (
    <aside className="form-before" aria-label="Before you start">
      {time && <p className="form-before-time">{time}</p>}
      <p className="form-before-heading">What you&apos;ll need</p>
      <ul className="form-before-list">
        {needs.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
      {note && <p className="form-before-note">{note}</p>}
    </aside>
  );
}

export function DraftRestoredNotice({
  onStartOver,
  hasPhotos = true,
  hasConfirmations = false,
}: {
  onStartOver: () => void;
  hasPhotos?: boolean;
  /** The form has agreement/confirmation boxes, which are never saved. */
  hasConfirmations?: boolean;
}) {
  return (
    <div className="form-draft-notice" role="status">
      <p>
        Welcome back. We filled in what you typed last time (saved on this device only).
        {hasPhotos && " Photos can't be saved, so add those again."}
        {hasConfirmations && " Tick the confirmation boxes again before you send."}
      </p>
      <button type="button" className="form-draft-reset" onClick={onStartOver}>
        Start over
      </button>
    </div>
  );
}

export function LegalShortVersion({ points, title = "The short version" }: { points: React.ReactNode[]; title?: string }) {
  return (
    <div className="legal-short">
      <p className="legal-short-title">{title}</p>
      <ul>
        {points.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
      <p className="legal-short-note">This is a plain-language summary to help. The full terms are what you agree to.</p>
    </div>
  );
}

export function FullTerms({
  label = "Read the full terms",
  children,
  defaultOpen = false,
}: {
  label?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="legal-full" open={defaultOpen || undefined}>
      <summary>{label}</summary>
      <div className="legal-full-body">{children}</div>
    </details>
  );
}
