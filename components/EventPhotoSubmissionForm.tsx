"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { compressImage } from "@/lib/imageCompress";

/**
 * Photo + video submissions for a past event. Files go straight from the
 * browser to A&D's Google Drive in resumable chunks (see lib/googleDrive.ts),
 * so big phone videos work and a dropped connection resumes instead of
 * starting over. Photos also send a small preview to Airtable so staff can
 * approve them into the event gallery.
 */

const MAX_FILES = 25;
const MAX_PHOTO_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_BYTES = 4 * 1024 * 1024 * 1024;
const MAX_PREVIEWS = 12;
const MAX_PREVIEW_BYTES = 3.5 * 1024 * 1024;
// Google requires resumable chunks in multiples of 256 KiB; 8 MiB keeps each
// request short enough to survive a flaky phone connection.
const CHUNK_BYTES = 8 * 1024 * 1024;
const MAX_RETRIES = 5;

type Kind = "photo" | "video";
type ItemState = "ready" | "uploading" | "done" | "failed";
type Status = "idle" | "uploading" | "success";

interface Item {
  id: string;
  file: File;
  kind: Kind;
  thumb: string | null;
  sent: number;
  state: ItemState;
}

function kindOf(file: File): Kind | null {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (file.type.startsWith("image/") || ["heic", "heif"].includes(ext)) return "photo";
  if (file.type.startsWith("video/") || ["mov", "mp4", "m4v", "webm"].includes(ext)) return "video";
  return null;
}

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

