"use client";

import { useEffect, useRef, useState } from "react";

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
  isStaff: boolean;
  createdTime: string;
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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

type Tab = "Chat" | "Roster";

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
}) {
  const [tab, setTab] = useState<Tab>("Chat");
  const [announceMode, setAnnounceMode] = useState(false);
  const [staffName, setStaffName] = useState("");
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
  const listRef = useRef<HTMLDivElement>(null);

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
  const staffNameKey = `ad-comms-staff-name:${slug}`;
  useEffect(() => {
    if (!isStaff) return;
    let stored = "";
    try {
      stored = window.localStorage.getItem(staffNameKey) || "";
    } catch {
      // Private mode / blocked storage — fall through and just ask.
    }
    if (!stored) {
      stored = (window.prompt("Who's on comms? (shown on your messages)") || "").trim();
      if (stored) {
        try {
          window.localStorage.setItem(staffNameKey, stored);
        } catch {
          // Can't persist — the name still applies for this session.
        }
      }
    }
    setStaffName(stored);
  }, [isStaff, staffNameKey]);

  // Credential on every poll — the endpoint refuses anonymous callers and
  // tailors the response to who's asking.
  const feedUrl = isStaff
    ? `/api/comms/${slug}/messages?staff=${encodeURIComponent(staffCode)}`
    : `/api/comms/${slug}/messages?token=${encodeURIComponent(token)}`;

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
  }, [messages, tab]);

  async function send(text: string) {
    if (!text.trim() || sending) return;
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
      const refreshed = await fetch(feedUrl, { cache: "no-store" }).then((r) => r.json());
      if (Array.isArray(refreshed.messages)) setMessages(refreshed.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send that — try again.");
    } finally {
      setSending(false);
    }
  }

  /** Staff: Roll out / Change channel / Trail over. */
  async function trailAction(action: "rollout" | "channel" | "over") {
    if (action === "over" && !window.confirm("Trail over? Chat comes back for everyone, and the thank-you email goes out in 3 hours.")) return;
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

  async function toggleCheckIn(id: string, next: boolean) {
    try {
      const res = await fetch(`/api/comms/${slug}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffCode, attendeeId: id, checkedIn: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.roster)) setRoster(data.roster);
    } catch {
      // Roster stays stale until the next successful toggle — non-fatal.
    }
  }

  /** Hand the phone to someone else, or fix a typo in your own name. */
  function changeStaffName() {
    const next = window.prompt("Who's on comms? (shown on your messages)", staffName);
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
    const next = window.prompt("Screen name for the roll call and chat:", current);
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

  // No filtering here on purpose. Who sees what is decided server-side in
  // lib/eventComms.ts (visibleMessagesFor) — hiding messages in the browser
  // would leave them sitting in the page payload and the API response for
  // anyone who looked.
  const visibleMessages = messages;

  const notCheckedIn = roster.filter((a) => !a.checkedIn);
  const alreadyCheckedIn = roster.filter((a) => a.checkedIn);
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
                <button type="button" className="comms-roster-rename" onClick={changeStaffName}>
                  Change
                </button>
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
          <button type="button" className={tab === "Roster" ? "comms-tab active" : "comms-tab"} onClick={() => setTab("Roster")}>
            Roster{notCheckedIn.length > 0 && ` · ${notCheckedIn.length}`}
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
          you&apos;re checked in at the safety meeting.
        </p>
      )}

      {tab === "Roster" ? (
        <div className="comms-messages" ref={listRef}>
          {roster.length === 0 && <p style={{ color: "var(--text-dim)", fontSize: 14, textAlign: "center", marginTop: 24 }}>Nobody&apos;s registered yet.</p>}
          {/* Not-checked-in first: roll call works down a shrinking list
           *  rather than hunting through people already done. */}
          {([
            { label: `Not Checked In · ${notCheckedIn.length}`, people: notCheckedIn },
            { label: `Checked In · ${alreadyCheckedIn.length}`, people: alreadyCheckedIn },
          ] as const).map((group) =>
            group.people.length === 0 ? null : (
              <div key={group.label}>
                <div className="comms-roster-group">{group.label}</div>
                {group.people.map((a) => (
                  <div key={a.id} className="comms-roster-row">
                    <div>
                      <strong>{a.screenName}</strong>
                      <span style={{ color: "var(--text-dim)", marginLeft: 6 }}>{a.vehicleCallsign}</span>
                      {a.phone && (
                        <a className="comms-roster-phone" href={`tel:${a.phone.replace(/[^\d+]/g, "")}`}>
                          {a.phone}
                        </a>
                      )}
                      <button type="button" className="comms-roster-rename" onClick={() => rename(a.id, a.screenName)}>
                        Rename
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
                      onClick={() => toggleCheckIn(a.id, !a.checkedIn)}
                    >
                      {a.checkedIn ? "Checked In" : "Check In"}
                    </button>
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
                <div className="comms-msg-body">{m.body}</div>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="form-error-banner" style={{ margin: "0 var(--sp-3)" }}>{error}</p>}

      {tab !== "Roster" && (
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
          <form
            className="comms-composer"
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                announceMode
                  ? "Announcement to everyone…"
                  : replyTo
                    ? `Reply to ${replyTo.name}…`
                    : isStaff || checkedIn
                      ? "Message…"
                      : "Message staff…"
              }
              maxLength={500}
              disabled={sending}
            />
            <button className="btn btn-primary btn-sm" type="submit" disabled={sending || !draft.trim()}>Send</button>
          </form>
        </>
      )}
    </div>
  );
}
