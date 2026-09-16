"use client";

import { useState } from "react";
import type { CrewProfileEdit } from "@/lib/garageCrew";

/** The crew member edits their own public profile — the bio and socials that
 *  show on /team. Saved straight to their ambassador record. */
export default function GarageProfileForm({ initial }: { initial: CrewProfileEdit }) {
  const [form, setForm] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  const set = (key: keyof CrewProfileEdit) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
        body: JSON.stringify(form),
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

      <label htmlFor="p-ig">Instagram link</label>
      <input id="p-ig" type="url" inputMode="url" value={form.instagramUrl} onChange={set("instagramUrl")} placeholder="https://instagram.com/…" />

      <label htmlFor="p-tt">TikTok link</label>
      <input id="p-tt" type="url" inputMode="url" value={form.tiktokUrl} onChange={set("tiktokUrl")} placeholder="https://tiktok.com/@…" />

      <label htmlFor="p-yt">YouTube link</label>
      <input id="p-yt" type="url" inputMode="url" value={form.youtubeUrl} onChange={set("youtubeUrl")} placeholder="https://youtube.com/@…" />

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
