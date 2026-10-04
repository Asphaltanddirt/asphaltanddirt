"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const RANKS = ["Rookie", "Regular", "Mainstay", "Legend"];
const EXPERIENCES = ["Lead the ride", "Pick the next ride", "Pro rig shoot"];

export interface AccountItem {
  id: string;
  item: string;
  points: number;
  type: "Gear" | "Rank gear" | "Experience";
  sizes: string[];
}

async function post(url: string, body: unknown): Promise<string | null> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return data.error || "Something went wrong. Try again.";
}

export function RallySignIn({ expired }: { expired?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState(expired ? "That sign-in link expired. Get a fresh one below." : "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError("");
    const err = await post("/api/rally/signin", { email });
    if (err) {
      setError(err);
      setState("idle");
    } else setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="form-before">
        <p className="form-before-heading">Check your email</p>
        <p>We sent a sign-in link to {email}. It works for one hour.</p>
      </div>
    );
  }

  return (
    <form className="build-form" onSubmit={submit}>
      <div className="form-field">
        <label htmlFor="rally-email">Your email</label>
        <input id="rally-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="The one you RSVP with" />
      </div>
      {error && <p className="form-error-banner">{error}</p>}
      <div>
        <button className="btn btn-primary" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Email Me a Sign-In Link"}
        </button>
      </div>
    </form>
  );
}

export function RallyProfile(props: {
  firstName: string;
  lastName: string;
  birthMonth: number | null;
  birthYear: number | null;
  boardOptOut: boolean;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(props.firstName);
  const [lastName, setLastName] = useState(props.lastName);
  const [birthMonth, setBirthMonth] = useState(props.birthMonth ? String(props.birthMonth) : "");
  const [birthYear, setBirthYear] = useState(props.birthYear ? String(props.birthYear) : "");
  const [optOut, setOptOut] = useState(props.boardOptOut);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    setError("");
    const err = await post("/api/rally/profile", {
      firstName,
      lastName,
      birthMonth: Number(birthMonth) || undefined,
      birthYear: Number(birthYear) || undefined,
      boardOptOut: optOut,
    });
    if (err) {
      setError(err);
      setState("idle");
    } else {
      setState("saved");
      router.refresh();
    }
  }

  return (
    <form className="build-form" onSubmit={save}>
      <div className="form-section">
        <div className="form-field">
          <label htmlFor="rally-first">First name</label>
          <input id="rally-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
        </div>
        <div className="form-field">
          <label htmlFor="rally-last">Last name</label>
          <input id="rally-last" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
          <p className="form-section-hint">The points board only shows your first name and last initial.</p>
        </div>
        <div className="form-field">
          <label htmlFor="rally-month">Birth month and year</label>
          <div style={{ display: "flex", gap: "var(--sp-2)", flexWrap: "wrap" }}>
            <select id="rally-month" value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)} aria-label="Birth month">
              <option value="">Month</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <input inputMode="numeric" pattern="\d{4}" placeholder="Year" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} aria-label="Birth year" style={{ maxWidth: 120 }} />
          </div>
          <p className="form-section-hint">5 points every birthday month. The year confirms you&apos;re 18+, which you need to claim.</p>
        </div>
        <label className={`form-checkbox${optOut ? " has-check" : ""}`}>
          <input type="checkbox" checked={optOut} onChange={(e) => setOptOut(e.target.checked)} />
          <span>Keep me off the points board</span>
        </label>
      </div>
      {error && <p className="form-error-banner">{error}</p>}
      <div>
        <button className="btn btn-primary" disabled={state === "saving"}>
          {state === "saving" ? "Saving…" : "Save"}
        </button>
        {state === "saved" && <span style={{ color: "var(--accent)", fontSize: 14, marginLeft: 12 }}>Saved.</span>}
      </div>
    </form>
  );
}