export default function EventPhotoSubmissionForm({ eventSlug, eventTitle }: { eventSlug: string; eventTitle: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<{ photos: number; videos: number; failed: string[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = status === "uploading";

  // Leaving mid-upload loses whatever hasn't finished — ask first.
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const room = MAX_FILES - items.length;
    const incoming = Array.from(list);
    const next: Item[] = [];
    for (const file of incoming.slice(0, room)) {
      const kind = kindOf(file);
      if (!kind) {
        setErrorMsg(`"${file.name}" isn't a photo or video.`);
        continue;
      }
      if (file.size > (kind === "video" ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES)) {
        setErrorMsg(`"${file.name}" is too large (${kind === "video" ? "videos up to 4 GB" : "photos up to 50 MB"}).`);
        continue;
      }
      next.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        kind,
        thumb: kind === "photo" ? URL.createObjectURL(file) : null,
        sent: 0,
        state: "ready",
      });
    }
    if (incoming.length > room) setErrorMsg(`You can send up to ${MAX_FILES} files at a time.`);
    else if (next.length === incoming.length) setErrorMsg("");
    setItems((prev) => [...prev, ...next]);
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.thumb) URL.revokeObjectURL(target.thumb);
      return prev.filter((i) => i.id !== id);
    });
  }

  const patch = (id: string, changes: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...changes } : i)));

  async function uploadOne(item: Item, uploadUrl: string, auth: { submissionId: string; token: string }) {
    const total = item.file.size;
    let offset = 0;
    let retries = 0;
    patch(item.id, { state: "uploading", sent: 0 });

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
        continue;
      }
      // Dropped connection or server hiccup: ask where Google got to, then resume.
      if (++retries > MAX_RETRIES) break;
      await new Promise((r) => setTimeout(r, 1000 * retries));
      try {
        const res = await fetch("/api/event-media/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...auth, uploadUrl, size: total }),
        });
        if (!res.ok) continue;
        const state = await res.json();
        if (state.done) {
          patch(item.id, { state: "done", sent: total });
          return true;
        }
        offset = state.offset;
      } catch {
        // Still offline — the next attempt checks again.
      }
    }
    patch(item.id, { state: "failed" });
    return false;
  }

  async function sendPreview(file: File, auth: { submissionId: string; token: string }) {
    try {
      const small = await compressImage(file);
      if (!small.type.startsWith("image/") || small.size > MAX_PREVIEW_BYTES) return;
      const data = new FormData();
      data.set("submissionId", auth.submissionId);
      data.set("token", auth.token);
      data.set("photo", small);
      await fetch("/api/event-media/preview", { method: "POST", body: data });
    } catch {
      // A missing preview never blocks the upload — the original is in Drive.
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = ((data.get("name") as string) || "").trim();
    const email = ((data.get("email") as string) || "").trim();

    if (!name || !email) return setErrorMsg("Please fill out your name and email.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErrorMsg("A valid email is required.");
    if (items.length === 0) return setErrorMsg("Add at least one photo or video.");
    if (data.get("consent") !== "on") return setErrorMsg("Please confirm you have the right to share these.");

    setErrorMsg("");
    setStatus("uploading");

    let start: { submissionId: string; token: string; uploads: { uploadUrl: string }[] };
    try {
      const res = await fetch("/api/event-media/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventSlug,
          name,
          email,
          consent: true,
          company: data.get("company") || "",
          files: items.map((i) => ({ name: i.file.name, type: i.file.type, size: i.file.size })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Something went wrong. Please try again.");
      start = json;
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("idle");
      return;
    }

    const auth = { submissionId: start.submissionId, token: start.token };
    const failed: string[] = [];
    let previews = 0;
    for (const [index, item] of items.entries()) {
      const ok = await uploadOne(item, start.uploads[index].uploadUrl, auth);
      if (!ok) failed.push(item.file.name);
      else if (item.kind === "photo" && previews < MAX_PREVIEWS) {
        previews++;
        await sendPreview(item.file, auth);
      }
    }

    let photos = items.filter((i) => i.kind === "photo").length;
    let videos = items.length - photos;
    try {
      const res = await fetch("/api/event-media/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...auth, expected: items.length, eventTitle }),
      });
      if (res.ok) ({ photos, videos } = await res.json());
    } catch {
      // The files are already in Drive; the team can still see them there.
    }

    track("event_photo_submission", { result: failed.length ? "partial" : "success", photos, videos });
    setResult({ photos, videos, failed });
    setStatus("success");
  }

  const totalBytes = items.reduce((sum, i) => sum + i.file.size, 0);
  const sentBytes = items.reduce((sum, i) => sum + i.sent, 0);
  const percent = totalBytes ? Math.floor((sentBytes / totalBytes) * 100) : 0;

  if (status === "success" && result) {
    return (
      <div className="form-success" role="status">
        <div className="form-success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2>Thanks For Sharing!</h2>
        <p className="lead" style={{ maxWidth: 480 }}>
          We got {result.photos} photo{result.photos === 1 ? "" : "s"} and {result.videos} video{result.videos === 1 ? "" : "s"}. We
          look at every one by hand — approved photos show up in the gallery for everyone.
        </p>
        {result.failed.length > 0 && (
          <p className="form-error-banner" style={{ maxWidth: 480 }}>
            These didn&apos;t make it: {result.failed.join(", ")}. Reload the page and send just those again.
          </p>
        )}
      </div>
    );
  }

  return (
    <form className="build-form" onSubmit={handleSubmit} noValidate>
      {/* Honeypot field — hidden from real visitors, bots often fill every input. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }}
      />

      <div className="form-section">
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="media-name">Full Name</label>
            <input type="text" id="media-name" name="name" autoComplete="name" required disabled={busy} />
          </div>
          <div className="form-field">
            <label htmlFor="media-email">Email <span className="optional">(Never published)</span></label>
            <input type="email" id="media-email" name="email" autoComplete="email" required disabled={busy} />
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title" id="media-title">Photos &amp; Videos</div>
        <p className="form-section-hint" id="media-hint">
          Up to {MAX_FILES} files — photos up to 50 MB, videos up to 4 GB. Full quality, straight from your phone.
        </p>

        <div className="media-drop">
          <input
            ref={inputRef}
            id="media-files"
            className="media-drop-input"
            type="file"
            accept="image/*,video/*"
            multiple
            aria-describedby="media-hint"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
            disabled={busy || items.length >= MAX_FILES}
          />
          <label htmlFor="media-files" className="media-drop-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 16l4.5-6 3 3.5L16 8l4 8" /><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8" cy="8.5" r="1.4" />
            </svg>
            <span>{items.length ? "Add more photos or videos" : "Choose photos or videos"}</span>
          </label>
        </div>

        {items.length > 0 && (
          <ul className="media-list" aria-label="Files to send">
            {items.map((item) => {
              const pct = Math.floor((item.sent / item.file.size) * 100);
              return (
                <li className={`media-item is-${item.state}`} key={item.id}>
                  <div className="media-thumb" aria-hidden="true">
                    {item.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.thumb} alt="" />
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="5" width="13" height="14" rx="2" /><path d="m16 10 5-3v10l-5-3z" />
                      </svg>
                    )}
                  </div>
                  <div className="media-meta">
                    <span className="media-name">{item.file.name}</span>
                    <span className="media-size">
                      {item.kind === "video" ? "Video" : "Photo"} · {formatBytes(item.file.size)}
                      {item.state === "uploading" && ` · ${pct}%`}
                      {item.state === "done" && " · Sent"}
                      {item.state === "failed" && " · Didn't send"}
                    </span>
                    {item.state !== "ready" && (
                      <span className="media-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
                    )}
                  </div>
                  {!busy && item.state === "ready" && (
                    <button type="button" className="media-remove" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.file.name}`}>
                      ×
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <label className="form-field-consent" htmlFor="media-consent">
        <input type="checkbox" id="media-consent" name="consent" disabled={busy} />
        <span>
          I took these or have permission to share them, and Asphalt &amp; Dirt may review and publish them. If a child
          is recognizable, I&apos;m their parent or guardian or have their OK.
        </span>
      </label>

      {errorMsg && <p className="form-error-banner" role="alert">{errorMsg}</p>}

      <div aria-live="polite" className="media-progress-text">
        {busy && `Sending… ${percent}% — keep this page open until it finishes.`}
      </div>

      <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: "fit-content" }}>
        {busy ? `Sending ${percent}%` : "Send Photos & Videos"}
      </button>
    </form>
  );
}
