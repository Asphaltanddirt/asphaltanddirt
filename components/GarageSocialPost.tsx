"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SocialPost } from "@/lib/garageSocial";
import { fullCaption, isAutoPlatform, linkPlan } from "@/lib/socialCopy";

const SHORT_DAY = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/garage/social", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "That didn't save. Try again.");
  return data as { result?: string; message?: string };
}

/** One post on the board: what to post, where, when, and the buttons to do it. */
export default function GarageSocialPost({ item, today }: { item: SocialPost; today: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [url, setUrl] = useState(item.postUrl);
  const [draftIndex, setDraftIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [armed, setArmed] = useState(false);
  const [caption, setCaption] = useState(item.caption);
  const [hashtags, setHashtags] = useState(item.hashtags);
  const [firstComment, setFirstComment] = useState(item.firstComment);
  const [drafts, setDrafts] = useState(item.drafts.join("\n---\n"));
  const [stats, setStats] = useState({
    views: item.stats.views ?? "",
    forYou: item.stats.forYou ?? "",
    shares: item.stats.shares ?? "",
    saves: item.stats.saves ?? "",
    follows: item.stats.follows ?? "",
  });

  async function run(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      await post({ id: item.id, ...body });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      setError("Couldn't copy. Press and hold the text instead.");
    }
  }

  /** Phone: the share sheet (Save to Photos). Desktop: downloads. */
  async function saveAssets() {
    setBusy(true);
    setError("");
    try {
      const files = await Promise.all(
        item.assets.map(async (a, i) => {
          const res = await fetch(`/api/garage/social/asset?id=${item.id}&i=${i}`);
          if (!res.ok) throw new Error();
          const blob = await res.blob();
          return new File([blob], a.filename, { type: a.type || blob.type });
        }),
      );
      if (navigator.canShare?.({ files })) {
        await navigator.share({ files });
      } else {
        for (const file of files) {
          const link = document.createElement("a");
          link.href = URL.createObjectURL(file);
          link.download = file.name;
          link.click();
          URL.revokeObjectURL(link.href);
        }
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) setError("Couldn't save the files. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("id", item.id);
        form.append("file", file);
        const res = await fetch("/api/garage/social/upload", { method: "POST", body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Upload failed.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  /** Post now: two taps, like the Control Room switches. */
  async function postNow() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    setBusy(true);
    setError("");
    try {
      const data = await post({ id: item.id, action: "post-now" });
      if (data.result === "failed" && data.message) setError(data.message);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't go through. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const link = linkPlan(item);
  const auto = isAutoPlatform(item.platform);
  const pasteCaption = fullCaption(item);
  // X counts every character of the post, hashtags included.
  const overLimit = item.platform === "X" && pasteCaption.length > 280;
  const overdue = item.status === "Planned" && item.due < today;
  const dueToday = item.status === "Planned" && item.due === today;
  const isTrailTalk = item.topic === "Trail Talk";
  const showStats = item.status === "Posted" && item.platform === "TikTok";
  const className = [
    "garage-social-card",
    item.status === "Posted" ? "is-posted" : "",
    item.status === "Skipped" ? "is-skipped" : "",
    overdue ? "is-overdue" : "",
    dueToday ? "is-today" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={className}>
      <header className="garage-social-head">
        <span className="garage-social-platform">{item.platform}</span>
        <span className="garage-tag">{item.topic}</span>
        {item.testSlot && <span className="garage-tag garage-tag-new">Test · {item.testSlot}</span>}
        <span className="garage-social-when">
          {overdue ? "Overdue · " : dueToday ? "Today · " : ""}
          {SHORT_DAY(item.due)} · {item.window}
        </span>
      </header>

      <p className="garage-social-what">
        <strong>{item.asset}</strong>
        {item.blogUrl ? (
          <>
            {" "}· <a href={item.blogUrl} target="_blank" rel="noopener">{item.blogTitle || "the blog post"} ↗</a>
          </>
        ) : item.blogTitle ? (
          <> · {item.blogTitle}</>
        ) : null}
      </p>

      {item.assets.length > 0 && (
        <div className="garage-social-assets">
          {item.assets.map((a, i) =>
            a.type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={a.thumb} alt={a.filename} loading="lazy" />
            ) : (
              <span key={i} className="garage-social-file">{a.filename}</span>
            ),
          )}
        </div>
      )}
      {item.status === "Planned" && (
        <div className="garage-social-row">
          {item.assets.length > 0 && (
            <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={saveAssets}>
              Save {item.assets.length > 1 ? `all ${item.assets.length}` : "image"}
            </button>
          )}
          {item.asset !== "Text post" && item.asset !== "Vertical clip" && (
            <label className="btn btn-outline btn-sm garage-social-upload">
              Add image
              <input type="file" accept="image/*" multiple disabled={busy} onChange={(e) => upload(e.target.files)} />
            </label>
          )}
        </div>
      )}

      {isTrailTalk && item.drafts.length > 0 && !editing ? (
        <div className="garage-social-drafts" role="radiogroup" aria-label="Pick an option">
          {item.drafts.map((d, i) => (
            <div key={i} className={i === draftIndex ? "garage-social-draft is-picked" : "garage-social-draft"}>
              <label>
                <input type="radio" name={`draft-${item.id}`} checked={i === draftIndex} onChange={() => setDraftIndex(i)} disabled={item.status !== "Planned"} />
                Option {i + 1}
              </label>
              <p>{d}</p>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => copy(d.replace(/^title:\s*/i, ""), `draft${i}`)}>
                {copied === `draft${i}` ? "Copied" : "Copy"}
              </button>
            </div>
          ))}
        </div>
      ) : pasteCaption && !editing ? (
        <div className="garage-social-caption">
          {item.caption && <p>{item.caption}</p>}
          {link.kind === "caption" && <p>{link.text}</p>}
          {item.hashtags && <p className="garage-social-tags">{item.hashtags}</p>}
          {overLimit && (
            <p className="garage-error">
              {pasteCaption.length} characters, X allows 280. Edit before posting.
            </p>
          )}
          <button type="button" className="btn btn-outline btn-sm" onClick={() => copy(pasteCaption, "caption")}>
            {copied === "caption" ? "Copied" : item.hashtags ? "Copy caption + hashtags" : "Copy caption"}
          </button>
        </div>
      ) : null}

      {!isTrailTalk && !editing && link.kind !== "none" && link.kind !== "caption" && (
        <div className="garage-social-caption garage-social-comment">
          <span className="garage-social-label">
            {link.kind === "comment" ? "First comment" : link.kind === "reply" ? "Reply to your post" : "Link in bio"}
          </span>
          <p>{link.text}</p>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => copy(link.text, "link")}>
            {copied === "link" ? "Copied" : link.kind === "bio" ? "Copy link for bio" : link.kind === "reply" ? "Copy reply" : "Copy comment"}
          </button>
        </div>
      )}

      {editing ? (
        <div className="garage-social-edit">
          {isTrailTalk ? (
            <label>
              Options (separate with a line of ---; start each with &quot;Title: &quot;)
              <textarea rows={8} value={drafts} onChange={(e) => setDrafts(e.target.value)} />
            </label>
          ) : (
            <>
              <label>
                Caption
                <textarea rows={6} value={caption} onChange={(e) => setCaption(e.target.value)} />
              </label>
              <label>
                Hashtags
                <textarea rows={2} value={hashtags} onChange={(e) => setHashtags(e.target.value)} />
              </label>
              {(item.platform.startsWith("Facebook") || item.platform === "X") && (
                <label>
                  {item.platform === "X" ? "Reply" : item.platform === "Facebook Page" ? "Link line at the end of the caption" : "First comment"} (blank = the blog link)
                  <textarea rows={2} value={firstComment} onChange={(e) => setFirstComment(e.target.value)} />
                </label>
              )}
            </>
          )}
          <div className="garage-social-row">
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => run(isTrailTalk ? { action: "text", drafts } : { action: "text", caption, hashtags, firstComment })}>
              Save
            </button>
            <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        item.status === "Planned" && (
          <button type="button" className="garage-social-link" onClick={() => setEditing(true)}>
            {isTrailTalk ? (item.drafts.length ? "Edit options" : "Add options") : item.caption ? "Edit caption" : "Add caption"}
          </button>
        )
      )}

      {item.notes && <p className="garage-form-note">{item.notes}</p>}

      {auto && item.status === "Planned" && !editing && (
        <div className={`garage-social-auto is-${(item.autoStatus || (item.approved ? "approved" : "off")).toLowerCase().replace(" ", "-")}`}>
          <span className="garage-social-label">Auto-post</span>
          <p>
            {item.autoLog ||
              (item.approved
                ? `Approved${item.approvedBy ? ` by ${item.approvedBy.split(" ")[0]}` : ""}. Goes out on its own at the start of ${item.window}.`
                : "Approve it and it posts itself at the start of its window.")}
          </p>
          <div className="garage-social-row">
            {item.approved ? (
              <button type="button" className="btn btn-outline btn-sm" disabled={busy || item.autoStatus === "Processing"} onClick={() => run({ action: "unapprove" })}>
                Unapprove
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => run({ action: "approve" })}>
                Approve
              </button>
            )}
            <button
              type="button"
              className={armed ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"}
              disabled={busy || item.autoStatus === "Processing"}
              onClick={postNow}
              onBlur={() => setArmed(false)}
            >
              {armed ? "Tap again to post now" : "Post now"}
            </button>
          </div>
        </div>
      )}

      {item.status === "Planned" ? (
        <div className="garage-social-post">
          <input
            type="url"
            inputMode="url"
            placeholder="Paste the post link"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={busy}
            aria-label={`Link to the ${item.platform} post`}
          />
          <div className="garage-social-row">
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => run({ action: "posted", url, draftIndex })}>
              Mark posted
            </button>
            <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => run({ action: "skip" })}>
              Skip
            </button>
          </div>
          {isTrailTalk && <p className="garage-form-note">Marking it posted puts the picked option and the link into Thursday&apos;s newsletter.</p>}
        </div>
      ) : (
        <div className="garage-social-done">
          <p>
            <strong>{item.status === "Posted" ? "Posted" : "Skipped"}</strong>
            {item.postedBy && ` by ${item.postedBy.split(" ")[0]}`}
            {item.postedAt && ` · ${new Date(item.postedAt).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })}`}
            {item.postUrl && (
              <>
                {" "}· <a href={item.postUrl} target="_blank" rel="noopener">View post ↗</a>
              </>
            )}
          </p>
          <button type="button" className="garage-social-link" disabled={busy} onClick={() => run({ action: "undo" })}>
            Undo
          </button>
        </div>
      )}

      {showStats && (
        <details className="garage-social-stats" open={Boolean(item.testSlot) && item.stats.views === null}>
          <summary>7-day numbers{item.stats.views !== null ? ` · ${item.stats.views} views` : ""}</summary>
          <div className="garage-social-stat-grid">
            {(
              [
                ["views", "Views"],
                ["forYou", "For You %"],
                ["shares", "Shares"],
                ["saves", "Saves"],
                ["follows", "Follows"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={stats[key]}
                  onChange={(e) => setStats((s) => ({ ...s, [key]: e.target.value }))}
                  disabled={busy}
                />
              </label>
            ))}
          </div>
          <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => run({ action: "stats", stats })}>
            Save numbers
          </button>
        </details>
      )}

      {error && <p className="garage-error" role="alert">{error}</p>}
    </article>
  );
}
