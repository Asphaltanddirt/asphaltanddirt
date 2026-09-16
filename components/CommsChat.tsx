"use client";

import { useEffect, useRef, useState } from "react";
import {
  MAX_PHOTO_BYTES,
  MAX_VIDEO_BYTES,
  completePost,
  mediaKindOf,
  sendPreview,
  uploadOriginal,
  type MediaFileKind,
} from "@/lib/tailgateUpload";

interface Message {
  id: string;
  attendeeId: string | null;
  replyToAttendeeId: string | null;
  authorName: string;
  vehicleCallsign: string;
  channel: "Chat" | "Announcements" | "Staff";
  /** Only on messages from before Tailgate 2.0 (SOS alerts were removed). */
  sosType: "Mechanical" | "Stuck" | "Lost" | "Emergency" | null;
  body: string;
  /** Preview for a photo/video post (a still frame for video). */
  photoUrl: string | null;
  isStaff: boolean;
  createdTime: string;
  mediaKind: "Photo" | "Video" | null;
  mediaSize: number;
  fileName: string;
  /** Only staff ever receive hidden posts. */
  hidden: boolean;
  likeCount: number;
  likedByMe: boolean;
}

/** A file picked in the composer, not posted yet. */
interface Attachment {
  id: string;
  file: File;
  kind: MediaFileKind;
  thumb: string | null;
}

/** A post on its way up: shown at the bottom of the feed until it lands. */
interface PendingPost {
  key: string;
  messageId: string;
  name: string;
  kind: MediaFileKind;
  thumb: string | null;
  size: number;
  sent: number;
  state: "sending" | "done" | "failed";
}

interface Attendee {
  id: string;
  screenName: string;
  vehicleCallsign: string;
  checkedIn: boolean;
  /** Staff-only roster field. */
  phone?: string;
}

export interface Trail {
  status: "Not started" | "On trail" | "Trail over";
  trailChannel: string;
  /** Only ever present for staff. */
  staffChannel?: string;
  channelUpdatedAt: string | null;
}

// Steady rate: a Roll out, channel change or Trail over should reach every
// phone within a few seconds of it getting signal. Polls are cheap: the server
// answers from a shared cache (see lib/eventComms.ts), not a fresh Airtable read.
const POLL_MS = 4000;
const MAX_ATTACHMENTS = 10;
// Above this, "Save" downloads the file instead of loading it into memory
// for the phone's share sheet.
const SHARE_SHEET_MAX_BYTES = 250 * 1024 * 1024;

/** window.prompt, or null where the browser blocks it (some in-app browsers,
 *  e.g. links opened inside Facebook or Messenger, throw instead of asking). */
function ask(message: string, value?: string): string | null {
  try {
    return window.prompt(message, value);
  } catch {
    return null;
  }
}

/** window.confirm, treated as "yes" where the browser blocks dialogs, so a
 *  staff button still works there instead of doing nothing. */
