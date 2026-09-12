"use client";

import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  authorName: string;
  vehicleCallsign: string;
  channel: "Chat" | "Announcements";
  sosType: "Mechanical" | "Stuck" | "Lost" | "Emergency" | null;
  body: string;
  isStaff: boolean;
  createdTime: string;
}

const SOS_OPTIONS: { type: "Mechanical" | "Stuck" | "Lost" | "Emergency"; label: string }[] = [
  { type: "Mechanical", label: "Mechanical" },
  { type: "Stuck", label: "Stuck" },
  { type: "Lost", label: "Lost" },
  { type: "Emergency", label: "Emergency" },
];

const IDENTITY_KEY = "ad_comms_identity";
const POLL_MS = 7000;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function CommsChat({
  slug,
  eventTitle,
  initialMessages,
  isStaff,
  staffCode,
}: {
  slug: string;
  eventTitle: string;
  initialMessages: Message[];
  isStaff: boolean;
  staffCode: string;
}) {
  const [name, setName] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [joined, setJoined] = useState(false);
  const [tab, setTab] = useState<"Chat" | "Announcements">("Chat");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(IDENTITY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name && parsed.vehicle) {
          setName(parsed.name);
          setVehicle(parsed.vehicle);
          setJoined(true);
        }
      }
    } catch {
      // localStorage unavailable — just ask again, harmless.
    }
  }, []);

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
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, tab]);

  function handleJoin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !vehicle.trim()) return;
    try {
      localStorage.setItem(IDENTITY_KEY, JSON.stringify({ name: name.trim(), vehicle: vehicle.trim() }));
    } catch {
      // Non-fatal — chat still works for this session.
    }
    setJoined(true);
  }

  async function send(text: string, channel: "Chat" | "Announcements", sosType?: string) {
    if (!text.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/comms/${slug}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: name,
          vehicleCallsign: vehicle,
          channel,
          sosType,
          text,
          staffCode: isStaff ? staffCode : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't send that — try again.");
      setDraft("");
      // Optimistic refresh so the sender sees their own message immediately.
      const refreshed = await fetch(`/api/comms/${slug}/messages`, { cache: "no-store" }).then((r) => r.json());
      if (Array.isArray(refreshed.messages)) setMessages(refreshed.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send that — try again.");
    } finally {
      setSending(false);
    }
  }

  if (!joined) {
    return (
      <section className="section-pt-tight section-pb-tight">
        <div className="container" style={{ maxWidth: 420 }}>
          <div className="eyebrow accent">{eventTitle}</div>
          <h1 className="mt-2">Join The Chat</h1>
          <p className="lead mt-2">Just a name and your rig so people know who&apos;s who — no login, no app.</p>
          <form className="build-form mt-4" onSubmit={handleJoin}>
            <div className="form-section">
              <div className="form-field">
                <label htmlFor="comms-name">Your Name</label>
                <input id="comms-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
              </div>
              <div className="form-field">
                <label htmlFor="comms-vehicle">Vehicle / Callsign</label>
                <input
                  id="comms-vehicle"
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                  placeholder="e.g. Red JK, Rock Rhino"
                  required
                  maxLength={60}
                />
              </div>
            </div>
            <button className="btn btn-primary" type="submit" style={{ width: "fit-content" }}>Join Chat</button>
          </form>
        </div>
      </section>
    );
  }

  const visibleMessages = messages.filter((m) => m.channel === tab || m.sosType);
  const canPostHere = tab === "Chat" || isStaff;

  return (
    <div className="comms-chat">
      <div className="comms-header">
        <div>
          <div className="eyebrow accent" style={{ fontSize: 11 }}>{eventTitle}</div>
          <div style={{ fontSize: 13, color: "var(--text-dim)" }}>{name} &middot; {vehicle}{isStaff && " · Staff"}</div>
        </div>
      </div>

      <div className="comms-tabs">
        <button type="button" className={tab === "Chat" ? "comms-tab active" : "comms-tab"} onClick={() => setTab("Chat")}>Chat</button>
        <button type="button" className={tab === "Announcements" ? "comms-tab active" : "comms-tab"} onClick={() => setTab("Announcements")}>Announcements</button>
      </div>

      <div className="comms-sos-row">
        {SOS_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            type="button"
            className="comms-sos-btn"
            disabled={sending}
            onClick={() => send(`Needs help — ${opt.label}`, "Chat", opt.type)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="comms-messages" ref={listRef}>
        {visibleMessages.length === 0 && (
          <p style={{ color: "var(--text-dim)", fontSize: 14, textAlign: "center", marginTop: 24 }}>
            {tab === "Chat" ? "No messages yet — say hi." : "No announcements yet."}
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

      {error && <p className="form-error-banner" style={{ margin: "0 var(--sp-3)" }}>{error}</p>}

      {canPostHere ? (
        <form
          className="comms-composer"
          onSubmit={(e) => {
            e.preventDefault();
            send(draft, tab);
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={tab === "Announcements" ? "Post an announcement…" : "Message the group…"}
            maxLength={500}
            disabled={sending}
          />
          <button className="btn btn-primary btn-sm" type="submit" disabled={sending || !draft.trim()}>Send</button>
        </form>
      ) : (
        <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-dim)", padding: "var(--sp-3)" }}>
          Only staff can post here — you can still read along.
        </p>
      )}
    </div>
  );
}
