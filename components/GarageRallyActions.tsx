"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

async function call(body: unknown): Promise<string | null> {
  const res = await fetch("/api/garage/rally", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return data.error || "Something went wrong.";
}

export function ClaimButtons({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = async (next: string) => {
    if (next === "Cancelled" && !confirm("Cancel this claim? The points go back to the rider.")) return;
    setBusy(true);
    const err = await call({ action: "claim", id, status: next });
    setBusy(false);
    if (err) setError(err);
    else router.refresh();
  };
  if (status === "Done" || status === "Cancelled") return null;
  return (
    <span className="garage-links">
      {status === "New" && (
        <button type="button" className="garage-social-link" disabled={busy} onClick={() => set("In progress")}>
          Working on it
        </button>
      )}
      <button type="button" className="garage-social-link" disabled={busy} onClick={() => set("Done")}>
        Done
      </button>
      <button type="button" className="garage-social-link" disabled={busy} onClick={() => set("Cancelled")}>
        Cancel
      </button>
      {error && <span className="garage-form-note">{error}</span>}
    </span>
  );
}

export function AdjustForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [points, setPoints] = useState("");
  const [label, setLabel] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="garage-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const err = await call({ action: "adjust", email, points: Number(points), label });
        setBusy(false);
        setMsg(err || "Saved.");
        if (!err) {
          setEmail("");
          setPoints("");
          setLabel("");
          router.refresh();
        }
      }}
    >
      <label>
        Rider email
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Points (+ or −)
        <input inputMode="numeric" required value={points} onChange={(e) => setPoints(e.target.value)} placeholder="10 or -10" />
      </label>
      <label>
        Why
        <input required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Walk-up at the Mud Run" />
      </label>
      <button className="btn btn-primary" disabled={busy}>
        {busy ? "Saving…" : "Add"}
      </button>
      {msg && <p className="garage-form-note">{msg}</p>}
    </form>
  );
}

export function SweepButton() {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <p>
      <button
        type="button"
        className="garage-social-link"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await fetch("/api/garage/rally", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sweep" }) });
          const data = await res.json().catch(() => ({}));
          setBusy(false);
          setMsg(res.ok ? `Done: +${data.sweep?.added?.event ?? 0} event, +${data.sweep?.added?.birthday ?? 0} birthday, +${data.sweep?.added?.order ?? 0} order.` : data.error || "Failed.");
          router.refresh();
        }}
      >
        {busy ? "Counting…" : "Count points now"}
      </button>{" "}
      {msg && <span className="garage-form-note">{msg}</span>}
    </p>
  );
}