export function RallyClaim({ items, balance, rank, canClaim }: { items: AccountItem[]; balance: number; rank: string; canClaim: boolean }) {
  const router = useRouter();
  const [itemId, setItemId] = useState("");
  const [size, setSize] = useState("");
  const [rankPick, setRankPick] = useState(rank);
  const [choice, setChoice] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState("");
  const item = items.find((i) => i.id === itemId);
  const myRank = RANKS.indexOf(rank);

  async function claim(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    setState("saving");
    setError("");
    const err = await post("/api/rally/claim", { itemId, size: size || undefined, rank: item.type === "Rank gear" ? rankPick : undefined, choice: choice || undefined });
    if (err) {
      setError(err);
      setState("idle");
    } else {
      setState("done");
      router.refresh();
    }
  }

  if (state === "done") {
    return (
      <div className="form-before">
        <p className="form-before-heading">Claimed</p>
        <p>We&apos;ve got it. We&apos;ll email you about the next step (for gear, a code for our store; you cover shipping).</p>
      </div>
    );
  }
  if (!canClaim) return <p className="form-section-hint">Add your birth month and year above to claim (Rally Rewards is 18+).</p>;

  return (
    <form className="build-form" onSubmit={claim}>
      <div className="form-field">
        <label htmlFor="rally-item">What do you want?</label>
        <select id="rally-item" value={itemId} onChange={(e) => { setItemId(e.target.value); setSize(""); setChoice(""); }}>
          <option value="">Pick from the shelf</option>
          {items.map((i) => (
            <option key={i.id} value={i.id} disabled={i.points > balance}>
              {i.item} · {i.points} pts{i.points > balance ? ` (need ${i.points - balance} more)` : ""}
            </option>
          ))}
        </select>
      </div>
      {item?.type === "Rank gear" && (
        <div className="form-field">
          <label htmlFor="rally-rank">Which rank on it?</label>
          <select id="rally-rank" value={rankPick} onChange={(e) => setRankPick(e.target.value)}>
            {RANKS.filter((_, i) => i <= myRank).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <p className="form-section-hint">Your rank or any below it, so you can claim one for someone else.</p>
        </div>
      )}
      {item && item.sizes.length > 0 && (
        <div className="form-field">
          <label htmlFor="rally-size">Size</label>
          <select id="rally-size" value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="">Pick a size</option>
            {item.sizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}
      {item?.type === "Experience" && (
        <div className="form-field">
          <label htmlFor="rally-choice">Pick one</label>
          <select id="rally-choice" value={choice} onChange={(e) => setChoice(e.target.value)}>
            <option value="">Your pick</option>
            {EXPERIENCES.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>
      )}
      {error && <p className="form-error-banner">{error}</p>}
      <div>
        <button className="btn btn-primary" disabled={!item || state === "saving"}>
          {state === "saving" ? "Claiming…" : item ? `Claim for ${item.points} Points` : "Claim"}
        </button>
      </div>
    </form>
  );
}

export function RallySignOut() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn"
      onClick={async () => {
        await post("/api/rally/signout", {});
        router.refresh();
      }}
    >
      Sign Out
    </button>
  );
}

export function WasThereButton({ s, id, t }: { s: string; id: string; t: string }) {
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState("");
  if (state === "done") {
    return (
      <div className="form-before">
        <p className="form-before-heading">Got it. Points are on the way.</p>
        <p>
          See them any time on <a href="/rally">Rally Rewards</a>.
        </p>
      </div>
    );
  }
  return (
    <div>
      {error && <p className="form-error-banner">{error}</p>}
      <button
        className="btn btn-primary"
        disabled={state === "saving"}
        onClick={async () => {
          setState("saving");
          const err = await post("/api/rally/there", { s, id, t });
          if (err) {
            setError(err);
            setState("idle");
          } else setState("done");
        }}
      >
        {state === "saving" ? "Saving…" : "I Was There"}
      </button>
    </div>
  );
}
