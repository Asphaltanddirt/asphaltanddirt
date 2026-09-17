"use client";

import { useState } from "react";
import type { Onboarding } from "@/lib/ambassadorOnboarding";

function when(value: string) {
  if (!value || value === "yes") return "";
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Onboarding an accepted ambassador without leaving the Garage. Each outward
 * step (an email, a code in Fourthwall) takes two taps, like Accept.
 */
export default function GarageOnboarding({ initial }: { initial: Onboarding }) {
  const [ob, setOb] = useState(initial);
  const [armed, setArmed] = useState<"" | "welcome1" | "code" | "welcome2">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("10");
  const [canUseExisting, setCanUseExisting] = useState(false);

  async function run(action: "welcome1" | "code" | "welcome2", useExisting = false) {
    if (armed !== action && !useExisting) {
      setArmed(action);
      setError("");
      return;
    }
    setBusy(true);
    setError("");
    setNote("");
    try {
      const res = await fetch("/api/garage/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ambassadorId: ob.id, action, code, percent, useExisting }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCanUseExisting(Boolean(data.canUseExisting));
        throw new Error(data.error || "That didn't work. Try again.");
      }
      if (data.onboarding) setOb(data.onboarding);
      setCanUseExisting(false);
      setNote(
        action === "code"
          ? "Code created in Fourthwall and saved."
          : data.status === "already-sent"
            ? "That email had already gone out."
            : "Email sent.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.");
    } finally {
      setArmed("");
      setBusy(false);
    }
  }

  const cleanCode = code.trim().toUpperCase();
  const welcome2Blocker = !ob.agreementSigned
    ? "Waiting on the signed agreement."
    : !ob.promoCode
      ? "Create their code first."
      : "";

  return (
    <div className="garage-onboarding">
      <ol className="garage-steps">
        <li className={ob.welcome1Sent ? "is-done" : ""}>
          <h3>Welcome email 1</h3>
          {ob.welcome1Sent ? (
            <p>Sent{when(ob.welcome1Sent) && ` ${when(ob.welcome1Sent)}`}. It has their agreement link.</p>
          ) : (
            <>
              <p>Welcomes them and links the agreement to sign. No code in this one.</p>
              <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => run("welcome1")}>
                {armed === "welcome1" ? "Tap again to send" : "Send welcome email 1"}
              </button>
            </>
          )}
        </li>

        <li className={ob.agreementSigned ? "is-done" : ""}>
          <h3>Agreement</h3>
          <p>
            {ob.agreementSigned
              ? `Signed${when(ob.agreementSigned) && ` ${when(ob.agreementSigned)}`}.`
              : "Waiting for them to sign. Nothing to do here."}
          </p>
        </li>

        <li className={ob.promoCode ? "is-done" : ""}>
          <h3>Discount code</h3>
          {ob.promoCode ? (
            <>
              <p className="garage-code">{ob.promoCode}</p>
              <p>
                {ob.discountPercent ? `${ob.discountPercent}% off for customers. ` : ""}
                Their link: <a href={ob.link} target="_blank" rel="noopener">{ob.link.replace(/^https:\/\/www\./, "")}</a>
                {" · "}
                {ob.linkVisits === 1 ? "1 visit" : `${ob.linkVisits} visits`}
              </p>
            </>
          ) : (
            <form
              className="garage-form garage-code-form"
              onSubmit={(e) => {
                e.preventDefault();
                run("code");
              }}
            >
              <div className="garage-code-fields">
                <div>
                  <label htmlFor={`code-${ob.id}`}>Code</label>
                  <input
                    id={`code-${ob.id}`}
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 20));
                      setArmed("");
                      setCanUseExisting(false);
                    }}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="JOSE10"
                    required
                    aria-describedby={`code-help-${ob.id}`}
                  />
                </div>
                <div>
                  <label htmlFor={`pct-${ob.id}`}>% off</label>
                  <input
                    id={`pct-${ob.id}`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={50}
                    value={percent}
                    onChange={(e) => {
                      setPercent(e.target.value);
                      setArmed("");
                    }}
                    required
                  />
                </div>
              </div>
              <p id={`code-help-${ob.id}`} className="garage-form-note">
                Letters and numbers. This makes the code in Fourthwall (whole order, shipping not discounted, no use
                limit) and their link, asphaltanddirt.com/r/{cleanCode.toLowerCase() || "code"}.
              </p>
              <button type="submit" className="btn btn-primary btn-sm" disabled={busy || cleanCode.length < 3}>
                {armed === "code" ? `Tap again to create ${cleanCode} at ${percent}% off` : "Create code"}
              </button>
              {canUseExisting && (
                <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => run("code", true)}>
                  Use that one
                </button>
              )}
            </form>
          )}
        </li>

        <li className={ob.welcome2Sent ? "is-done" : ""}>
          <h3>Welcome email 2</h3>
          {ob.welcome2Sent ? (
            <p>Sent{when(ob.welcome2Sent) && ` ${when(ob.welcome2Sent)}`}. They have their code and link.</p>
          ) : (
            <>
              <p>{welcome2Blocker || "Ready. Sends their code and link."}</p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={busy || Boolean(welcome2Blocker)}
                onClick={() => run("welcome2")}
              >
                {armed === "welcome2" ? "Tap again to send" : "Send welcome email 2"}
              </button>
            </>
          )}
        </li>

        <li className={ob.kitSent ? "is-done" : ""}>
          <h3>Welcome kit</h3>
          <p>{ob.kitSent ? "Shipped." : "Not marked shipped yet (Kit Sent in Airtable)."}</p>
        </li>
      </ol>

      <div aria-live="polite">
        {note && <p className="garage-form-note">{note}</p>}
      </div>
      {error && <p className="garage-error" role="alert">{error}</p>}
    </div>
  );
}
