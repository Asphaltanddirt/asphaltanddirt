"use client";

import { useMemo, useState } from "react";
import { buildEventNotice, noticeImagePrompt, type NoticeKind } from "@/lib/eventNoticeText";

/**
 * Something changed about an event — ONE screen, top to bottom (Jose,
 * 2026-09-24, after the Call it off dry run: "all one screen, email gets image
 * too now").
 *
 *   What happened → Why → the Robin prompt (builds itself as you type) →
 *   the photo → Send me a test / one final send.
 *
 * It replaces two panels ("Call it off" and "Tell everyone who RSVP'd") that
 * did overlapping halves of the same job. The social notice is assumed: pick
 * Cancelled or Postponed and it goes out, same image and caption everywhere,
 * and the email carries the image too.
 *
 * Email and posts carry BOTH the text and the photo, on purpose — if the
 * image gets skipped past, the words still land. The photo is required for a
 * cancel or postpone ("because of IG, make the image mandatory"): Instagram
 * can't post without one, and one channel falling behind is the failure here.
 */

type Result = { platform: string; posted: boolean; url?: string; error?: string };
type Done = { steps: Record<string, string>; emailed: number; text: string; results: Result[]; kind: NoticeKind };

// Stay under Vercel's ~4.5 MB request cap however big the phone's file is.
async function shrink(file: File): Promise<File> {
  if (file.size <= 3.5 * 1024 * 1024 || !file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2160 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
  return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
}

export default function GarageEventChange({
  slug,
  title,
  date,
  rsvpCount,
  canCallOff,
  cancelled = false,
  preset,
}: {
  slug: string;
  title: string;
  date: string | null;
  rsvpCount: number;
  /** False for a draft or an already-cancelled event. */
  canCallOff: boolean;
  /** Cancelled events can come back: "Back on" is a postpone with a new date,
   *  and everyone who RSVP'd gets asked whether it works (waivers stay). */
  cancelled?: boolean;
  /** "go": the morning-of "it's on" email (punchlist 14) — opens on Just an
   *  update with the words already written, ready to check and send. */
  preset?: "go";
}) {
  const [kind, setKind] = useState<NoticeKind>(preset === "go" ? "update" : canCallOff ? "cancelled" : cancelled ? "postponed" : "update");
  const [newDate, setNewDate] = useState("");
  const [why, setWhy] = useState(
    preset === "go"
      ? "It's a go! Weather and trails look good. Meet at the spot and time in your details email, fueled up and with your GMRS radio ready. See you there."
      : "",
  );
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState("");
  const [done, setDone] = useState<Done | null>(null);

  const callingOff = kind !== "update";
  const ready = why.trim().length > 0 && (kind !== "postponed" || !!newDate);
  const canSend = ready && (!callingOff || !!photo);
  const event = { title, date };
  const input = { event, kind, why, newDate: kind === "postponed" ? newDate : undefined, rescheduled: cancelled && kind === "postponed" };
  const prompt = useMemo(() => (callingOff && ready ? noticeImagePrompt(input) : ""), [callingOff, ready, kind, why, newDate]); // eslint-disable-line react-hooks/exhaustive-deps
  const caption = useMemo(() => (callingOff && ready ? buildEventNotice(input) : ""), [callingOff, ready, kind, why, newDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const people = `${rsvpCount} RSVP${rsvpCount === 1 ? "" : "s"}`;
  const reset = () => {
    setArmed(false);
    setNote("");
  };

  async function pickPhoto(file: File | undefined) {
    reset();
    if (!file) return;
    const small = await shrink(file).catch(() => file);
    setPhoto(small);
    setPreview(URL.createObjectURL(small));
  }

  function copy(text: string, what: string) {
    navigator.clipboard?.writeText(text).then(() => setCopied(what)).catch(() => {});
  }

  async function send(mode: "test" | "live") {
    setBusy(true);
    setNote("");
    try {
      const form = new FormData();
      form.set("slug", slug);
      form.set("kind", kind);
      form.set("why", why);
      form.set("mode", mode);
      if (kind === "postponed") form.set("newDate", newDate);
      if (photo) form.set("file", photo);
      const res = await fetch("/api/garage/event/call-off", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "That didn't go through.");
      if (mode === "test") {
        setNote(`Test sent to ${data.sentTo}. Read it, then send it for real.`);
      } else {
        setDone({ ...data, kind });
      }
      setArmed(false);
    } catch (err) {
      setNote(err instanceof Error ? err.message : "That didn't go through.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    // Jose, 2026-09-24: "i can share from page into group" — so the last step
    // is the Page post's own Share button, not a copy-paste.
    const pagePost = done.results.find((r) => r.platform === "Facebook Page" && r.posted)?.url;
    return (
      <div className="garage-panel garage-form" id="change">
        <h2>Done — {done.emailed} emailed</h2>
        <ul className="garage-form-note">
          {Object.entries(done.steps).map(([k, v]) => (
            <li key={k}>{v}</li>
          ))}
        </ul>

        {done.kind !== "update" && (
          <>
            <h2 className="mt-4">TikTok, by hand</h2>
            <p className="garage-form-note">
              TikTok can&apos;t be posted automatically. Save the image, then post it in TikTok as a photo post with this caption.
            </p>
            <div className="card-actions">
              {preview && (
                <a className="btn btn-primary btn-sm" href={preview} download={photo?.name || "notice.jpg"}>
                  Save image
                </a>
              )}
              <button className="btn btn-outline btn-sm" onClick={() => copy(done.text, "tiktok")}>
                {copied === "tiktok" ? "Copied" : "Copy TikTok caption"}
              </button>
            </div>

            <h2 className="mt-4">Last step: the Facebook group</h2>
            <p className="garage-form-note">
              Meta has no Groups posting API, so share the Page post into the group — same image, same words.
            </p>
            {pagePost ? (
              <>
                <a
                  className="btn btn-primary btn-sm"
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pagePost)}`}
                  target="_blank"
                  rel="noopener"
                >
                  Share with the FB group ↗
                </a>
                <p className="garage-form-note">Facebook opens its share screen: pick &ldquo;Share to a group&rdquo;, then ours.</p>
              </>
            ) : (
              <>
                <p className="garage-form-note">The Page post didn&apos;t go out, so post this in the group with the photo:</p>
                <textarea id="ch-group" rows={5} readOnly value={done.text} />
                <div className="card-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => copy(done.text, "group")}>
                    {copied === "group" ? "Copied" : "Copy the text"}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {note && (
          <p className="garage-error" role="status">
            {note}
          </p>
        )}
      </div>
    );
  }

  const finalLabel = callingOff ? "Send everything" : `Send to ${people}`;

  return (
    <div className="garage-panel garage-form" id="change">
      <h2>Call it off or send an update</h2>
      <p className="garage-form-note">
        {callingOff
          ? `One send does all of it: the event is marked, ${people} emailed, the notice posted to X, Threads, the Facebook Page and Instagram, any queued promos held, and TikTok handed to you to post by hand.`
          : `Emails the ${people}. Nothing else changes.`}
      </p>

      <fieldset className="garage-choice-group">
        <legend>What happened</legend>
        {(
          [
            ["cancelled", "Cancelled", "It's off. Their waiver stays on file."],
            cancelled
              ? (["postponed", "Back on", "Rescheduled. Pick the new date; everyone who RSVP'd is asked if it works. Waivers stay."] as const)
              : (["postponed", "Postponed", "Moved to another day. Same waiver, new date."] as const),
            ["update", "Just an update", "Meetup moved, bring tire chains, running late. Email only."],
          ] as const
        )
          .filter(([value]) => canCallOff || value === "update" || (cancelled && value === "postponed"))
          .map(([value, label, help]) => (
            <label key={value} className="garage-choice">
              <input type="radio" name="changeKind" checked={kind === value} onChange={() => { setKind(value); reset(); }} />
              <span>
                <strong>{label}</strong>
                <small>{help}</small>
              </span>
            </label>
          ))}
      </fieldset>

      {kind === "postponed" && (
        <>
          <label htmlFor="ch-date">New date</label>
          <input id="ch-date" type="date" value={newDate} onChange={(e) => { setNewDate(e.target.value); reset(); }} />
        </>
      )}

      <label htmlFor="ch-why">Why</label>
      <textarea
        id="ch-why"
        rows={4}
        value={why}
        onChange={(e) => { setWhy(e.target.value); reset(); }}
        placeholder="The nor'easter is putting the Pine Barrens roads under water."
      />
      <p className="garage-form-note">One or two lines. Everything else is written for you.</p>

      {callingOff && (
        <>
          <label htmlFor="ch-prompt">The graphic: send this to Robin</label>
          {prompt ? (
            <>
              <textarea id="ch-prompt" rows={7} readOnly value={prompt} />
              <div className="card-actions">
                <button className="btn btn-outline btn-sm" onClick={() => copy(prompt, "prompt")}>
                  {copied === "prompt" ? "Copied" : "Copy the prompt"}
                </button>
              </div>
            </>
          ) : (
            <p className="garage-form-note">Fills itself in once you&apos;ve said why{kind === "postponed" ? " and picked the date" : ""}.</p>
          )}

          <label htmlFor="ch-photo">The photo</label>
          <input id="ch-photo" type="file" accept="image/*" onChange={(e) => pickPhoto(e.target.files?.[0])} />
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="The notice graphic" style={{ maxWidth: 240, borderRadius: 8, marginTop: 6 }} />
          )}
          <p className="garage-form-note">Required. Goes on every post and in the email, with the text.</p>

          {caption && (
            <>
              <label htmlFor="ch-caption">What the posts say</label>
              <textarea id="ch-caption" rows={5} readOnly value={caption} />
            </>
          )}
        </>
      )}

      <div className="card-actions mt-2">
        <button className="btn btn-outline btn-sm" onClick={() => send("test")} disabled={busy || !ready}>
          Send me a test
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => (armed ? send("live") : setArmed(true))}
          disabled={busy || !canSend}
        >
          {busy ? "Working…" : armed ? "Tap again — this sends it" : finalLabel}
        </button>
      </div>
      {callingOff && !photo && ready && <p className="garage-form-note">Add the photo to send — Instagram can&apos;t post without it.</p>}

      {note && (
        <p className={note.startsWith("Test sent") ? "garage-form-note" : "garage-error"} role="status">
          {note}
        </p>
      )}
    </div>
  );
}
