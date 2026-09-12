"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";
import { compressImage } from "@/lib/imageCompress";

type Status = "idle" | "submitting" | "success" | "error";
type Photo = { file: File; url: string };

const MAX_PHOTOS = 6;
const MAX_ORIGINAL_FILE_SIZE = 15 * 1024 * 1024; // reject absurdly large originals before we even try to compress

export default function EventPhotoSubmissionForm({
  eventRecordId,
  eventTitle,
}: {
  eventRecordId: string;
  eventTitle: string;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const busy = status === "submitting" || compressing;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      setErrorMsg(`You can upload up to ${MAX_PHOTOS} photos.`);
      return;
    }

    const incoming = Array.from(fileList).slice(0, room);
    const tooLarge = incoming.some((f) => f.size > MAX_ORIGINAL_FILE_SIZE);
    if (tooLarge) {
      setErrorMsg("One of those photos is too large — try a smaller file.");
      return;
    }

    setErrorMsg("");
    setCompressing(true);
    try {
      const compressed = await Promise.all(incoming.map((f) => compressImage(f)));
      setPhotos((prev) => [...prev, ...compressed.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    } finally {
      setCompressing(false);
    }
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    // Honeypot — a real visitor never fills this hidden field.
    if (data.get("company")) {
      setStatus("success");
      return;
    }

    const name = ((data.get("name") as string) || "").trim();
    const email = ((data.get("email") as string) || "").trim();

    if (!name || !email) {
      setErrorMsg("Please fill out your name and email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg("A valid email is required.");
      return;
    }
    if (photos.length === 0) {
      setErrorMsg("Add at least one photo.");
      return;
    }

    data.set("eventRecordId", eventRecordId);
    data.set("eventTitle", eventTitle);
    data.delete("photos");
    photos.forEach((p) => data.append("photos", p.file));

    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/submit-event-photo", { method: "POST", body: data });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "Something went wrong. Please try again.");

      track("event_photo_submission", { result: "success" });
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="form-success">
        <div className="form-success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2>Thanks For The Photos!</h2>
        <p className="lead" style={{ maxWidth: 480 }}>
          We read every submission by hand. Once approved, they&apos;ll show up in the gallery above
          for everyone to see.
        </p>
      </div>
    );
  }

  return (
    <form className="build-form" onSubmit={handleSubmit}>
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
            <label htmlFor="photo-name">Full Name</label>
            <input type="text" id="photo-name" name="name" required disabled={busy} />
          </div>
          <div className="form-field">
            <label htmlFor="photo-email">Email <span className="optional">(Never published)</span></label>
            <input type="email" id="photo-email" name="email" required disabled={busy} />
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Photos</div>
        <p className="form-section-hint">Up to {MAX_PHOTOS} photos from the day.</p>
        <div className="photo-upload">
          <label className="photo-upload-label" htmlFor="event-photos">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 16l4.5-6 3 3.5L16 8l4 8" /><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8" cy="8.5" r="1.4" />
            </svg>
            <span>
              {compressing ? "Optimizing photos…" : photos.length ? "Add more photos" : "Click to upload photos"}
            </span>
          </label>
          <input
            id="event-photos"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
            disabled={busy || photos.length >= MAX_PHOTOS}
          />
        </div>
        {photos.length > 0 && (
          <div className="photo-preview-grid">
            {photos.map((photo, i) => (
              <div className="photo-preview" key={photo.url}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={`Upload preview ${i + 1}`} />
                <button type="button" onClick={() => removePhoto(i)} disabled={busy} aria-label="Remove photo">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {errorMsg && <p className="form-error-banner">{errorMsg}</p>}

      <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: "fit-content" }}>
        {status === "submitting" ? "Submitting…" : "Submit Your Photos"}
      </button>
    </form>
  );
}