function confirmed(message: string): boolean {
  try {
    return window.confirm(message);
  } catch {
    return true;
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

type Tab = "Chat" | "Staging";

export default function CommsChat({
  slug,
  eventTitle,
  initialMessages,
  isStaff,
  staffCode,
  attendeeName,
  attendeeVehicle,
  attendeeCheckedIn,
  initialRoster,
  initialTrail,
  signupUrl,
  signupQrSvg,
  garageStaffName,
}: {
  slug: string;
  eventTitle: string;
  initialMessages: Message[];
  isStaff: boolean;
  staffCode: string;
  attendeeName: string;
  attendeeVehicle: string;
  attendeeCheckedIn: boolean;
  initialRoster: Attendee[];
  initialTrail: Trail;
  /** Staff only: the sign-up page, and its QR as an SVG string for walk-ups. */
  signupUrl: string;
  signupQrSvg: string;
  /** Set when staff got here by signing in to A&D Garage: their Google name.
   *  Then there's nothing to ask and nothing to remember on the device. */
  garageStaffName: string;
}) {
  const [tab, setTab] = useState<Tab>("Chat");
  const [announceMode, setAnnounceMode] = useState(false);
  const [staffName, setStaffName] = useState(garageStaffName);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [roster, setRoster] = useState<Attendee[]>(initialRoster);
  const [checkedIn, setCheckedIn] = useState(attendeeCheckedIn);
  const [trail, setTrail] = useState<Trail>(initialTrail);
  const [channelForm, setChannelForm] = useState<null | "rollout" | "channel">(null);
  const [trailCh, setTrailCh] = useState(initialTrail.trailChannel);
  const [staffCh, setStaffCh] = useState(initialTrail.staffChannel || "");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [pending, setPending] = useState<PendingPost[]>([]);
  // Save to phone is two taps: the first loads the original, the second opens
  // the share sheet (iPhones only open it straight from a tap).
  const [saves, setSaves] = useState<Record<string, "loading" | File>>({});
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showQr, setShowQr] = useState(false);
  const qrCloseRef = useRef<HTMLButtonElement>(null);
  const uploading = pending.some((p) => p.state === "sending");
  // A finished post drops off the pending list once the feed has it.
  const visiblePending = pending.filter((p) => !(p.state === "done" && messages.some((m) => m.id === p.messageId)));

  // Token isn't a prop — pulled straight from the URL the personal email
  // link opened with, so it never needs to round-trip through this
  // component's props or localStorage.
  const token = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") || "" : "";

  // The poll carries the token so the response can also report whether staff
  // has checked this person in yet — otherwise their view only flips on a
  // manual reload, and the moment it needs to flip is the safety meeting,
  // when nobody is going to think to refresh.
  // Who's on comms, remembered per device so it's asked once, not every
  // time the phone locks and the page reloads. Per-device rather than
  // per-code: the crew shares one staff code by design (it goes on printed
  // signage), so the code can't say who's holding it.
  // Remember this attendee's personal link on the phone, so scanning the
  // sign-up QR again (closed tab, dead battery) offers "Open Tailgate".
  useEffect(() => {
    if (isStaff || !token) return;
    try {
      window.localStorage.setItem(`ad-tailgate-link:${slug}`, `/comms/${slug}?token=${token}`);
    } catch {
      // Storage blocked; the emailed link still works.
    }
  }, [isStaff, token, slug]);

  const staffNameKey = `ad-comms-staff-name:${slug}`;
  useEffect(() => {
    // Signed in through the Garage: Google already told us who this is.
    if (!isStaff || garageStaffName) return;
    let stored = "";
    try {
      stored = window.localStorage.getItem(staffNameKey) || "";
    } catch {
      // Private mode / blocked storage — fall through and just ask.
    }
    if (!stored) {
      stored = (ask("Who's on comms? (shown on your messages)") || "").trim();
      if (stored) {
        try {
          window.localStorage.setItem(staffNameKey, stored);
        } catch {
          // Can't persist — the name still applies for this session.
        }
      }
    }
    setStaffName(stored);
  }, [isStaff, staffNameKey, garageStaffName]);

  // Credential on every poll — the endpoint refuses anonymous callers and
  // tailors the response to who's asking.
  const credentialQuery = isStaff ? `staff=${encodeURIComponent(staffCode)}` : `token=${encodeURIComponent(token)}`;
  const feedUrl = `/api/comms/${slug}/messages?${credentialQuery}${isStaff ? `&name=${encodeURIComponent(staffName)}` : ""}`;
  const mediaUrl = (id: string, download = false) =>
    `/api/comms/${slug}/media/file/${id}?${credentialQuery}${download ? "&download=1" : ""}`;

  // Polls only while the page is actually on screen — a locked phone or a
  // backgrounded tab stops polling, and checks immediately on return.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const schedule = () => {
      if (stopped || document.hidden) return;
      clearTimeout(timer);
      timer = setTimeout(tick, POLL_MS);
    };

    const tick = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(feedUrl, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.messages)) setMessages(data.messages);
          if (typeof data.checkedIn === "boolean") setCheckedIn(data.checkedIn);
          if (data.trail) setTrail(data.trail);
          if (Array.isArray(data.roster)) setRoster(data.roster);
        }
      } catch {
        // Silent — next poll retries.
      }
      schedule();
    };

    const onVisibility = () => {
      clearTimeout(timer);
      if (!document.hidden) tick();
    };

    document.addEventListener("visibilitychange", onVisibility);
    schedule();
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [feedUrl]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length, visiblePending.length, tab]);

  // Leaving mid-upload loses whatever hasn't finished, so ask first.
  useEffect(() => {
    if (!uploading) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [uploading]);

  async function refreshFeed() {
    try {
      const refreshed = await fetch(feedUrl, { cache: "no-store" }).then((r) => r.json());
      if (Array.isArray(refreshed.messages)) setMessages(refreshed.messages);
    } catch {
      // The next poll picks it up.
    }
  }

  function addAttachments(list: FileList | null) {
    if (!list?.length) return;
    setError("");
    const next: Attachment[] = [];
    for (const file of Array.from(list)) {
      const kind = mediaKindOf(file);
      if (!kind) {
        setError(`"${file.name}" isn't a photo or video.`);
        continue;
      }
      if (file.size > (kind === "video" ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES)) {
        setError(`"${file.name}" is too large (${kind === "video" ? "videos up to 4 GB" : "photos up to 50 MB"}).`);
        continue;
      }
      next.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        kind,
        thumb: kind === "photo" ? URL.createObjectURL(file) : null,
      });
    }
    setAttachments((prev) => {
      const room = MAX_ATTACHMENTS - prev.length;
      if (next.length > room) setError(`Up to ${MAX_ATTACHMENTS} photos or videos at a time.`);
      return [...prev, ...next.slice(0, Math.max(0, room))];
    });
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.thumb) URL.revokeObjectURL(target.thumb);
      return prev.filter((a) => a.id !== id);
    });
  }

  /** Posts the picked photos/videos, with the typed text as the caption. */
  async function postMedia(caption: string) {
    const files = attachments;
    setSending(true);
    setError("");
    let uploads: { messageId: string; token: string; uploadUrl: string }[];
    try {
      const res = await fetch(`/api/comms/${slug}/media/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: isStaff ? undefined : token,
          staffCode: isStaff ? staffCode : undefined,
          staffName: isStaff ? staffName : undefined,
          caption,
          files: files.map((a) => ({ name: a.file.name, type: a.file.type, size: a.file.size })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't post that. Try again.");
      uploads = data.uploads;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't post that. Try again.");
      setSending(false);
      return;
    }

    setDraft("");
    setAttachments([]);
    setSending(false);
    const posts: PendingPost[] = files.map((a, i) => ({
      key: `${uploads[i].messageId}`,
      messageId: uploads[i].messageId,
      name: a.file.name,
      kind: a.kind,
      thumb: a.thumb,
      size: a.file.size,
      sent: 0,
      state: "sending",
    }));
    setPending((prev) => [...prev, ...posts]);
    const patch = (messageId: string, changes: Partial<PendingPost>) =>
      setPending((prev) => prev.map((p) => (p.messageId === messageId ? { ...p, ...changes } : p)));

    for (const [i, a] of files.entries()) {
      const { messageId, token: postToken, uploadUrl } = uploads[i];
      const auth = { messageId, token: postToken };
      await sendPreview(slug, a.file, a.kind, auth);
      const ok = await uploadOriginal(slug, a.file, uploadUrl, auth, (sent) => patch(messageId, { sent }));
      const ready = await completePost(slug, auth, !ok);
      patch(messageId, { state: ready ? "done" : "failed", sent: ready ? a.file.size : 0 });
      if (ready) await refreshFeed();
    }
  }

  async function toggleLike(m: Message) {
    const liked = !m.likedByMe;
    const apply = (likedByMe: boolean, likeCount: number) =>
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, likedByMe, likeCount } : x)));
    apply(liked, Math.max(0, m.likeCount + (liked ? 1 : -1)));
    try {
      const res = await fetch(`/api/comms/${slug}/likes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: isStaff ? undefined : token,
          staffCode: isStaff ? staffCode : undefined,
          staffName: isStaff ? staffName : undefined,
          messageId: m.id,
          liked,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error();
      apply(data.liked, data.likeCount);
    } catch {
      apply(m.likedByMe, m.likeCount);
    }
  }

  /** Save the full-quality original to this phone. */
  async function save(m: Message) {
    const ready = saves[m.id];
    if (ready instanceof File) {
      try {
        await navigator.share({ files: [ready] });
      } catch {
        // Cancelled the share sheet; nothing to do.
      }
      return;
    }
    if (ready === "loading") return;

    const canShareFiles = typeof navigator !== "undefined" && typeof navigator.canShare === "function";
    if (canShareFiles && m.mediaSize <= SHARE_SHEET_MAX_BYTES) {
      setSaves((prev) => ({ ...prev, [m.id]: "loading" }));
      try {
        const res = await fetch(mediaUrl(m.id));
        if (!res.ok) throw new Error();
        const blob = await res.blob();
        const file = new File([blob], m.fileName || (m.mediaKind === "Video" ? "tailgate-video.mp4" : "tailgate-photo.jpg"), {
          type: blob.type,
        });
        if (navigator.canShare({ files: [file] })) {
          setSaves((prev) => ({ ...prev, [m.id]: file }));
          return;
        }
      } catch {
        // Fall through to a plain download.
      }
      setSaves((prev) => {
        const next = { ...prev };
        delete next[m.id];
        return next;
      });
    }
    const link = document.createElement("a");
    link.href = mediaUrl(m.id, true);
    link.download = m.fileName || "";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  /** Staff: hide a post from attendees (and the gallery), or put it back. */
  async function toggleHidden(m: Message) {
    if (!m.hidden && !confirmed("Hide this post from everyone? Staff can still see it and put it back.")) return;
    try {
      const res = await fetch(`/api/comms/${slug}/hide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffCode, messageId: m.id, hidden: !m.hidden }),
      });
      if (!res.ok) throw new Error();
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, hidden: !m.hidden } : x)));
    } catch {
      setError("Couldn't update that post. Try again.");
    }
  }

  async function send(text: string) {
    if (sending) return;
    if (attachments.length > 0) return postMedia(text.trim());
    if (!text.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/comms/${slug}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          staffCode: isStaff ? staffCode : undefined,
          token: isStaff ? undefined : token,
          announcementFromStaff: isStaff && announceMode,
          replyToAttendeeId: isStaff && replyTo ? replyTo.id : undefined,
          staffName: isStaff ? staffName : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't send that — try again.");
      setDraft("");
      setReplyTo(null);
      setAnnounceMode(false);
      await refreshFeed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send that — try again.");
    } finally {
      setSending(false);
    }
  }

  /** Staff: Roll out / Change channel / Trail over. */
  async function trailAction(action: "rollout" | "channel" | "over") {
    if (action === "over" && !confirmed("Trail over? Chat comes back for everyone, and the thank-you email goes out in 3 hours.")) return;
    setError("");
    try {
      const res = await fetch(`/api/comms/${slug}/trail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffCode, action, trailChannel: trailCh, staffChannel: staffCh }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't update the trail. Try again.");
      if (data.trail) setTrail(data.trail);
      setChannelForm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the trail. Try again.");
    }
  }

  async function toggleCheckIn(ids: string[], next: boolean) {
    // Flip it on screen right away; the server's roster replaces it.
    setRoster((prev) => prev.map((a) => (ids.includes(a.id) ? { ...a, checkedIn: next } : a)));
    try {
      const res = await fetch(`/api/comms/${slug}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffCode, attendeeIds: ids, checkedIn: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.roster)) setRoster(data.roster);
    } catch {
      // Roster stays stale until the next successful toggle — non-fatal.
    }
  }

  /** Hand the phone to someone else, or fix a typo in your own name. */
  function changeStaffName() {
    const next = ask("Who's on comms? (shown on your messages)", staffName);
    if (next === null) return;
    const trimmed = next.trim();
    setStaffName(trimmed);
    try {
      if (trimmed) window.localStorage.setItem(staffNameKey, trimmed);
      else window.localStorage.removeItem(staffNameKey);
    } catch {
      // Applies for this session even if it can't be stored.
    }
  }

  /** Fix a name someone fat-fingered at sign-up ("Rache1"), without making
   *  them re-register. Safe because nothing keys off the screen name. */
  async function rename(id: string, current: string) {
    const next = ask("Screen name for the roll call and chat:", current);
    if (next === null || !next.trim() || next.trim() === current) return;
    try {
      const res = await fetch(`/api/comms/${slug}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffCode, attendeeId: id, screenName: next.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.roster)) setRoster(data.roster);
    } catch {
      // Non-fatal — the old name stays until the next attempt.
    }
  }

  /** Lost phone or a forwarded link: the old link stops working and a new
   *  one is emailed to the address they signed up with. */
  async function resetLink(id: string, name: string) {
    if (!confirmed(`Reset ${name}'s link? Their old link stops working and a new one is emailed to them.`)) return;
    try {
      const res = await fetch(`/api/comms/${slug}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffCode, attendeeId: id, resetLink: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't reset the link. Try again.");
      if (Array.isArray(data.roster)) setRoster(data.roster);
      if (!data.emailed) setError(`${name}'s old link is off, but the new email didn't send. Try Reset Link again.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reset the link. Try again.");
    }
  }

  // No filtering here on purpose. Who sees what is decided server-side in
  // lib/eventComms.ts (visibleMessagesFor) — hiding messages in the browser
  // would leave them sitting in the page payload and the API response for
  // anyone who looked.
  const visibleMessages = messages;

  const alreadyCheckedIn = roster.filter((a) => a.checkedIn);
  // Rigs: people grouped by vehicle name, typed by hand at sign-up, so
  // "Red JK" and "red  jk" count as one rig.
  const rigs = Object.values(
    roster.reduce<Record<string, { key: string; name: string; people: Attendee[] }>>((acc, a) => {
      const key = a.vehicleCallsign.trim().toLowerCase().replace(/\s+/g, " ") || `solo:${a.id}`;
      (acc[key] ||= { key, name: a.vehicleCallsign.trim() || a.screenName, people: [] }).people.push(a);
      return acc;
    }, {}),
  )
    .map((r) => ({ ...r, allIn: r.people.every((a) => a.checkedIn) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const rigsIn = rigs.filter((r) => r.allIn).length;
  const updatedAt = trail.channelUpdatedAt ? formatTime(trail.channelUpdatedAt) : "";

  // Attendees on the trail: the channel and the emergency note, nothing to
  // scroll or type while driving. The next poll with signal flips it back.
  if (!isStaff && trail.status === "On trail") {
    return (
      <div className="comms-chat comms-trail" role="status" aria-live="polite">
        <span className="comms-wordmark" aria-hidden="true">Tailgate</span>
        <div className="eyebrow accent">{eventTitle} · On Trail</div>
        <div className="comms-trail-label">Radio channel</div>
        <div className="comms-trail-channel">{trail.trailChannel || "—"}</div>
        {updatedAt && (
          <p className="comms-trail-updated">Updated {updatedAt} · channel changes are called over the radio</p>
        )}
        <p className="comms-trail-emergency">
          {/* Staff run lead + sweep (extra staff mixed into the group) and
           *  monitor both channels, so calling it on the trail channel or
           *  flagging a staff vehicle down both reach them. */}
          <strong>Need staff?</strong> Call it on channel {trail.trailChannel || "the trail channel"} or flag down a
          staff vehicle: lead, sweep, or one in the group. <strong>Emergency:</strong> call <strong>911</strong>.
        </p>
        <p className="comms-trail-note">Eyes on the trail. Chat comes back when the trail ends.</p>
      </div>
    );
  }

  return (
    <div className="comms-chat">
      {/* Tailgate look: compact hero so the chat below keeps most of the screen. */}
      <div className="comms-hero" aria-hidden="true">
        <span className="comms-wordmark">Tailgate</span>
      </div>
      <div className={isStaff ? "comms-header comms-header-staff" : "comms-header"}>
        <div>
          <div className="eyebrow accent" style={{ fontSize: 11 }}>{eventTitle}</div>
          <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
            {isStaff ? (
              <>
                Posting as <strong style={{ color: "var(--text)" }}>{staffName || "Staff"}</strong>
                {!garageStaffName && (
                  <button type="button" className="comms-roster-rename" onClick={changeStaffName}>
                    Change
                  </button>
                )}
              </>
            ) : (
              `${attendeeName} · ${attendeeVehicle}`
            )}
            {!isStaff && !checkedIn && " · Not checked in yet"}
          </div>
        </div>
        {isStaff && <span className="comms-staff-chip">Staff</span>}
      </div>

      {/* Staff gets Chat + Roster. Attendees get no tabs at all — one stream,
       *  with announcements mixed in, because nobody taps a second tab on a
       *  trail day. */}
      {isStaff && (
        <div className="comms-tabs">
          <button type="button" className={tab === "Chat" ? "comms-tab active" : "comms-tab"} onClick={() => setTab("Chat")}>
            Chat
          </button>
          <button type="button" className={tab === "Staging" ? "comms-tab active" : "comms-tab"} onClick={() => setTab("Staging")}>
            Staging · {rigsIn}/{rigs.length}
          </button>
        </div>
      )}

      {/* Staff trail controls. Staff see both channels; attendees only ever
       *  receive the trail channel (the server leaves the staff one out). */}
      {isStaff && (
        <div className="comms-trail-bar">
          <div className="comms-trail-bar-status">
            <span className={`comms-trail-pill ${trail.status === "On trail" ? "on" : trail.status === "Trail over" ? "over" : ""}`}>
              {trail.status === "Not started" ? "Not rolled out" : trail.status}
            </span>
            {trail.status === "On trail" && (
              <span className="comms-trail-bar-channels">
                Trail <strong>CH {trail.trailChannel}</strong>
                {trail.staffChannel && <> · Staff <strong>CH {trail.staffChannel}</strong></>}
                {updatedAt && <span className="comms-trail-bar-updated"> · {updatedAt}</span>}
              </span>
            )}
          </div>
          {channelForm ? (
            <form
              className="comms-trail-form"
              onSubmit={(e) => {
                e.preventDefault();
                trailAction(channelForm);
              }}
            >
              <label>
                Trail CH
                <input value={trailCh} onChange={(e) => setTrailCh(e.target.value)} inputMode="numeric" maxLength={12} required />
              </label>
              <label>
                Staff CH
                <input value={staffCh} onChange={(e) => setStaffCh(e.target.value)} inputMode="numeric" maxLength={12} />
              </label>
              <button className="btn btn-primary btn-sm" type="submit">{channelForm === "rollout" ? "Roll Out" : "Update"}</button>
              <button className="btn btn-outline btn-sm" type="button" onClick={() => setChannelForm(null)}>Cancel</button>
            </form>
          ) : (
            <div className="comms-trail-actions">
              {trail.status !== "On trail" && (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setChannelForm("rollout")}>Roll Out</button>
              )}
              {trail.status === "On trail" && (
                <>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setChannelForm("channel")}>Change Channel</button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => trailAction("over")}>Trail Over</button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {!isStaff && !checkedIn && (
        <p className="comms-notice">
          This goes to <strong>staff only</strong> — nobody else on the ride can see it. The group chat opens once
          you&apos;re checked in at Staging.
        </p>
      )}

      {tab === "Staging" ? (
        <div className="comms-messages" ref={listRef}>
          <div className="comms-staging-head">
            {roster.length === 0 ? (
              <p className="comms-staging-count">Nobody&apos;s signed up yet.</p>
            ) : (
              <p className="comms-staging-count">
                <strong>{rigsIn}</strong> of {rigs.length} {rigs.length === 1 ? "rig" : "rigs"} · {alreadyCheckedIn.length} of{" "}
                {roster.length} {roster.length === 1 ? "person" : "people"} checked in
              </p>
            )}
            {signupQrSvg && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowQr(true)}>
                Walk-Up QR
              </button>
            )}
          </div>
          {/* Rigs still waiting first: roll call works down a shrinking list
           *  rather than hunting through rigs already done. A rig is
           *  everyone who signed up under the same vehicle name. */}
          {([
            { label: `Waiting · ${rigs.length - rigsIn}`, list: rigs.filter((r) => !r.allIn) },
            { label: `Checked In · ${rigsIn}`, list: rigs.filter((r) => r.allIn) },
          ] as const).map((group) =>
            group.list.length === 0 ? null : (
              <div key={group.label}>
                <div className="comms-roster-group">{group.label}</div>
                {group.list.map((rig) => (
                  <div key={rig.key} className={rig.allIn ? "comms-rig is-in" : "comms-rig"}>
                    {rig.people.length > 1 && (
                      <div className="comms-rig-head">
                        <span>
                          <strong>{rig.name}</strong> · {rig.people.length} people
                        </span>
                        <button
                          type="button"
                          className={rig.allIn ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"}
                          onClick={() => toggleCheckIn(rig.people.map((a) => a.id), !rig.allIn)}
                        >
                          {rig.allIn ? "Rig Checked In" : "Check In Rig"}
                        </button>
                      </div>
                    )}
                    {rig.people.map((a) => (
                      <div key={a.id} className="comms-roster-row">
                        <div>
                          <strong>{a.screenName}</strong>
                          {rig.people.length === 1 && (
                            <span style={{ color: "var(--text-dim)", marginLeft: 6 }}>{a.vehicleCallsign}</span>
                          )}
                          {a.phone && (
                            <a className="comms-roster-phone" href={`tel:${a.phone.replace(/[^\d+]/g, "")}`}>
                              {a.phone}
                            </a>
                          )}
                          <button type="button" className="comms-roster-rename" onClick={() => rename(a.id, a.screenName)}>
                            Rename
                          </button>
                          <button type="button" className="comms-roster-rename" onClick={() => resetLink(a.id, a.screenName)}>
                            Reset Link
                          </button>
                          {/* Lets staff open a private line with someone who
                           *  hasn't messaged first — Reply only exists on a
                           *  message they already sent. */}
                          {!a.checkedIn && (
                            <button
                              type="button"
                              className="comms-roster-rename"
                              onClick={() => {
                                setReplyTo({ id: a.id, name: a.screenName });
                                setAnnounceMode(false);
                                setTab("Chat");
                              }}
                            >
                              Message
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          className={a.checkedIn ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"}
                          onClick={() => toggleCheckIn([a.id], !a.checkedIn)}
                        >
                          {a.checkedIn ? "Checked In" : "Check In"}
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ),
          )}
        </div>
      ) : (
        <div className="comms-messages" ref={listRef}>
          {visibleMessages.length === 0 && (
            <p style={{ color: "var(--text-dim)", fontSize: 14, textAlign: "center", marginTop: 24 }}>
              {isStaff || checkedIn ? "No messages yet — say hi." : "No messages yet. Anything you send here goes straight to staff."}
            </p>
          )}
          {visibleMessages.map((m) => {
            const classes = ["comms-msg"];
            if (m.mediaKind) classes.push("comms-msg-media");
            if (m.hidden) classes.push("comms-msg-hidden");
            if (m.sosType) classes.push("comms-msg-sos");
            else if (m.channel === "Announcements") classes.push("comms-msg-announcement");
            else if (m.isStaff) classes.push("comms-msg-staff");
            return (
              <div key={m.id} className={classes.join(" ")}>
                <div className="comms-msg-meta">
                  <strong>{m.authorName}</strong> <span>{m.vehicleCallsign}</span>
                  {m.isStaff && <span className="comms-staff-badge">Staff</span>}
                  <span className="comms-msg-time">{formatTime(m.createdTime)}</span>
                  {/* Staff replying into someone's private line — the only way
                   *  a reply reaches that person and nobody else. */}
                  {isStaff && m.channel === "Staff" && m.attendeeId && (
                    <button
                      type="button"
                      className="comms-msg-reply"
                      onClick={() => setReplyTo({ id: m.attendeeId as string, name: m.authorName })}
                    >
                      Reply
                    </button>
                  )}
                </div>
                {m.sosType && <div className="comms-sos-label">🚨 SOS &mdash; {m.sosType}</div>}
                {m.channel === "Announcements" && <div className="comms-announcement-label">📣 Announcement</div>}
                {m.hidden && <div className="comms-hidden-label">Hidden from attendees</div>}
                {m.mediaKind ? (
                  <figure className="comms-media">
                    {m.mediaKind === "Video" ? (
                      <video
                        controls
                        playsInline
                        preload="none"
                        poster={m.photoUrl || undefined}
                        src={mediaUrl(m.id)}
                        aria-label={`Video from ${m.authorName}`}
                      />
                    ) : m.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.photoUrl} alt={`Photo from ${m.authorName}`} loading="lazy" />
                    ) : (
                      <div className="comms-media-placeholder">Photo from {m.authorName}. Tap Save to see it full size.</div>
                    )}
                    {m.body && <figcaption>{m.body}</figcaption>}
                    <div className="comms-media-actions">
                      {m.mediaKind === "Photo" && (
                        <button
                          type="button"
                          className={m.likedByMe ? "comms-like liked" : "comms-like"}
                          aria-pressed={m.likedByMe}
                          aria-label={m.likedByMe ? "Unlike photo" : "Like photo"}
                          onClick={() => toggleLike(m)}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 4 4.5 7.3 4.5c2 0 3.6 1.1 4.7 2.7 1.1-1.6 2.7-2.7 4.7-2.7 3.3 0 5.7 3.1 4.5 6.6-1.7 4.8-9.2 9.4-9.2 9.4z" />
                          </svg>
                          <span>{m.likeCount}</span>
                        </button>
                      )}
                      <button type="button" className="comms-media-btn" onClick={() => save(m)} disabled={saves[m.id] === "loading"}>
                        {saves[m.id] === "loading" ? "Loading…" : saves[m.id] instanceof File ? "Save to Phone" : "Save"}
                      </button>
                      {isStaff && (
                        <button type="button" className="comms-media-btn subtle" onClick={() => toggleHidden(m)}>
                          {m.hidden ? "Unhide" : "Hide"}
                        </button>
                      )}
                    </div>
                  </figure>
                ) : (
                  <>
                    <div className="comms-msg-body">{m.body}</div>
                    {isStaff && (
                      <button type="button" className="comms-msg-reply comms-msg-hide" onClick={() => toggleHidden(m)}>
                        {m.hidden ? "Unhide" : "Hide"}
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
          {visiblePending.map((p) => {
            const pct = p.size ? Math.floor((p.sent / p.size) * 100) : 0;
            return (
              <div key={p.key} className={`comms-pending is-${p.state}`}>
                <div className="comms-pending-thumb" aria-hidden="true">
                  {p.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumb} alt="" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="5" width="13" height="14" rx="2" /><path d="m16 10 5-3v10l-5-3z" />
                    </svg>
                  )}
                </div>
                <div className="comms-pending-meta">
                  <span>
                    {p.state === "sending" && `Posting ${p.kind}… ${pct}%`}
                    {p.state === "done" && "Posted"}
                    {p.state === "failed" && `That ${p.kind} didn't post. Pick it again to retry.`}
                  </span>
                  {p.state === "sending" && (
                    <span className="media-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
                  )}
                </div>
                {p.state === "failed" && (
                  <button
                    type="button"
                    className="media-remove"
                    aria-label="Dismiss"
                    onClick={() => setPending((prev) => prev.filter((x) => x.key !== p.key))}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
          {uploading && (
            <p className="comms-pending-note" role="status">Keep this page open until your post finishes.</p>
          )}
        </div>
      )}

      {error && <p className="form-error-banner" style={{ margin: "0 var(--sp-3)" }}>{error}</p>}

      {tab !== "Staging" && (
        <>
          {isStaff && (
            <div className="comms-composer-modes">
              <button
                type="button"
                className={announceMode ? "comms-mode-btn active" : "comms-mode-btn"}
                onClick={() => {
                  setAnnounceMode((v) => !v);
                  setReplyTo(null);
                }}
              >
                📣 Announce
              </button>
              {replyTo && (
                <span className="comms-mode-reply">
                  Replying to <strong>{replyTo.name}</strong> only
                  <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply">✕</button>
                </span>
              )}
            </div>
          )}
          {attachments.length > 0 && (
            <div className="comms-attachments">
              <ul aria-label="Photos and videos to post">
                {attachments.map((a) => (
                  <li key={a.id}>
                    {a.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.thumb} alt="" />
                    ) : (
                      <span className="comms-attachment-video">Video</span>
                    )}
                    <button type="button" onClick={() => removeAttachment(a.id)} aria-label={`Remove ${a.file.name}`}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <p>
                Only post what you took or have permission to share.
                {(isStaff || checkedIn) && " Everyone checked in sees it right away; photos reach the event's public gallery only after staff approve them."}
              </p>
            </div>
          )}
          <form
            className="comms-composer"
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
          >
            {!announceMode && !replyTo && (
              <>
                <input
                  ref={fileInputRef}
                  id="comms-attach"
                  className="comms-attach-input"
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  disabled={sending}
                  onChange={(e) => {
                    addAttachments(e.target.files);
                    e.target.value = "";
                  }}
                />
                <label htmlFor="comms-attach" className="comms-attach" title="Add photos or videos">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" />
                  </svg>
                  <span className="sr-only">Add photos or videos</span>
                </label>
              </>
            )}
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                announceMode
                  ? "Announcement to everyone…"
                  : replyTo
                    ? `Reply to ${replyTo.name}…`
                    : attachments.length > 0
                      ? "Add a caption (optional)…"
                      : isStaff || checkedIn
                        ? "Message…"
                        : "Message staff…"
              }
              maxLength={500}
              disabled={sending}
            />
            <button className="btn btn-primary btn-sm" type="submit" disabled={sending || (!draft.trim() && attachments.length === 0)}>
              {attachments.length > 0 ? "Post" : "Send"}
            </button>
          </form>
        </>
      )}

      {showQr && (
        <div
          className="comms-qr"
          role="dialog"
          aria-modal="true"
          aria-labelledby="comms-qr-title"
          onKeyDown={(e) => e.key === "Escape" && setShowQr(false)}
        >
          <h2 id="comms-qr-title" className="comms-wordmark">Tailgate</h2>
          <p className="comms-qr-lead">Scan to sign up and get in the chat</p>
          <div className="comms-qr-code" role="img" aria-label="QR code for the sign-up page" dangerouslySetInnerHTML={{ __html: signupQrSvg }} />
          <p className="comms-qr-url">{signupUrl.replace(/^https?:\/\//, "")}</p>
          <button ref={qrCloseRef} type="button" className="btn btn-primary" onClick={() => setShowQr(false)} autoFocus>
            Done
          </button>
        </div>
      )}
    </div>
  );
}
