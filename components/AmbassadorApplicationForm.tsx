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

// Mirrors the "Culture Areas" multipleSelects field in Airtable exactly.
const CULTURE_AREAS = [
  "Street cars", "Project cars", "Muscle", "Imports", "Motorsports", "Drag racing",
  "Autocross", "Track days", "Jeep / 4x4", "Trail riding", "Overlanding", "Trucks",
  "SxS / UTV", "ATV", "Dirt bikes", "Automotive photography", "Automotive video",
  "Fabrication / mechanical work", "Shows / meets", "Clubs / events",
  "Family automotive activities", "Other",
];

// Mirrors the "Interest Areas" multipleSelects field in Airtable exactly.
const INTEREST_AREAS = [
  "Product testing", "Event coverage", "Podcast appearances", "Build features",
  "Photography assignments", "Video collaborations", "Community events",
  "Charity initiatives", "Local A&D activations", "Limited merchandise collaborations",
];

// The itemized Road & Trail Crew standards applicants individually confirm.
// All must be checked to submit — stored collectively as one "Conduct Standards
// Accepted" field in Airtable, since they're always all-true together at submit time.
const STANDARDS = [
  "I understand that A&D does not support street takeovers or illegal street racing.",
  "I will not present reckless public-road driving as endorsed by A&D.",
  "I will respect legal trails, closures, property, and environmental rules.",
  "I will not promote harassment, discrimination, threats, or hate speech while representing A&D.",
  "I will clearly disclose my relationship with A&D when required.",
  "I will not use self-referrals, fake orders, or discount manipulation to generate commission.",
  "I understand that personal purchases do not generate ambassador commission.",
  "I understand that being an A&D Ambassador does not make me an employee or official spokesperson for Asphalt & Dirt.",
  "I understand that acceptance into the program is selective.",
];

type Status = "idle" | "submitting" | "success" | "error";
type Photo = { file: File; url: string };

