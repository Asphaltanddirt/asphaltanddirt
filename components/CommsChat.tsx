"use client";

import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  attendeeId: string | null;
  replyToAttendeeId: string | null;
  authorName: string;
  vehicleCallsign: string;
  channel: "Chat" | "Announcements" | "Staff";
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
}

const SOS_OPTIONS: { type: "Mechanical" | "Stuck" | "Lost" | "Emergency"; label: string }[] = [
  { type: "Mechanical", label: "Mechanical" },
  { type: "Stuck", label: "Stuck" },
  { type: "Lost", label: "Lost" },
  { type: "Emergency", label: "Emergency" },
];

const POLL_MS = 7000;

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
  attendeeId,
  attendeeName,
  attendeeVehicle,
  attendeeCheckedIn,
  initialRoster,
}: {
  slug: string;
  eventTitle: string;
  initialMessages: Message[];
  isStaff: boolean;
  staffCode: string;
  attendeeId: string;
  attendeeName: string;
  attendeeVehicle: string;
  attendeeCheckedIn: boolean;
  initialRoster: Attendee[];
}) {
  const [tab, setTab] = useState<Tab>("Chat");
  const [announceMode, setAnnounceMode] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [roster, setRoster] = useState<Attendee[]>(initialRoster);
  const [checkedIn, setCheckedIn] = useState(attendeeCheckedIn);
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
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const url = `/api/comms/${slug}/messages${token ? `?token=${encodeURIComponent(token)}` : ""}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.messages)) setMessages(data.messages);
        if (typeof data.checkedIn === "boolean") setCheckedIn(data.checkedIn);
      } catch {
        // Silent — next poll retries.
      }
    }, POLL_MS);
    return () => clearInterval(poll);
  }, [slug, token]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, tab]);

  async function send(text: string, sosType?: string) {
    if (!text.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/comms/${slug}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          sosType,
          staffCode: isStaff ? staffCode : undefined,
          token: isStaff ? undefined : token,
          announcementFromStaff: isStaff && announceMode,
          replyToAttendeeId: isStaff && replyTo ? replyTo.id : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't send that — try again.");
      setDraft("");
      setReplyTo(null);
      setAnnounceMode(false);
      const url = `/api/comms/${slug}/messages${token ? `?token=${encodeURIComponent(token)}` : ""}`;
      const refreshed = await fetch(url, { cache: "no-store" }).then((r) => r.json());
      if (Array.isArray(refreshed.messages)) setMessages(refreshed.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send that — try again.");
    } finally {
      setSending(false);
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

  // Visibility, in one place:
  //  - SOS and Announcements reach everyone, always. Announcements matter
  //    most to the people who AREN'T checked in yet ("safety meeting at the
  //    flagpole in 10"), so they deliberately flow into the staff line too.
  //  - Staff sees the group chat and every private line.
  //  - Checked-in attendees see the group chat.
  //  - Everyone else sees their own private line: what they sent, plus staff
  //    replies addressed to them.
  //
  // Identity is the attendee record ID, never the screen name. Names are
  // hand-typed, so they collide (two "Mike" in a "Red JK" would have read
  // each other's private line) and they change when someone re-registers.
  const visibleMessages = messages.filter((m) => {
    if (m.sosType || m.channel === "Announcements") return true;
    if (isStaff) return m.channel === "Chat" || m.channel === "Staff";
    if (checkedIn) return m.channel === "Chat";
    if (m.channel !== "Staff") return false;
    return m.attendeeId === attendeeId || m.replyToAttendeeId === attendeeId;
  });

  const notCheckedIn = roster.filter((a) => !a.checkedIn);
  const alreadyCheckedIn = roster.filter((a) => a.checkedIn);

  return (
    <div className="comms-chat">
      <div className={isStaff ? "comms-header comms-header-staff" : "comms-header"}>
        <div>
          <div className="eyebrow accent" style={{ fontSize: 11 }}>{eventTitle}</div>
          <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
            {isStaff ? "Control — you can post announcements and run roll call" : `${attendeeName} · ${attendeeVehicle}`}
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

      {!isStaff && !checkedIn && (
        <p className="comms-notice">
          This goes to <strong>staff only</strong> — nobody else on the ride can see it. The group chat opens once
          you&apos;re checked in at the safety meeting. Need help right now? Use SOS, it reaches everyone.
        </p>
      )}

      {tab !== "Roster" && (
        <div className="comms-sos-row">
          {SOS_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              className="comms-sos-btn"
              disabled={sending}
              onClick={() => send(`Needs help — ${opt.label}`, opt.type)}
            >
              {opt.label}
            </button>
          ))}
        </div>
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
