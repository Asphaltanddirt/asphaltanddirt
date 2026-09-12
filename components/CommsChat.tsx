"use client";

import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
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

type Tab = "Chat" | "Announcements" | "Roster";

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
}) {
  const [tab, setTab] = useState<Tab>("Chat");
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

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/comms/${slug}/messages`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.messages)) setMessages(data.messages);
      } catch {
        // Silent — next poll retries.
      }
    }, POLL_MS);
    return () => clearInterval(poll);
  }, [slug]);

  useEffect(() => {
    if (!isStaff) {
      const mine = roster.find((a) => a.screenName === attendeeName && a.vehicleCallsign === attendeeVehicle);
      if (mine) setCheckedIn(mine.checkedIn);
    }
  }, [roster, isStaff, attendeeName, attendeeVehicle]);

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
          announcementFromStaff: isStaff && tab === "Announcements",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't send that — try again.");
      setDraft("");
      const refreshed = await fetch(`/api/comms/${slug}/messages`, { cache: "no-store" }).then((r) => r.json());
      if (Array.isArray(refreshed.messages)) setMessages(refreshed.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send that — try again.");
    } finally {
      setSending(false);
    }
  }

  async function toggleCheckIn(attendeeId: string, next: boolean) {
    try {
      const res = await fetch(`/api/comms/${slug}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffCode, attendeeId, checkedIn: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.roster)) setRoster(data.roster);
    } catch {
      // Roster stays stale until the next successful toggle — non-fatal.
    }
  }

  // Visibility: SOS is always visible to everyone. Staff sees Chat +
  // Staff-only line + Announcements. Checked-in attendees see Chat +
  // Announcements. Not-yet-checked-in attendees see only their own thread
  // in the Staff line + Announcements.
  const chatMessages = messages.filter((m) => {
    if (m.sosType) return true;
    if (isStaff) return m.channel === "Chat" || m.channel === "Staff";
    if (checkedIn) return m.channel === "Chat";
    return m.channel === "Staff" && m.authorName === attendeeName && m.vehicleCallsign === attendeeVehicle;
  });
  const announcements = messages.filter((m) => m.channel === "Announcements");
  const visibleMessages = tab === "Announcements" ? announcements : chatMessages;
  const canPostAnnouncements = isStaff;
  const canPostChat = isStaff || checkedIn || true; // everyone can always message (routes to staff line if not checked in)

  return (
    <div className="comms-chat">
      <div className="comms-header">
        <div>
          <div className="eyebrow accent" style={{ fontSize: 11 }}>{eventTitle}</div>
          <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
            {isStaff ? "Staff" : `${attendeeName} · ${attendeeVehicle}`}
            {!isStaff && !checkedIn && " · Not checked in yet"}
          </div>
        </div>
      </div>

      <div className="comms-tabs">
        <button type="button" className={tab === "Chat" ? "comms-tab active" : "comms-tab"} onClick={() => setTab("Chat")}>
          {isStaff || checkedIn ? "Chat" : "Staff"}
        </button>
        <button type="button" className={tab === "Announcements" ? "comms-tab active" : "comms-tab"} onClick={() => setTab("Announcements")}>Announcements</button>
        {isStaff && (
          <button type="button" className={tab === "Roster" ? "comms-tab active" : "comms-tab"} onClick={() => setTab("Roster")}>
            Roster
          </button>
        )}
      </div>

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
          {roster.map((a) => (
            <div key={a.id} className="comms-roster-row">
              <div>
                <strong>{a.screenName}</strong>
                <span style={{ color: "var(--text-dim)", marginLeft: 6 }}>{a.vehicleCallsign}</span>
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
      ) : (
        <div className="comms-messages" ref={listRef}>
          {visibleMessages.length === 0 && (
            <p style={{ color: "var(--text-dim)", fontSize: 14, textAlign: "center", marginTop: 24 }}>
              {tab === "Announcements" ? "No announcements yet." : "No messages yet — say hi."}
            </p>
          )}
          {visibleMessages.map((m) => (
            <div key={m.id} className={m.sosType ? "comms-msg comms-msg-sos" : "comms-msg"}>
              <div className="comms-msg-meta">
                <strong>{m.authorName}</strong> <span>{m.vehicleCallsign}</span>
                {m.isStaff && <span className="comms-staff-badge">Staff</span>}
                <span className="comms-msg-time">{formatTime(m.createdTime)}</span>
              </div>
              {m.sosType && <div className="comms-sos-label">🚨 SOS &mdash; {m.sosType}</div>}
              <div className="comms-msg-body">{m.body}</div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="form-error-banner" style={{ margin: "0 var(--sp-3)" }}>{error}</p>}

      {tab === "Roster" ? null : tab === "Announcements" && !canPostAnnouncements ? (
        <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-dim)", padding: "var(--sp-3)" }}>
          Only staff can post here — you can still read along.
        </p>
      ) : (
        canPostChat && (
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
              placeholder={tab === "Announcements" ? "Post an announcement…" : "Message…"}
              maxLength={500}
              disabled={sending}
            />
            <button className="btn btn-primary btn-sm" type="submit" disabled={sending || !draft.trim()}>Send</button>
          </form>
        )
      )}
    </div>
  );
}
