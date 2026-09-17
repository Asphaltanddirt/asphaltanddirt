"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Garage → Upload: photos and videos to Google Drive, the same on a phone or a
 * computer. Built for the least techy person on the crew: pick where it goes,
 * pick the files, watch one big progress bar, see "Done".
 *
 * Files go straight from the device to Google in 8 MB pieces (resumable), so a
 * dropped connection picks up where it left off instead of starting over.
 */

type Target = { type: "event"; slug: string; label: string } | { type: "vlog"; title: string; label: string };
type FileState = "waiting" | "uploading" | "done" | "failed";
interface Item {
  id: string;
  file: File;
  sent: number;
  state: FileState;
  uploadUrl?: string;
}
type Phase = "choose" | "files" | "uploading" | "paused" | "done";

const CHUNK_BYTES = 8 * 1024 * 1024;
const MAX_RETRIES = 6;

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function putChunk(url: string, blob: Blob, start: number, total: number, onProgress: (loaded: number) => void) {
  return new Promise<number>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Range", `bytes ${start}-${start + blob.size - 1}/${total}`);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => resolve(xhr.status);
    xhr.onerror = () => resolve(0);
    xhr.ontimeout = () => resolve(0);
    xhr.send(blob);
  });
}

export default function GarageUpload({
  vlogTitles,
  events,
  initialEventSlug,
}: {
  /** This week's blog posts, for naming a vlog. Empty = no vlog option (not an Owner). */
  vlogTitles: string[];
  events: { slug: string; title: string; date: string }[];
  initialEventSlug?: string;
}) {
  const preset = events.find((e) => e.slug === initialEventSlug);
  const [target, setTarget] = useState<Target | null>(
    preset ? { type: "event", slug: preset.slug, label: preset.title } : null,
  );
  const [otherTitle, setOtherTitle] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [phase, setPhase] = useState<Phase>(preset ? "files" : "choose");
  const [error, setError] = useState("");
  const [folderLink, setFolderLink] = useState("");
  const folderIdRef = useRef("");
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);
  const busy = phase === "uploading";

  // Leaving or locking mid-upload is the main way this goes wrong: ask before
  // leaving, and keep the screen awake where the browser allows it.
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((lock) => (wakeLock.current = lock)).catch(() => {});
    return () => {
      window.removeEventListener("beforeunload", warn);
      wakeLock.current?.release().catch(() => {});
      wakeLock.current = null;
    };
  }, [busy]);

  const patch = (id: string, changes: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...changes } : i)));

  function pick(next: Target) {
    setTarget(next);
    setPhase("files");
    setError("");
  }

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const added = Array.from(list).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      sent: 0,
      state: "waiting" as FileState,
    }));
    setItems((prev) => [...prev, ...added]);
    setError("");
  }

  async function sendOne(item: Item, uploadUrl: string): Promise<boolean> {
    const total = item.file.size;
    let offset = item.sent;
    let retries = 0;
    patch(item.id, { state: "uploading" });
    while (offset < total) {
      const chunk = item.file.slice(offset, Math.min(offset + CHUNK_BYTES, total));
      const code = await putChunk(uploadUrl, chunk, offset, total, (loaded) => patch(item.id, { sent: offset + loaded }));
      if (code === 200 || code === 201) {
        patch(item.id, { state: "done", sent: total });
        return true;
      }
      if (code === 308) {
        offset += chunk.size;
        retries = 0;
        patch(item.id, { sent: offset });
        continue;
      }
      // Dropped connection or a hiccup: wait a little, ask Google where it got
      // to, and carry on from there.
      if (++retries > MAX_RETRIES) break;
      await new Promise((r) => setTimeout(r, 1500 * retries));
      try {
        const res = await fetch("/api/garage/upload/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uploadUrl, size: total }),
        });
        if (!res.ok) continue;
        const state = await res.json();
        if (state.done) {
          patch(item.id, { state: "done", sent: total });
          return true;
        }
        offset = state.offset;
        patch(item.id, { sent: offset });
      } catch {
        // Still offline; the next try checks again.
      }
    }
    patch(item.id, { state: "failed", sent: offset });
    return false;
  }

  async function run(list: Item[]) {
    setPhase("uploading");
    setError("");
    let sent = 0;
    let failed = 0;
    for (const item of list) {
      if (item.state === "done") {
        sent++;
        continue;
      }
      const ok = item.uploadUrl ? await sendOne(item, item.uploadUrl) : false;
      if (ok) sent++;
      else failed++;
    }
    if (failed > 0) {
      setPhase("paused");
      return;
    }
    try {
      await fetch("/api/garage/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: folderIdRef.current, kind: target?.type, label: target?.label, sent, failed }),
      });
    } catch {
      // The files are already in Drive; the email is a nice-to-have.
    }
    setPhase("done");
  }

  async function start() {
    if (!target || items.length === 0) return;
    setError("");
    setPhase("uploading");
    try {
      const res = await fetch("/api/garage/upload/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: target.type === "vlog" ? { type: "vlog", title: target.title } : { type: "event", slug: target.slug },
          files: items.map((i) => ({ name: i.file.name, size: i.file.size, mimeType: i.file.type })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't start the upload. Try again.");
      folderIdRef.current = data.folderId;
      setFolderLink(data.folderUrl || "");
      const withUrls = items.map((item, i) => ({ ...item, uploadUrl: data.uploads[i]?.uploadUrl }));
      setItems(withUrls);
      await run(withUrls);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the upload. Try again.");
      setPhase("files");
    }
  }

  function reset() {
    setItems([]);
    setTarget(null);
    setOtherTitle("");
    setPhase("choose");
    setError("");
    setFolderLink("");
  }

  const totalBytes = items.reduce((sum, i) => sum + i.file.size, 0);
  const sentBytes = items.reduce((sum, i) => sum + i.sent, 0);
  const percent = totalBytes ? Math.floor((sentBytes / totalBytes) * 100) : 0;
  const doneCount = items.filter((i) => i.state === "done").length;

  // Step 1: where does it go?
  if (phase === "choose") {
    return (
      <div className="garage-upload">
        <h2 className="garage-upload-step">What are you uploading?</h2>
        {vlogTitles.length > 0 && (
          <section className="garage-panel">
            <h3>A vlog</h3>
            <div className="garage-upload-choices">
              {vlogTitles.map((title) => (
                <button key={title} type="button" className="garage-upload-choice" onClick={() => pick({ type: "vlog", title, label: title })}>
                  <span>Vlog for</span>
                  <strong>{title}</strong>
                </button>
              ))}
            </div>
            <label htmlFor="upload-other-vlog" className="garage-upload-label">Something else? Give it a short name</label>
            <div className="garage-upload-other">
              <input id="upload-other-vlog" value={otherTitle} onChange={(e) => setOtherTitle(e.target.value)} placeholder="e.g. Mud Run day 1" />
              <button
                type="button"
                className="btn btn-outline"
                disabled={!otherTitle.trim()}
                onClick={() => pick({ type: "vlog", title: otherTitle.trim(), label: otherTitle.trim() })}
              >
                Next
              </button>
            </div>
          </section>
        )}
        <section className="garage-panel">
          <h3>Photos &amp; videos from an event</h3>
          {events.length === 0 ? (
            <p className="garage-empty">No events to upload to yet.</p>
          ) : (
            <div className="garage-upload-choices">
              {events.map((e) => (
                <button key={e.slug} type="button" className="garage-upload-choice" onClick={() => pick({ type: "event", slug: e.slug, label: e.title })}>
                  <span>{e.date}</span>
                  <strong>{e.title}</strong>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // Done
  if (phase === "done") {
    return (
      <div className="garage-upload">
        <div className="garage-upload-done" role="status">
          <p className="garage-upload-big">Done ✓</p>
          <p>
            {doneCount} file{doneCount === 1 ? " is" : "s are"} in Google Drive
            {target?.type === "vlog" ? ". Jose got an email that it's there." : "."}
          </p>
          {folderLink && (
            <a href={folderLink} target="_blank" rel="noopener" className="btn btn-outline garage-block-btn">
              Open the Drive folder ↗
            </a>
          )}
          <button type="button" className="btn btn-primary garage-block-btn" onClick={reset}>
            Upload something else
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="garage-upload">
      <p className="garage-upload-target">
        {target?.type === "vlog" ? "Vlog for " : "Event: "}
        <strong>{target?.label}</strong>
        {phase === "files" && (
          <button type="button" className="garage-upload-change" onClick={() => setPhase("choose")}>
            Change
          </button>
        )}
      </p>

      {phase === "files" && (
        <>
          <div className="media-drop garage-upload-drop">
            <input
              id="garage-upload-files"
              className="media-drop-input"
              type="file"
              accept={target?.type === "vlog" ? "video/*" : "image/*,video/*"}
              multiple
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <label htmlFor="garage-upload-files" className="media-drop-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="13" height="14" rx="2" />
                <path d="m16 10 5-3v10l-5-3z" />
              </svg>
              <span>
                {items.length ? "Add more" : target?.type === "vlog" ? "Choose the video" : "Choose photos or videos"}
              </span>
            </label>
          </div>
          {items.length > 0 && (
            <>
              <ul className="media-list" aria-label="Files to upload">
                {items.map((item) => (
                  <li className="media-item" key={item.id}>
                    <div className="media-meta">
                      <span className="media-name">{item.file.name}</span>
                      <span className="media-size">{formatBytes(item.file.size)}</span>
                    </div>
                    <button
                      type="button"
                      className="media-remove"
                      aria-label={`Remove ${item.file.name}`}
                      onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="btn btn-primary garage-block-btn garage-upload-go" onClick={start}>
                Upload {items.length} file{items.length === 1 ? "" : "s"} ({formatBytes(totalBytes)})
              </button>
            </>
          )}
        </>
      )}

      {(phase === "uploading" || phase === "paused") && (
        <div className="garage-upload-progress">
          <p className="garage-upload-big" aria-live="polite">
            {phase === "paused" ? "Paused" : `${percent}%`}
          </p>
          <div className="garage-upload-bar" aria-hidden="true">
            <span style={{ width: `${percent}%` }} />
          </div>
          <p className="garage-upload-count">
            {doneCount} of {items.length} done · {formatBytes(sentBytes)} of {formatBytes(totalBytes)}
          </p>
          {phase === "uploading" ? (
            <p className="garage-upload-warning">
              Keep this screen open until it says Done. Don&apos;t lock your phone or switch apps.
            </p>
          ) : (
            <>
              <p className="garage-upload-warning">
                The connection dropped. Nothing is lost. Check your signal or Wi-Fi, then tap Keep going.
              </p>
              <button type="button" className="btn btn-primary garage-block-btn" onClick={() => run(items)}>
                Keep going
              </button>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="garage-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
