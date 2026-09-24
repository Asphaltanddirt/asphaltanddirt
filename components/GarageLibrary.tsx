"use client";

import { useMemo, useState } from "react";
import { DOWNLOAD_LIMIT_BYTES, EVENT_TYPES } from "@/lib/mediaKinds";

/**
 * Garage → Library: every filed clip and photo, searchable on a phone, so
 * nobody on the team ever has to open Google Drive to find or save footage.
 *
 * All filtering happens here in the browser. The whole library is a few
 * hundred small rows, which is one quick Airtable read on the server; after
 * that, every tap on a chip is instant, even on bad event-day signal, instead
 * of a round trip per tap.
 *
 * Show what's there, never what was planned: the chips are built from the
 * values the rows actually carry (a Venue Type nobody has shot at yet doesn't
 * get a chip), and each shows how many clips it would leave.
 */

export interface LibraryItem {
  id: string;
  fileId: string;
  fileName: string;
  /** Already read through displayKind(), so old "Vlog" rows say Garage Take. */
  kind: string;
  label: string;
  uploadedBy: string;
  uploadedAt: string;
  keywords: string;
  eventType: string;
  venueTypes: string[];
  size: number;
  driveLink: string;
}

type Range = "month" | "3months" | "all";
const RANGES: { value: Range; label: string }[] = [
  { value: "month", label: "This month" },
  { value: "3months", label: "Last 3 months" },
  { value: "all", label: "All" },
];
const KIND_ORDER = ["Event", "Garage Take", "Other footage"];
/** Cards per "Show more". Two dozen thumbnails is about what a phone scrolls
 *  through before someone either finds it or narrows the search. */
const PAGE = 24;

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** The earliest upload time a range lets through, or "" for All. "This month"
 *  is the calendar month in New York, where the team is; "last 3 months" counts
 *  back three calendar months from today. */
function rangeStart(range: Range, now: Date): string {
  if (range === "all") return "";
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" })
    .format(now)
    .split("-")
    .map(Number);
  const start = range === "month" ? new Date(Date.UTC(y, m - 1, 1)) : new Date(Date.UTC(y, m - 4, d));
  return start.toISOString();
}

/** Asphalt and Dirt include clips tagged Both: Both means "usable either way",
 *  so someone filling a Dirt slot wants to see them. The Both chip on its own
 *  shows only the Both clips. */
function matchesEventType(row: LibraryItem, want: string) {
  if (!want) return true;
  if (want === "Both") return row.eventType === "Both";
  return row.eventType === want || row.eventType === "Both";
}

function Thumb({ fileId, fileName }: { fileId: string; fileName: string }) {
  const [failed, setFailed] = useState(false);
  const isVideo = /\.(mov|mp4|m4v|insv|avi|mkv|webm)$/i.test(fileName);
  return (
    <div className="garage-library-thumb">
      {failed ? (
        <span className="garage-library-nothumb" aria-hidden="true">
          {isVideo ? "Video" : "No preview"}
        </span>
      ) : (
        // A plain <img>: the thumbnail comes from our own authenticated route,
        // which next/image's optimizer can't call with the visitor's session.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/garage/library/thumb?id=${encodeURIComponent(fileId)}`}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
      {isVideo && !failed && <span className="garage-library-badge">Video</span>}
    </div>
  );
}

type OpenCard = { id: string; name: string; due: string; platform: string; clips: number };
let cardsRequest: Promise<OpenCard[]> | null = null;
/** One fetch of the open clip cards per page view, shared by every clip. */
function loadOpenCards(): Promise<OpenCard[]> {
  cardsRequest ??= fetch("/api/garage/library/attach")
    .then((r) => r.json())
    .then((d) => (Array.isArray(d.cards) ? d.cards : []))
    .catch(() => {
      cardsRequest = null;
      return [];
    });
  return cardsRequest;
}

/**
 * "Add to a posting card" (Jose, 2026-09-24): puts this clip on an open
 * vertical-clip card so the auto-poster can post it. No dragging files into
 * Airtable, and the Drive file is never shared (see lib/mediaLink.ts).
 */
function AttachToCard({ fileId, fileName }: { fileId: string; fileName: string }) {
  const [open, setOpen] = useState(false);
  const [cards, setCards] = useState<OpenCard[] | null>(null);
  const [cardId, setCardId] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function start() {
    setOpen(true);
    setNote("");
    const list = await loadOpenCards();
    setCards(list);
    if (list[0]) setCardId(list[0].id);
  }

  async function attach() {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/garage/library/attach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, cardId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't attach it.");
      setNote(`Added to ${data.card}. It shows on the card in a few seconds; approve it on the board.`);
      setOpen(false);
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Couldn't attach it.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <>
        <button type="button" className="btn btn-outline garage-library-action" onClick={start}>
          Add to a posting card<span className="sr-only"> {fileName}</span>
        </button>
        {note && <p className="garage-form-note" role="status">{note}</p>}
      </>
    );
  }
  return (
    <div className="garage-form garage-library-attach">
      {cards === null ? (
        <p className="garage-form-note">Loading the open clip cards…</p>
      ) : cards.length === 0 ? (
        <p className="garage-form-note">No open clip cards this week or next.</p>
      ) : (
        <>
          <label htmlFor={`attach-${fileId}`}>Which card</label>
          <select id={`attach-${fileId}`} value={cardId} onChange={(e) => setCardId(e.target.value)}>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.due.slice(5)} · {c.name}
                {c.clips ? ` (has ${c.clips})` : ""}
              </option>
            ))}
          </select>
          <div className="card-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={attach} disabled={busy || !cardId}>
              {busy ? "Adding…" : "Add it"}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </>
      )}
      {note && <p className="garage-error" role="status">{note}</p>}
    </div>
  );
}