export default function AmbassadorApplicationForm() {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [cultureAreas, setCultureAreas] = useState<string[]>([]);
  const [interestAreas, setInterestAreas] = useState<string[]>([]);
  const [standardsAccepted, setStandardsAccepted] = useState<boolean[]>(() => STANDARDS.map(() => false));
  const [contentCommitment, setContentCommitment] = useState("");
  const [mediaCommitment, setMediaCommitment] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const busy = status === "submitting" || compressing;
  const allStandardsAccepted = standardsAccepted.every(Boolean);
  const showCommitmentNotes = contentCommitment === "Depends" || mediaCommitment === "Depends";

  function toggle(setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) {
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  function toggleStandard(index: number) {
    setStandardsAccepted((prev) => prev.map((v, i) => (i === index ? !v : v)));
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

    if (!allStandardsAccepted) {
      setErrorMsg("Please confirm every Road & Trail Crew standard below.");
      return;
    }

    data.delete("photos");
    photos.forEach((p) => data.append("photos", p.file));
    contentTypes.forEach((v) => data.append("contentTypes", v));
    cultureAreas.forEach((v) => data.append("cultureAreas", v));
    interestAreas.forEach((v) => data.append("interestAreas", v));
    data.set("conductAccepted", "on");

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

      {/* Section 1 — About You */}
      <div className="form-section">
        <div className="form-section-title">About You</div>
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
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="socialHandle">Primary Social Media Handle</label>
            <input type="text" id="socialHandle" name="socialHandle" placeholder="e.g. @yourhandle" required disabled={busy} />
          </div>
          <div className="form-field">
            <label htmlFor="socialLinks">Other Social Links <span className="optional">(Optional)</span></label>
            <input type="text" id="socialLinks" name="socialLinks" placeholder="One per line" disabled={busy} />
          </div>
        </div>
        <label className="form-field-consent" htmlFor="ageConfirmed">
          <input type="checkbox" id="ageConfirmed" name="ageConfirmed" required disabled={busy} />
          <span>I am 18 years of age or older.</span>
        </label>
      </div>

      {/* Section 2 — Your Automotive Life */}
      <div className="form-section">
        <div className="form-section-title">Your Automotive Life</div>
        <div className="form-field">
          <label htmlFor="vehicle">Vehicles, Builds, Bikes, Or Machines You&apos;re Involved With</label>
          <textarea
            id="vehicle"
            name="vehicle"
            placeholder="Year, make, model, major modifications, current projects — whatever's worth knowing"
            required
            disabled={busy}
          />
        </div>
        <div className="form-field">
          <label>Which Parts Of Automotive Culture Are You Most Active In? <span className="optional">(Select all that apply)</span></label>
          <div className="form-checkbox-group">
            {CULTURE_AREAS.map((area) => (
              <label className={`form-checkbox${cultureAreas.includes(area) ? " has-check" : ""}`} key={area}>
                <input
                  type="checkbox"
                  checked={cultureAreas.includes(area)}
                  onChange={() => toggle(setCultureAreas, area)}
                  disabled={busy}
                />
                {area}
              </label>
            ))}
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="clubs">Clubs, Events, Or Communities You&apos;re A Member Of, Or Organize <span className="optional">(Optional)</span></label>
          <input type="text" id="clubs" name="clubs" disabled={busy} />
        </div>
      </div>

      {/* Section 3 — Your Content */}
      <div className="form-section">
        <div className="form-section-title">Your Content</div>
        <div className="form-field">
          <label>Which Types Of Content Can You Create? <span className="optional">(Select all that apply)</span></label>
          <div className="form-checkbox-group">
            {CONTENT_TYPES.map((type) => (
              <label className={`form-checkbox${contentTypes.includes(type.value) ? " has-check" : ""}`} key={type.value}>
                <input
                  type="checkbox"
                  checked={contentTypes.includes(type.value)}
                  onChange={() => toggle(setContentTypes, type.value)}
                  disabled={busy}
                />
                {type.label}
              </label>
            ))}
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="contentLinks">Show Us Some Of Your Work <span className="optional">(Optional — up to 3 links)</span></label>
          <textarea id="contentLinks" name="contentLinks" placeholder="Links to posts, videos, or a portfolio — one per line" disabled={busy} />
        </div>
        <div className="form-field">
          <label htmlFor="contentFrequency">How Often Do You Currently Create Or Share Automotive Content?</label>
          <select id="contentFrequency" name="contentFrequency" required disabled={busy} defaultValue="">
            <option value="" disabled>Select one</option>
            <option>Several times per week</option>
            <option>About once per week</option>
            <option>A few times per month</option>
            <option>Occasionally</option>
            <option>More through events/community than social content</option>
          </select>
        </div>
      </div>

      {/* Section 4 — Your Community */}
      <div className="form-section">
        <div className="form-section-title">Your Community</div>
        <div className="form-field">
          <label htmlFor="audienceSize">Approximately How Large Is Your Primary Audience?</label>
          <p className="form-section-hint">Follower count does not determine acceptance.</p>
          <select id="audienceSize" name="audienceSize" required disabled={busy} defaultValue="">
            <option value="" disabled>Select one</option>
            <option>Under 500</option>
            <option>500–1,999</option>
            <option>2,000–4,999</option>
            <option>5,000–9,999</option>
            <option>10,000–24,999</option>
            <option>25,000+</option>
            <option>Not primarily a social-media creator</option>
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="audience">How Would You Describe Your Audience Or Community? <span className="optional">(Optional)</span></label>
          <textarea id="audience" name="audience" placeholder="What are they into? Where are they located? What makes them engage with you?" disabled={busy} />
        </div>
        <div className="form-field">
          <label htmlFor="meaningfulEngagement">What Does Meaningful Engagement Look Like For You? <span className="optional">(Optional)</span></label>
          <textarea id="meaningfulEngagement" name="meaningfulEngagement" disabled={busy} />
        </div>
      </div>

      {/* Section 5 — Why A&D */}
      <div className="form-section">
        <div className="form-section-title">Why A&amp;D</div>
        <div className="form-field">
          <label htmlFor="why">Why Do You Want To Join The A&amp;D Road &amp; Trail Crew?</label>
          <textarea id="why" name="why" required style={{ minHeight: 130 }} disabled={busy} />
        </div>
        <div className="form-field">
          <label htmlFor="contribution">What Could You Contribute Beyond Merchandise Sales?</label>
          <textarea
            id="contribution"
            name="contribution"
            placeholder="Photography/video, build knowledge, event representation, club relationships, guest referrals, technical expertise, local knowledge, or anything else"
            required
            style={{ minHeight: 130 }}
            disabled={busy}
          />
        </div>
        <div className="form-field">
          <label htmlFor="cultureVision">What Do You Want Automotive Culture To Become? <span className="optional">(Optional)</span></label>
          <textarea id="cultureVision" name="cultureVision" disabled={busy} />
        </div>
      </div>

      {/* Section 6 — Availability + Participation */}
      <div className="form-section">
        <div className="form-section-title">Availability &amp; Participation</div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="contentCommitment">Can You Create At Least 2 Relevant A&amp;D Mentions Or Content Pieces Per Month?</label>
            <select
              id="contentCommitment"
              name="contentCommitment"
              required
              disabled={busy}
              value={contentCommitment}
              onChange={(e) => setContentCommitment(e.target.value)}
            >
              <option value="" disabled>Select one</option>
              <option>Yes</option>
              <option>No</option>
              <option>Depends</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="mediaCommitment">Can You Provide At Least 1 Usable Original Photo Or Video Each Month?</label>
            <select
              id="mediaCommitment"
              name="mediaCommitment"
              required
              disabled={busy}
              value={mediaCommitment}
              onChange={(e) => setMediaCommitment(e.target.value)}
            >
              <option value="" disabled>Select one</option>
              <option>Yes</option>
              <option>No</option>
              <option>Depends</option>
            </select>
          </div>
        </div>
        {showCommitmentNotes && (
          <div className="form-field">
            <label htmlFor="commitmentNotes">Tell Us More About That</label>
            <textarea id="commitmentNotes" name="commitmentNotes" disabled={busy} />
          </div>
        )}
        <div className="form-field">
          <label htmlFor="eventInterest">Would You Be Interested In Representing A&amp;D At Local Automotive Events?</label>
          <select id="eventInterest" name="eventInterest" required disabled={busy} defaultValue="">
            <option value="" disabled>Select one</option>
            <option>Yes</option>
            <option>No</option>
            <option>Maybe</option>
          </select>
        </div>
        <div className="form-field">
          <label>Are You Interested In Any Of The Following? <span className="optional">(Optional — select all that apply)</span></label>
          <div className="form-checkbox-group">
            {INTEREST_AREAS.map((area) => (
              <label className={`form-checkbox${interestAreas.includes(area) ? " has-check" : ""}`} key={area}>
                <input
                  type="checkbox"
                  checked={interestAreas.includes(area)}
                  onChange={() => toggle(setInterestAreas, area)}
                  disabled={busy}
                />
                {area}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Section 7 — Other Brand Relationships */}
      <div className="form-section">
        <div className="form-section-title">Other Brand Relationships</div>
        <div className="form-field">
          <label htmlFor="otherBrands">Do You Currently Have Ambassador, Affiliate, Sponsorship, Or Paid Relationships With Other Automotive Brands? <span className="optional">(Optional)</span></label>
          <input type="text" id="otherBrands" name="otherBrands" placeholder="None, or list them" disabled={busy} />
        </div>
      </div>

      {/* Photos */}
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

      {/* Section 8 — Standards */}
      <div className="form-section">
        <div className="form-section-title">Road &amp; Trail Crew Standards</div>
        <p className="form-section-hint">Please confirm each statement.</p>
        <div className="form-checkbox-group form-checkbox-group-stacked">
          {STANDARDS.map((statement, i) => (
            <label className={`form-checkbox${standardsAccepted[i] ? " has-check" : ""}`} key={i}>
              <input type="checkbox" checked={standardsAccepted[i]} onChange={() => toggleStandard(i)} disabled={busy} />
              {statement}
            </label>
          ))}
        </div>
      </div>

      {/* Final */}
      <div className="form-section">
        <div className="form-field">
          <label htmlFor="additionalInfo">Anything Else We Should Know? <span className="optional">(Optional)</span></label>
          <textarea id="additionalInfo" name="additionalInfo" placeholder="About you, your build, your community, or what you could bring to the crew" disabled={busy} />
        </div>
      </div>

      {errorMsg && <p className="form-error-banner">{errorMsg}</p>}

      <button className="btn btn-primary" type="submit" disabled={busy || !allStandardsAccepted} style={{ width: "fit-content" }}>
        {status === "submitting" ? "Submitting…" : "Submit Application"}
      </button>
    </form>
  );
}
