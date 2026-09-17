"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TaggedPost } from "@/lib/garageReview";

/** Posts that tagged A&D, shown on the Community page: show/hide each one,
 *  and add a new one from its link. */
export default function GarageTaggedPosts({ posts }: { posts: TaggedPost[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ posterName: "", platform: "TikTok", postUrl: "" });

  async function send(key: string, body: Record<string, unknown>) {
    setBusy(key);
    setError("");
    try {
      const res = await fetch("/api/garage/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save that. Try again.");
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that. Try again.");
      return false;
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      {posts.length === 0 ? (
        <p className="garage-empty">No tagged posts yet.</p>
      ) : (
        <ul className="garage-roster">
          {posts.map((p) => (
            <li key={p.id} className="garage-tagged-row">
              <span className="garage-app-main">
                <strong>{p.posterName || "(no name)"}</strong>
                <span className="garage-roster-meta">
                  {p.platform} · <a href={p.postUrl} target="_blank" rel="noopener">Open post ↗</a>
                </span>
              </span>
              <button
                type="button"
                className={p.approved ? "btn btn-outline btn-sm" : "btn btn-primary btn-sm"}
                disabled={busy === p.id}
                onClick={() => send(p.id, { kind: "post", id: p.id, approved: !p.approved })}
              >
                {p.approved ? "Hide" : "Show"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="garage-form garage-tagged-add"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await send("add", { kind: "post-add", ...form })) setForm({ posterName: "", platform: form.platform, postUrl: "" });
        }}
      >
        <h3>Add a post</h3>
        <label htmlFor="tp-name">Who posted it</label>
        <input id="tp-name" value={form.posterName} onChange={(e) => setForm({ ...form, posterName: e.target.value })} placeholder="Rachel or @theirhandle" />
        <label htmlFor="tp-platform">Platform</label>
        <select id="tp-platform" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
          <option>TikTok</option>
          <option>Instagram</option>
        </select>
        <label htmlFor="tp-url">Link to the post</label>
        <input id="tp-url" type="url" inputMode="url" value={form.postUrl} onChange={(e) => setForm({ ...form, postUrl: e.target.value })} placeholder="https://www.tiktok.com/@…/video/…" />
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy === "add"}>
          {busy === "add" ? "Adding…" : "Add and show it"}
        </button>
      </form>
      {error && <p className="garage-error" role="alert">{error}</p>}
    </div>
  );
}
