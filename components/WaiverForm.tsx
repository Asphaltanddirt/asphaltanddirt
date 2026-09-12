"use client";

import { useState } from "react";
import { PRIVACY_POLICY_PATH, PRIVACY_POLICY_VERSION, type WaiverDocument } from "@/lib/waivers";

interface ChildEntry {
  name: string;
  age: string;
  relationship: string;
  mediaConsent: boolean;
  attendanceDates: string;
}

const emptyChild: ChildEntry = { name: "", age: "", relationship: "", mediaConsent: false, attendanceDates: "" };

/** Renders a waiver section body: blank-line-separated paragraphs, with
 *  "• " lines grouped into a list. */
function SectionBody({ body }: { body: string }) {
  const blocks = body.split("\n\n");
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines[0].startsWith("• ")) {
          return (
            <ul key={i} style={{ margin: "0 0 12px", paddingLeft: 18 }}>
              {lines.map((line, j) => (
                <li key={j} style={{ marginBottom: 4 }}>{line.replace(/^•\s*/, "")}</li>
              ))}
            </ul>
          );
        }
        return <p key={i} style={{ margin: "0 0 12px" }}>{block}</p>;
      })}
    </>
  );
}

export default function WaiverForm({
  slug,
  eventTitle,
  waiver,
}: {
  slug: string;
  eventTitle: string;
  waiver: WaiverDocument;
}) {
  const [legalName, setLegalName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [screenName, setScreenName] = useState("");
  const [vehicleCallsign, setVehicleCallsign] = useState("");
  const [adultParticipating, setAdultParticipating] = useState(true);
  const [adultMediaConsent, setAdultMediaConsent] = useState(false);
  const [adultAttendanceDates, setAdultAttendanceDates] = useState("");
  const [children, setChildren] = useState<ChildEntry[]>([]);
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");
  const [signature, setSignature] = useState("");
  const [acceptedAdultTerms, setAcceptedAdultTerms] = useState(false);
  const [acceptedParentalAuthority, setAcceptedParentalAuthority] = useState(false);
  const [acceptedMediaScope, setAcceptedMediaScope] = useState(false);
  const [acceptedElectronicSignature, setAcceptedElectronicSignature] = useState(false);
  const [acknowledgedPrivacyNotice, setAcknowledgedPrivacyNotice] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const busy = status === "submitting";

  function updateChild(index: number, patch: Partial<ChildEntry>) {
    setChildren((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!acceptedAdultTerms || !acceptedElectronicSignature) {
      setError("Please tick every acceptance box to continue.");
      return;
    }
    if (waiver.collectsMediaScopeAcknowledgment && !acceptedMediaScope) {
      setError("Please tick every acceptance box to continue.");
      return;
    }
    if (!acknowledgedPrivacyNotice) {
      setError("Please acknowledge the privacy policy to continue.");
      return;
    }
    const namedChildren = children.filter((c) => c.name.trim());
    if (namedChildren.length > 0 && !acceptedParentalAuthority) {
      setError("Please confirm you're the parent or legal guardian of the children listed.");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch(`/api/comms/${slug}/waiver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalName,
          email,
          phone,
          screenName,
          vehicleCallsign,
          adultParticipating,
          adultMediaConsent,
          adultAttendanceDates,
          signature,
          emergencyContactName: emergencyName,
          emergencyContactPhone: emergencyPhone,
          emergencyContactRelationship: emergencyRelationship,
          acceptedAdultTerms,
          acceptedParentalAuthority,
          acceptedMediaScope,
          acceptedElectronicSignature,
          acknowledgedPrivacyNotice,
          children: namedChildren,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="form-success">
        <div className="form-success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2>You&apos;re Registered</h2>
        <p className="lead" style={{ maxWidth: 480 }}>
          Check your email — we just sent your personal link to the group chat for {eventTitle}.
        </p>
      </div>
    );
  }

  return (
    <form className="build-form" onSubmit={handleSubmit}>
      <div className="form-section">
        <div className="form-section-title">{waiver.title}</div>
        <p className="form-section-hint">{waiver.subtitle}</p>
        {waiver.notice && <p className="waiver-notice">{waiver.notice}</p>}
        <div className="waiver-text">
          {waiver.sections.map((section, i) => (
            <div key={section.heading} style={{ marginBottom: 18 }}>
              <h3 className="waiver-heading">{i + 1}. {section.heading}</h3>
              <SectionBody body={section.body} />
            </div>
          ))}
        </div>
        <p className="form-section-hint" style={{ marginTop: 8 }}>Document: {waiver.version}</p>
      </div>

      <div className="form-section">
        <div className="form-section-title">Your Details</div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="w-legal">Full Legal Name</label>
            <input id="w-legal" value={legalName} onChange={(e) => setLegalName(e.target.value)} required disabled={busy} maxLength={120} />
          </div>
          <div className="form-field">
            <label htmlFor="w-email">Email <span className="optional">(Your chat link goes here)</span></label>
            <input id="w-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} maxLength={120} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="w-phone">Telephone</label>
            <input id="w-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required disabled={busy} maxLength={40} />
          </div>
          <div className="form-field">
            <label htmlFor="w-screen">Screen Name <span className="optional">(shown in chat)</span></label>
            <input id="w-screen" value={screenName} onChange={(e) => setScreenName(e.target.value)} required disabled={busy} maxLength={60} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="w-vehicle">Vehicle / Callsign</label>
            <input
              id="w-vehicle"
              value={vehicleCallsign}
              onChange={(e) => setVehicleCallsign(e.target.value)}
              placeholder="e.g. Red JK, Rock Rhino"
              required
              disabled={busy}
              maxLength={60}
            />
          </div>
          {waiver.collectsAttendanceDates && (
            <div className="form-field">
              <label htmlFor="w-dates">Planned Attendance Dates</label>
              <input
                id="w-dates"
                value={adultAttendanceDates}
                onChange={(e) => setAdultAttendanceDates(e.target.value)}
                placeholder="e.g. Fri–Sun, or Sat only"
                disabled={busy}
                maxLength={120}
              />
            </div>
          )}
        </div>

        <label className="waiver-check">
          <input type="checkbox" checked={adultParticipating} onChange={(e) => setAdultParticipating(e.target.checked)} disabled={busy} />
          I am also {waiver.participationLabel} (leave unticked if you&apos;re only signing for children)
        </label>
        <label className="waiver-check">
          <input type="checkbox" checked={adultMediaConsent} onChange={(e) => setAdultMediaConsent(e.target.checked)} disabled={busy} />
          <strong>Media permission:</strong>&nbsp;I consent to photo, video, and audio of me being used as described above
        </label>
      </div>

      <div className="form-section">
        <div className="form-section-title">Children <span className="optional">(Optional)</span></div>
        <p className="form-section-hint">
          Only if you&apos;re bringing children you&apos;re the parent or legal guardian of. Up to 4 — more require a signed
          paper attachment.
        </p>
        {children.map((child, i) => (
          <div key={i} className="waiver-child">
            <div className="form-row">
              <div className="form-field">
                <label htmlFor={`c-name-${i}`}>Child {i + 1} Full Legal Name</label>
                <input id={`c-name-${i}`} value={child.name} onChange={(e) => updateChild(i, { name: e.target.value })} disabled={busy} maxLength={120} />
              </div>
              <div className="form-field">
                <label htmlFor={`c-age-${i}`}>Age</label>
                <input id={`c-age-${i}`} value={child.age} onChange={(e) => updateChild(i, { age: e.target.value })} disabled={busy} maxLength={10} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor={`c-rel-${i}`}>Relationship To You</label>
                <input id={`c-rel-${i}`} value={child.relationship} onChange={(e) => updateChild(i, { relationship: e.target.value })} disabled={busy} maxLength={60} />
              </div>
              {waiver.collectsAttendanceDates && (
                <div className="form-field">
                  <label htmlFor={`c-dates-${i}`}>Attendance Dates</label>
                  <input id={`c-dates-${i}`} value={child.attendanceDates} onChange={(e) => updateChild(i, { attendanceDates: e.target.value })} disabled={busy} maxLength={120} />
                </div>
              )}
            </div>
            <label className="waiver-check">
              <input type="checkbox" checked={child.mediaConsent} onChange={(e) => updateChild(i, { mediaConsent: e.target.checked })} disabled={busy} />
              Media permission for this child
            </label>
            <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => setChildren((prev) => prev.filter((_, j) => j !== i))}>
              Remove
            </button>
          </div>
        ))}
        {children.length < 4 && (
          <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => setChildren((prev) => [...prev, { ...emptyChild }])} style={{ width: "fit-content" }}>
            Add A Child
          </button>
        )}
      </div>

      {waiver.collectsEmergencyContact && (
        <div className="form-section">
          <div className="form-section-title">Emergency Contact</div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="w-ec-name">Name</label>
              <input id="w-ec-name" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} required disabled={busy} maxLength={120} />
            </div>
            <div className="form-field">
              <label htmlFor="w-ec-phone">Telephone</label>
              <input id="w-ec-phone" type="tel" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} required disabled={busy} maxLength={40} />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="w-ec-rel">Relationship To Participant(s)</label>
            <input id="w-ec-rel" value={emergencyRelationship} onChange={(e) => setEmergencyRelationship(e.target.value)} required disabled={busy} maxLength={60} />
          </div>
        </div>
      )}

      <div className="form-section">
        <div className="form-section-title">Acceptance</div>
        <label className="waiver-check">
          <input type="checkbox" checked={acceptedAdultTerms} onChange={(e) => setAcceptedAdultTerms(e.target.checked)} disabled={busy} />
          {waiver.version === "POP-UP-1.0"
            ? "I am at least 18 and have read, understand, and accept the communications and privacy terms."
            : "I am at least 18, have read and understand this agreement, and voluntarily accept it, including the adult liability release."}
        </label>
        <label className="waiver-check">
          <input type="checkbox" checked={acceptedParentalAuthority} onChange={(e) => setAcceptedParentalAuthority(e.target.checked)} disabled={busy} />
          If children are listed, I confirm my authority and give the stated parental permissions.
        </label>
        {waiver.collectsMediaScopeAcknowledgment && (
          <label className="waiver-check">
            <input type="checkbox" checked={acceptedMediaScope} onChange={(e) => setAcceptedMediaScope(e.target.checked)} disabled={busy} />
            I understand that media permission applies only to people for whom consent is selected.
          </label>
        )}
        <label className="waiver-check">
          <input type="checkbox" checked={acceptedElectronicSignature} onChange={(e) => setAcceptedElectronicSignature(e.target.checked)} disabled={busy} />
          If signing electronically, I intend my electronic signature to serve as my signature on this agreement.
        </label>

        <div className="waiver-privacy">
          <div className="form-section-title" style={{ fontSize: 13 }}>Privacy Notice Acknowledgment</div>
          <p className="form-section-hint" style={{ marginBottom: 8 }}>
            <a href={PRIVACY_POLICY_PATH} target="_blank" rel="noopener" style={{ color: "var(--accent)", fontWeight: 700 }}>
              Read the Privacy Policy &rarr;
            </a>
            <br />
            Policy ID: {PRIVACY_POLICY_VERSION} &middot; Version 1.0 — September 12, 2026
          </p>
          <label className="waiver-check">
            <input type="checkbox" checked={acknowledgedPrivacyNotice} onChange={(e) => setAcknowledgedPrivacyNotice(e.target.checked)} disabled={busy} />
            I acknowledge that the Privacy Policy has been made available to me and explains how registration
            information, communications data, children&apos;s information, and event media are handled.
          </label>
          <p className="form-section-hint" style={{ marginTop: 8, marginBottom: 0 }}>
            This acknowledgment does not grant photo/video permission, consent to optional marketing, or replace any
            separately required parental consent. Your media choices are recorded separately in this registration.
          </p>
        </div>

        <div className="form-field mt-3">
          <label htmlFor="w-signature">Signature <span className="optional">(type your full legal name)</span></label>
          <input id="w-signature" value={signature} onChange={(e) => setSignature(e.target.value)} required disabled={busy} maxLength={120} />
        </div>
      </div>

      {error && <p className="form-error-banner">{error}</p>}

      <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: "fit-content" }}>
        {busy ? "Submitting…" : "Sign & Register"}
      </button>
    </form>
  );
}