export default function GarageLibrary({ items, canAttach = false }: { items: LibraryItem[]; canAttach?: boolean }) {
  const [query, setQuery] = useState("");
  const [eventType, setEventType] = useState("");
  const [venue, setVenue] = useState("");
  const [kind, setKind] = useState("");
  const [range, setRange] = useState<Range>("all");
  const [shown, setShown] = useState(PAGE);
  // Fixed once per visit, so "this month" doesn't shift under someone mid-scroll.
  const [now] = useState(() => new Date());

  // Every filter except the one a chip belongs to, so each chip's count is
  // "what you'd get if you tapped this", given everything else already chosen.
  const filtered = useMemo(() => {
    const words = query.toLowerCase().split(/[\s,]+/).filter(Boolean);
    const since = rangeStart(range, now);
    const base = items.filter((r) => {
      if (since && (r.uploadedAt || "") < since) return false;
      if (!words.length) return true;
      const hay = `${r.fileName} ${r.label} ${r.keywords} ${r.uploadedBy}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    const byType = (rows: LibraryItem[]) => rows.filter((r) => matchesEventType(r, eventType));
    const byVenue = (rows: LibraryItem[]) => rows.filter((r) => !venue || r.venueTypes.includes(venue));
    const byKind = (rows: LibraryItem[]) => rows.filter((r) => !kind || r.kind === kind);
    return {
      forType: byVenue(byKind(base)),
      forVenue: byType(byKind(base)),
      forKind: byType(byVenue(base)),
      rows: byType(byVenue(byKind(base))),
    };
  }, [items, query, eventType, venue, kind, range, now]);

  const venues = useMemo(
    () => [...new Set(items.flatMap((r) => r.venueTypes))].sort((a, b) => a.localeCompare(b)),
    [items],
  );
  const kinds = useMemo(() => {
    const present = new Set(items.map((r) => r.kind).filter(Boolean));
    return [...KIND_ORDER.filter((k) => present.has(k)), ...[...present].filter((k) => !KIND_ORDER.includes(k)).sort()];
  }, [items]);
  const typesPresent = EVENT_TYPES.filter((t) => items.some((r) => r.eventType === t));

  const anyFilter = Boolean(query || eventType || venue || kind || range !== "all");
  const visible = filtered.rows.slice(0, shown);

  // A new filter starts back at the top page rather than keeping a long list
  // someone scrolled open for a different search.
  function change<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v);
      setShown(PAGE);
    };
  }
  const toggle = (current: string, set: (v: string) => void) => (value: string) =>
    change(set)(current === value ? "" : value);

  function clearAll() {
    setQuery("");
    setEventType("");
    setVenue("");
    setKind("");
    setRange("all");
    setShown(PAGE);
  }

  if (items.length === 0) {
    return (
      <section className="garage-panel">
        <h2>Nothing filed yet</h2>
        <p>Footage shows up here as soon as it&apos;s uploaded through Garage → Upload.</p>
      </section>
    );
  }

  return (
    <div className="garage-library">
      <label htmlFor="garage-library-search" className="garage-upload-label">
        Search <span>file name, label, keywords or who uploaded it</span>
      </label>
      <input
        id="garage-library-search"
        className="garage-library-search"
        type="search"
        value={query}
        onChange={(e) => change(setQuery)(e.target.value)}
        placeholder="jeep, mud run, Anthony"
        autoCapitalize="none"
        autoCorrect="off"
        enterKeyHint="search"
      />

      <div className="garage-library-filters">
        {typesPresent.length > 0 && (
          <div role="group" aria-label="Asphalt or dirt" className="garage-chips">
            {typesPresent.map((t) => (
              <button
                key={t}
                type="button"
                className="garage-chip"
                aria-pressed={eventType === t}
                onClick={() => toggle(eventType, setEventType)(t)}
              >
                {t} <span className="garage-chip-count">{filtered.forType.filter((r) => matchesEventType(r, t)).length}</span>
              </button>
            ))}
          </div>
        )}
        {venues.length > 0 && (
          <div role="group" aria-label="Venue type" className="garage-chips">
            {venues.map((v) => (
              <button
                key={v}
                type="button"
                className="garage-chip"
                aria-pressed={venue === v}
                onClick={() => toggle(venue, setVenue)(v)}
              >
                {v} <span className="garage-chip-count">{filtered.forVenue.filter((r) => r.venueTypes.includes(v)).length}</span>
              </button>
            ))}
          </div>
        )}
        {kinds.length > 1 && (
          <div role="group" aria-label="Kind" className="garage-chips">
            {kinds.map((k) => (
              <button
                key={k}
                type="button"
                className="garage-chip"
                aria-pressed={kind === k}
                onClick={() => toggle(kind, setKind)(k)}
              >
                {k} <span className="garage-chip-count">{filtered.forKind.filter((r) => r.kind === k).length}</span>
              </button>
            ))}
          </div>
        )}
        <div role="group" aria-label="When" className="garage-chips">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              className="garage-chip"
              aria-pressed={range === r.value}
              onClick={() => change(setRange)(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <p className="garage-library-count" aria-live="polite">
        {filtered.rows.length} of {items.length}
        {anyFilter && (
          <button type="button" className="garage-upload-change" onClick={clearAll}>
            Clear
          </button>
        )}
      </p>

      {filtered.rows.length === 0 ? (
        <section className="garage-panel">
          <p>Nothing matches. Try fewer words, or a wider date range.</p>
        </section>
      ) : (
        <ul className="garage-library-grid" aria-label="Footage">
          {visible.map((r) => {
            const tooBig = r.size > DOWNLOAD_LIMIT_BYTES;
            const tags = [r.eventType, ...r.venueTypes, r.kind].filter(Boolean);
            return (
              <li key={r.id} className="garage-library-card">
                <Thumb fileId={r.fileId} fileName={r.fileName} />
                <div className="garage-library-info">
                  <p className="garage-library-name">{r.fileName || "Untitled"}</p>
                  {r.label && <p className="garage-library-label">{r.label}</p>}
                  {tags.length > 0 && (
                    <p className="garage-library-tags">
                      {tags.map((t) => (
                        <span key={t} className="garage-tag">
                          {t}
                        </span>
                      ))}
                    </p>
                  )}
                  {r.keywords && <p className="garage-library-keywords">{r.keywords}</p>}
                  <p className="garage-library-meta">
                    {formatDate(r.uploadedAt)}
                    {r.uploadedBy ? ` · ${r.uploadedBy}` : ""}
                    {r.size ? ` · ${formatBytes(r.size)}` : ""}
                  </p>
                </div>
                {tooBig ? (
                  // Over the limit: Drive's own app downloads it (see
                  // DOWNLOAD_LIMIT_BYTES for why we don't stream it ourselves).
                  <a
                    href={r.driveLink || `https://drive.google.com/file/d/${r.fileId}/view`}
                    target="_blank"
                    rel="noopener"
                    className="btn btn-outline garage-library-action"
                  >
                    Open in Drive ↗<span className="sr-only"> {r.fileName}</span>
                  </a>
                ) : (
                  // No `download` attribute: the route's Content-Disposition
                  // already saves it, and an older row with no Size may be
                  // redirected to Drive, which `download` would save as HTML.
                  <a
                    href={`/api/garage/library/file?id=${encodeURIComponent(r.fileId)}`}
                    className="btn btn-primary garage-library-action"
                  >
                    Download<span className="sr-only"> {r.fileName}</span>
                  </a>
                )}
                {canAttach && !tooBig && /\.(mov|mp4|m4v)$/i.test(r.fileName) && (
                  <AttachToCard fileId={r.fileId} fileName={r.fileName} />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {filtered.rows.length > shown && (
        <button type="button" className="btn btn-outline garage-block-btn" onClick={() => setShown((n) => n + PAGE)}>
          Show more ({filtered.rows.length - shown} left)
        </button>
      )}
    </div>
  );
}
