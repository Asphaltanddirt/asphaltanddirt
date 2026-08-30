"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics";
import { compressImage } from "@/lib/imageCompress";

const MAX_PHOTOS = 3;
const MAX_ORIGINAL_FILE_SIZE = 15 * 1024 * 1024;

const CONTENT_TYPES = [
  { value: "photos", label: "Photos" },
  { value: "video", label: "Video" },
  { value: "written", label: "Written Stories" },
  { value: "event-coverage", label: "Event Coverage" },
];

type Status = "idle" | "submitting" | "success" | "error";
type Photo = { file: File; url: string };

export default function AmbassadorApplicationForm() {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const busy = status === "submitting" || compressing;

  function toggleContentType(value: string) {
    setContentTypes((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

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

    if (data.get("company")) {
      setStatus("success");
      return;
    }

    data.delete("photos");
    photos.forEach((p) => data.append("photos", p.file));
    contentTypes.forEach((v) => data.append("contentTypes", v));

    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/submit-ambassador-application", { method: "POST", body: data });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "Something went wrong. Please try again.");

      track("ambassador_application", { result: "success" });
      setStatus("success");
      setTimeout(() => router.push("/"), 3500);
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
        <h2>Application Submitted!</h2>
        <p className="lead" style={{ maxWidth: 480 }}>
          Thanks for putting yourself out there. We review applications on a rolling basis and
          will reach out by email either way. Taking you back home&hellip;
        </p>
        <Link href="/" className="btn btn-primary">Back To Home</Link>
      </div>
    );
  }

  return (
    <form className="build-form" onSubmit={handleSubmit}>
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }}
      />

      <div className="form-section">
        <div className="form-section-title">Your Info</div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="name">Full Name</label>
            <input type="text" id="name" name="name" required disabled={busy} />
          </div>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" name="email" required disabled={busy} />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="location">Location (City, State)</label>
          <input type="text" id="location" name="location" placeholder="e.g. Denver, CO" required disabled={busy} />
        </div>
        <div className="form-field">
          <label htmlFor="socialLinks">Social Media Links</label>
          <textarea
            id="socialLinks"
            name="socialLinks"
            placeholder="Instagram, TikTok, YouTube, etc. — one per line"
            required
            disabled={busy}
          />
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Your Culture</div>
        <div className="form-field">
          <label htmlFor="vehicle">Primary Vehicle(s) Or Build</label>
          <input type="text" id="vehicle" name="vehicle" placeholder="e.g. 2021 Jeep Wrangler Rubicon, built for trail" required disabled={busy} />
        </div>
        <div className="form-field">
          <label htmlFor="interests">Automotive Interests <span className="optional">(Optional)</span></label>
          <input
            type="text"
            id="interests"
            name="interests"
            placeholder="e.g. Off-road, street performance, overlanding, fabrication"
            disabled={busy}
          />
        </div>
        <div className="form-field">
          <label htmlFor="clubs">Clubs, Events, Or Communities You&apos;re Part Of <span className="optional">(Optional)</span></label>
          <input type="text" id="clubs" name="clubs" disabled={busy} />
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Your Content & Reach</div>
        <div className="form-field">
          <label htmlFor="contentExamples">Examples Of Previous Content <span className="optional">(Optional)</span></label>
          <textarea id="contentExamples" name="contentExamples" placeholder="Links to posts, videos, or a portfolio" disabled={busy} />
        </div>
        <div className="form-field">
          <label htmlFor="audience">Average Engagement Or Audience Info <span className="optional">(Optional)</span></label>
          <input
            type="text"
            id="audience"
            name="audience"
            placeholder="e.g. Instagram: 2,400 followers, ~180 likes/photo"
            disabled={busy}
          />
        </div>
        <div className="form-field">
          <label>What Can You Create? <span className="optional">(Select all that apply)</span></label>
          <div className="form-checkbox-group">
            {CONTENT_TYPES.map((type) => (
              <label className={`form-checkbox${contentTypes.includes(type.value) ? " has-check" : ""}`} key={type.value}>
                <input
                  type="checkbox"
                  checked={contentTypes.includes(type.value)}
                  onChange={() => toggleContentType(type.value)}
                  disabled={busy}
                />
                {type.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Why You</div>
        <div className="form-field">
          <label htmlFor="why">Why Do You Want To Represent Asphalt &amp; Dirt?</label>
          <textarea id="why" name="why" required style={{ minHeight: 130 }} disabled={busy} />
        </div>
        <div className="form-field">
          <label htmlFor="contribution">What Can You Contribute Beyond Sales?</label>
          <textarea
            id="contribution"
            name="contribution"
            placeholder="Content quality, event presence, community leadership, technical knowledge, etc."
            required
            style={{ minHeight: 130 }}
            disabled={busy}
          />
        </div>
        <div className="form-field">
          <label htmlFor="otherBrands">Other Automotive Brand Relationships <span className="optional">(Optional)</span></label>
          <input type="text" id="otherBrands" name="otherBrands" placeholder="None, or list them" disabled={busy} />
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Photos <span className="optional">(Optional)</span></div>
        <p className="form-section-hint">Up to {MAX_PHOTOS} photos of you and/or your rig.</p>
        <div className="photo-upload">
          <label className="photo-upload-label" htmlFor="photos">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 16l4.5-6 3 3.5L16 8l4 8" /><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8" cy="8.5" r="1.4" />
            </svg>
            <span>
              {compressing ? "Optimizing photos…" : photos.length ? "Add more photos" : "Click to upload photos"}
            </span>
          </label>
          <input
            id="photos"
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

      <label className="form-field-consent" htmlFor="conductAccepted">
        <input type="checkbox" id="conductAccepted" name="conductAccepted" required disabled={busy} />
        <span>
          I&apos;ve read and accept the Road &amp; Trail Crew conduct and disclosure standards —
          no street takeovers, reckless driving, trail damage, or misrepresenting my relationship
          with Asphalt &amp; Dirt.
        </span>
      </label>

      {errorMsg && <p className="form-error-banner">{errorMsg}</p>}

      <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: "fit-content" }}>
        {status === "submitting" ? "Submitting…" : "Submit Application"}
      </button>
    </form>
  );
}
