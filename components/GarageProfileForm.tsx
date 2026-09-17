"use client";

import { useState } from "react";
import type { CrewProfileEdit } from "@/lib/garageCrew";
import { socialUrl } from "@/lib/socialLinks";
import SocialLinksEditor, { type SocialRow } from "./SocialLinksEditor";

/** The crew member edits their own public profile — the bio and socials that
 *  show on /team. Saved straight to their ambassador record. */
export default function GarageProfileForm({ initial }: { initial: CrewProfileEdit }) {
  const [form, setForm] = useState(initial);
  const [socials, setSocials] = useState<SocialRow[]>(() => initial.socials.map((l) => ({ platform: l.platform, value: l.url })));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  const set = (key: "tagline" | "bio" | "vehicle") => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setState("idle");
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    setError("");
    try {
      const res = await fetch("/api/garage/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          socials: socials.map((r) => ({ platform: r.platform, url: socialUrl(r.platform, r.value) })).filter((r) => r.url),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save that. Try again.");
      setState("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that. Try again.");
      setState("error");
    }
  }

  return (
    <form className="garage-form" onSubmit={save}>
      <label htmlFor="p-tagline">One-liner</label>
      <input id="p-tagline" value={form.tagline} onChange={set("tagline")} maxLength={120} placeholder="Trail guide, gear tester, dad." />

      <label htmlFor="p-bio">Bio</label>
      <textarea id="p-bio" value={form.bio} onChange={set("bio")} rows={5} maxLength={2000} />

      <label htmlFor="p-vehicle">Your rig</label>
      <input id="p-vehicle" value={form.vehicle} onChange={set("vehicle")} maxLength={120} placeholder="2021 Wrangler Rubicon on 37s" />

      <SocialLinksEditor
        idPrefix="p-social"
        rows={socials}
        onChange={(rows) => {
          setSocials(rows);
          setState("idle");
        }}
        disabled={state === "saving"}
        legend="Your social links"
        hint="Every account you post on. Each one shows as a button on your team page."
      />

      {error && <p className="garage-error" role="alert">{error}</p>}
      <button className="btn btn-primary garage-block-btn" type="submit" disabled={state === "saving"}>
        {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Save profile"}
      </button>
      <p className="garage-form-note" aria-live="polite">
        {state === "saved" ? "Live on your team page within a few minutes." : "This is what shows on your /team page."}
      </p>
    </form>
  );
}
