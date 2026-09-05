"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

interface SocialLink {
  platform: string;
  url: string;
}

const MAX_BIO_LENGTH = 800;
const PLATFORM_OPTIONS = ["Instagram", "TikTok", "Facebook", "X", "Website", "Other"];

export default function GuestIntakeForm() {
  const [hasChannel, setHasChannel] = useState(false);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([{ platform: "Instagram", url: "" }]);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const busy = status === "submitting";

  function updateSocialLink(index: number, patch: Partial<SocialLink>) {
    setSocialLinks((links) => links.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  }

  function addSocialLink() {
    setSocialLinks((links) => [...links, { platform: "Instagram", url: "" }]);
  }

  function removeSocialLink(index: number) {
    setSocialLinks((links) => links.filter((_, i) => i !== index));
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

    const payload = {
      name: ((data.get("name") as string) || "").trim(),
      email: ((data.get("email") as string) || "").trim(),
      phone: ((data.get("phone") as string) || "").trim(),
      bio: ((data.get("bio") as string) || "").trim(),
      socialLinks: socialLinks
        .map((l) => ({ platform: l.platform, url: l.url.trim() }))
        .filter((l) => l.url),
      hasYoutubeChannel: hasChannel,
      youtubeUrl: ((data.get("youtubeUrl") as string) || "").trim(),
    };

    if (!payload.name || !payload.email || !payload.bio) {
      setErrorMsg("Please fill out your name, email, and a short bio.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      setErrorMsg("A valid email is required.");
      return;
    }

    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/submit-guest-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "Something went wrong. Please try again.");

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
        <h2>Thanks!</h2>
        <p className="lead" style={{ maxWidth: 480 }}>
          Got it — we&apos;ll be in touch to finalize details before the episode goes up.
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
            <label htmlFor="name">Full Name</label>
            <input type="text" id="name" name="name" required disabled={busy} />
          </div>
          <div className="form-field">
            <label htmlFor="email">Email <span className="optional">(Never published)</span></label>
            <input type="email" id="email" name="email" required disabled={busy} />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="phone">Phone <span className="optional">(Optional, never published)</span></label>
          <input type="tel" id="phone" name="phone" disabled={busy} />
        </div>
      </div>

      <div className="form-section">
        <div className="form-field">
          <label htmlFor="bio">Short Bio <span className="optional">(This is what we&apos;ll post)</span></label>
          <textarea
            id="bio"
            name="bio"
            required
            maxLength={MAX_BIO_LENGTH}
            placeholder="A couple sentences about who you are and what you build/ride/do."
            style={{ minHeight: 120 }}
            disabled={busy}
          />
        </div>
        <div className="form-field">
          <label>Social Links / Website <span className="optional">(Optional — add as many as you have)</span></label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {socialLinks.map((link, i) => (
              <div key={i} className="form-row" style={{ gridTemplateColumns: "140px 1fr auto", alignItems: "center" }}>
                <select
                  aria-label="Platform"
                  value={link.platform}
                  onChange={(e) => updateSocialLink(i, { platform: e.target.value })}
                  disabled={busy}
                >
                  {PLATFORM_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <input
                  type="text"
                  aria-label={`${link.platform} URL`}
                  placeholder="https://…"
                  value={link.url}
                  onChange={(e) => updateSocialLink(i, { url: e.target.value })}
                  disabled={busy}
                />
                {socialLinks.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => removeSocialLink(i)}
                    disabled={busy}
                    aria-label={`Remove ${link.platform} link`}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="view-all mt-2"
            onClick={addSocialLink}
            disabled={busy}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            + Add Another Link
          </button>
        </div>
      </div>

      <div className="form-section">
        <label className="form-field-consent" htmlFor="hasYoutubeChannel">
          <input
            type="checkbox"
            id="hasYoutubeChannel"
            checked={hasChannel}
            onChange={(e) => setHasChannel(e.target.checked)}
            disabled={busy}
          />
          <span>I have my own YouTube channel</span>
        </label>
        {hasChannel && (
          <div className="form-field mt-2">
            <label htmlFor="youtubeUrl">YouTube Channel URL</label>
            <input type="text" id="youtubeUrl" name="youtubeUrl" placeholder="https://youtube.com/@yourchannel" disabled={busy} />
          </div>
        )}
      </div>

      {errorMsg && <p className="form-error-banner">{errorMsg}</p>}

      <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: "fit-content" }}>
        {status === "submitting" ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
