"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { compressImage } from "@/lib/imageCompress";
import { useFormDraft } from "@/lib/useFormDraft";
import { DraftRestoredNotice, FormBeforeYouStart } from "./FormHelpers";

const MAX_PHOTOS = 5;
const MAX_ORIGINAL_FILE_SIZE = 15 * 1024 * 1024; // reject absurdly large originals before we even try to compress

const SOCIAL_PLATFORMS = ["Instagram", "TikTok", "YouTube", "Facebook", "X", "Website", "Other"];

type Status = "idle" | "submitting" | "success" | "error";
type Photo = { file: File; url: string };

export default function BuildSubmissionForm() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  // Typed answers survive a refresh or coming back later (photos can't be saved).
  const { restored, clearDraft } = useFormDraft({
    storageKey: "ad_draft_build_submission",
    formRef,
    skip: ["company", "photos"],
  });

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

    // Honeypot — if a bot filled this hidden field, quietly pretend it worked.
    if (data.get("company")) {
      setStatus("success");
      return;
    }

    if (photos.length === 0) {
      setErrorMsg("Please add at least one photo of your rig.");
      return;
    }

    data.delete("photos");
    photos.forEach((p) => data.append("photos", p.file));

    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/submit-build", { method: "POST", body: data });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "Something went wrong. Please try again.");

      track("build_submission", { result: "success" });
      clearDraft();
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
        <h2>Your Build Is In!</h2>
        <p className="lead" style={{ maxWidth: 480 }}>
          Thanks for sharing your rig with the Asphalt &amp; Dirt community. We&apos;ll reach out if
          we feature it.
        </p>
        <Link href="/builds" className="btn btn-primary">Back To Builds</Link>
      </div>
    );
  }

  return (
    <form className="build-form" onSubmit={handleSubmit} ref={formRef}>
      <FormBeforeYouStart
        time="Takes about 5 to 10 minutes."
        needs={[
          "At least 1 photo of your rig (up to 5)",
          "The year, make and model, and a name for your rig (e.g. Shockwave)",
          "A few lines on the story behind it. Specs like power, tires and lift are optional.",
        ]}
        note="Your answers are saved on this device as you type, so you can come back and finish later."
      />
      {restored && (
        <DraftRestoredNotice
          onStartOver={() => {
            clearDraft();
            formRef.current?.reset();
          }}
        />
      )}
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
        <h2 className="form-section-title">Your Info</h2>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="name">Full Name</label>
            <input autoComplete="name" type="text" id="name" name="name" required disabled={busy} />
          </div>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input autoComplete="email" type="email" id="email" name="email" required disabled={busy} />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="social">Social Handle Or Link <span className="optional">(Optional)</span></label>
          <div className="form-row" style={{ gridTemplateColumns: "150px 1fr", alignItems: "center" }}>
            <select id="socialPlatform" name="socialPlatform" defaultValue="Instagram" aria-label="Platform" disabled={busy}>
              {SOCIAL_PLATFORMS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <input type="text" id="social" name="social" placeholder="@yourhandle or https://…" disabled={busy} />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h2 className="form-section-title">The Rig</h2>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="rigName">Rig Name</label>
            <input type="text" id="rigName" name="rigName" placeholder="e.g. Shockwave" required disabled={busy} />
          </div>
          <div className="form-field">
            <label htmlFor="vehicle">Vehicle</label>
            <input type="text" id="vehicle" name="vehicle" placeholder="e.g. 2022 Jeep Wrangler Rubicon 4xe" required disabled={busy} />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="category">Build Category</label>
          <select id="category" name="category" required disabled={busy} defaultValue="">
            <option value="" disabled>Select a category</option>
            <option value="daily-driven">Daily-Driven</option>
            <option value="trail-built">Trail-Built</option>
            <option value="overland">Overland</option>
            <option value="performance">Performance</option>
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="tagline">One-Line Description</label>
          <input
            type="text"
            id="tagline"
            name="tagline"
            placeholder="e.g. Powerful, aggressive, and built to make an impact."
            required
            disabled={busy}
          />
        </div>
      </div>

      <div className="form-section">
        <h2 className="form-section-title">Key Stats <span className="optional">(Optional, but we love numbers)</span></h2>
        <div className="form-row cols-3">
          <div className="form-field">
            <label htmlFor="statPower">Horsepower / Engine</label>
            <input type="text" id="statPower" name="statPower" placeholder="e.g. 375 HP" disabled={busy} />
          </div>
          <div className="form-field">
            <label htmlFor="statTires">Tire Size</label>
            <input type="text" id="statTires" name="statTires" placeholder="e.g. 37&quot;" disabled={busy} />
          </div>
          <div className="form-field">
            <label htmlFor="statLift">Lift Height</label>
            <input type="text" id="statLift" name="statLift" placeholder="e.g. 3&quot;" disabled={busy} />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h2 className="form-section-title">The Build</h2>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="specEngine">Engine <span className="optional">(Optional)</span></label>
            <input type="text" id="specEngine" name="specEngine" disabled={busy} />
          </div>
          <div className="form-field">
            <label htmlFor="specSuspension">Suspension / Lift <span className="optional">(Optional)</span></label>
            <input type="text" id="specSuspension" name="specSuspension" disabled={busy} />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="specWheelsTires">Wheels &amp; Tires <span className="optional">(Optional)</span></label>
          <input type="text" id="specWheelsTires" name="specWheelsTires" disabled={busy} />
        </div>
        <div className="form-field">
          <label htmlFor="specOther">Other Mods, Armor, Electronics, Etc. <span className="optional">(Optional)</span></label>
          <textarea
            id="specOther"
            name="specOther"
            placeholder="List out anything else worth bragging about."
            disabled={busy}
          />
        </div>
      </div>

      <div className="form-section">
        <h2 className="form-section-title">Your Story</h2>
        <div className="form-field">
          <label htmlFor="story">Tell Us About This Build</label>
          <textarea
            id="story"
            name="story"
            required
            placeholder="What inspired the build? What's it built for? What's it been through?"
            style={{ minHeight: 160 }}
            disabled={busy}
          />
        </div>
      </div>

      <div className="form-section">
        <h2 className="form-section-title">Photos</h2>
        <p className="form-section-hint">Up to {MAX_PHOTOS} photos — we&apos;ll optimize them for upload automatically.</p>
        <div className="photo-upload">
          <label className="photo-upload-label" htmlFor="photos">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 16l4.5-6 3 3.5L16 8l4 8" /><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8" cy="8.5" r="1.4" />
            </svg>
            <span>
              {compressing
                ? "Optimizing photos…"
                : photos.length
                  ? "Add more photos"
                  : "Click to upload photos"}
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

      {errorMsg && <p className="form-error-banner">{errorMsg}</p>}

      <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: "fit-content" }}>
        {status === "submitting" ? "Submitting…" : "Submit Your Build"}
      </button>
    </form>
  );
}
