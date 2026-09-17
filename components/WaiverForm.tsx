"use client";

import { useState } from "react";
import { PRIVACY_POLICY_LABEL, PRIVACY_POLICY_PATH, type WaiverDocument } from "@/lib/waivers";
import { FullTerms, LegalShortVersion } from "./FormHelpers";

interface ChildEntry {
  name: string;
  age: string;
  relationship: string;
  mediaConsent: boolean;
  attendanceDates: string;
  vehicle: string;
}

const emptyChild: ChildEntry = { name: "", age: "", relationship: "", mediaConsent: false, attendanceDates: "", vehicle: "" };

/** Yes / No media choice (1.1). Nothing picked means no permission. */
function MediaChoice({ name, value, onChange, disabled, label }: { name: string; value: boolean | null; onChange: (v: boolean) => void; disabled: boolean; label: string }) {
  return (
    <fieldset className="waiver-choice">
      <legend>{label}</legend>
      <label className="waiver-check">
        <input type="radio" name={name} checked={value === true} onChange={() => onChange(true)} disabled={disabled} />
        Yes, I consent
      </label>
      <label className="waiver-check">
        <input type="radio" name={name} checked={value === false} onChange={() => onChange(false)} disabled={disabled} />
        No, I decline
      </label>
    </fieldset>
  );
}

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

/** Plain-language summary shown above the collapsed agreement. A reading aid
 *  only: what people sign is the full text (stored in Agreement Snapshot).
 *  Keep these in step with lib/waivers.ts whenever a version changes. */
function shortVersion(waiver: WaiverDocument): React.ReactNode[] | null {
  if (waiver.version === "ONE-DAY-1.1" || waiver.version === "MULTI-DAY-1.1") {
    return [
      "You take part at your own risk. Off-roading can damage vehicles and cause serious injury or death.",
      <>
        <strong>You give up the right to sue A&amp;D over ordinary negligence</strong>, as far as the law allows
        (section 5). It doesn&apos;t cover gross negligence, recklessness or intentional misconduct, and it doesn&apos;t
        waive your children&apos;s own claims.
      </>,
      "A&D doesn't charge for this ride and doesn't own the land. You follow the law, venue rules and staff instructions, including license, registration and insurance requirements.",
      "Recovery can damage a stuck vehicle. You arrange and pay for any towing, repair or recovery you agree to.",
      "On the trail, the staff radio channel is how the group talks. Tailgate isn't an emergency system: in an emergency, call 911.",
      "Bringing kids? You must attend and supervise them, and tell staff which vehicle each child is in.",
      "Photo and video permission is optional. Anything you post needs permission from the people in it.",
    ];
  }
  if (waiver.version === "POP-UP-1.0") {
    return [
      "This covers event communications and optional photo and video permission for this meetup. It isn't a trail ride agreement.",
      "You pay for your own food, admission and parking, follow venue rules, and supervise any kids you bring.",
      "GMRS radio is the main way we talk and Tailgate is a backup. Neither is an emergency service: call 911.",
      "Photo and video permission only applies to the people you say yes for.",
    ];
  }
  return null;
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
  const [confirmEmail, setConfirmEmail] = useState("");
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
  const [noEmergencyContact, setNoEmergencyContact] = useState(false);
  const [signature, setSignature] = useState("");
  const [acceptedAdultTerms, setAcceptedAdultTerms] = useState(false);
  const [acceptedParentalAuthority, setAcceptedParentalAuthority] = useState(false);
  const [acceptedMediaScope, setAcceptedMediaScope] = useState(false);
  const [acceptedElectronicSignature, setAcceptedElectronicSignature] = useState(false);
  const [acknowledgedPrivacyNotice, setAcknowledgedPrivacyNotice] = useState(false);
  const [postingTermsAccepted, setPostingTermsAccepted] = useState(false);
  // 1.1 asks Yes/No explicitly; null = not answered (treated as no).
  const [adultMediaChoice, setAdultMediaChoice] = useState<boolean | null>(null);
  const [childMediaChoices, setChildMediaChoices] = useState<(boolean | null)[]>([]);
  const [emergencyChoice, setEmergencyChoice] = useState<"" | "provide" | "decline">("");
  const v11 = Boolean(waiver.v11);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  // New sign-ups go straight into Tailgate; a repeat sign-up gets the link by email.
  const [commsPath, setCommsPath] = useState("");
  const [error, setError] = useState("");

  const busy = status === "submitting";

  // Compared normalised: addresses are case-insensitive in practice, and a
  // trailing space off a phone keyboard shouldn't read as a mismatch.
  const emailsMatch = email.trim().toLowerCase() === confirmEmail.trim().toLowerCase();
  const showEmailMismatch = confirmEmail.length > 0 && !emailsMatch;

  function updateChild(index: number, patch: Partial<ChildEntry>) {
    setChildren((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    // Checked before anything else — a typo'd address is the one mistake
    // that fails silently: the submission succeeds, the chat link sends to
    // a dead address, and nobody finds out until event day.
    if (!emailsMatch) {
      setError("Those two email addresses don't match — check for a typo.");
      return;
    }
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
    const namedChildren = children
      .map((c, i) => ({ ...c, mediaConsent: v11 ? childMediaChoices[i] === true : c.mediaConsent }))
      .filter((c) => c.name.trim());
    if (namedChildren.length > 0 && !acceptedParentalAuthority) {
      setError("Please confirm you're the parent or legal guardian of the children listed.");
      return;
    }
    if (v11) {
      if (namedChildren.some((c) => !c.vehicle.trim())) {
        setError("Please say which vehicle each child is riding in.");
        return;
      }
      if (!postingTermsAccepted) {
        setError("Please accept the photo and video posting terms.");
        return;
      }
      if (waiver.collectsEmergencyContact && !emergencyChoice) {
        setError("Please choose whether you'll give an emergency contact.");
        return;
      }
    }
    const declined = v11 ? emergencyChoice === "decline" : noEmergencyContact;

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
          adultParticipating: v11 && namedChildren.length > 0 ? true : adultParticipating,
          adultMediaConsent: v11 ? adultMediaChoice === true : adultMediaConsent,
          adultAttendanceDates,
          signature,
          emergencyContactName: declined ? "" : emergencyName,
          emergencyContactPhone: declined ? "" : emergencyPhone,
          emergencyContactRelationship: declined ? "" : emergencyRelationship,
          emergencyContactDeclined: declined,
          postingTermsAccepted,
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
      if (typeof data.commsPath === "string" && data.commsPath) {
        // Remembered on this phone, so scanning the sign-up QR again later
        // offers "Open Tailgate" instead of the whole waiver.
        try {
          window.localStorage.setItem(`ad-tailgate-link:${slug}`, data.commsPath);
        } catch {
          // Storage blocked; the emailed link still works.
        }
        setCommsPath(data.commsPath);
        setStatus("success");
        window.location.assign(data.commsPath);
        return;
      }
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
        {commsPath ? (
          <>
            <h2>You&apos;re In</h2>
            <p className="lead" style={{ maxWidth: 480 }}>
              Opening Tailgate for {eventTitle}. We also emailed you the link, so you can get back in any time.
            </p>
            <a className="btn btn-primary" href={commsPath}>Open Tailgate</a>
          </>
        ) : (
          <>
            <h2>You Were Already Signed Up</h2>
            <p className="lead" style={{ maxWidth: 480 }}>
              We saved your changes and emailed your personal Tailgate link for {eventTitle} to {email.trim()} again.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <form className="build-form" onSubmit={handleSubmit}>
      <div className="form-section">
        <h2 className="form-section-title">{waiver.title}</h2>
        <p className="form-section-hint">{waiver.subtitle}</p>
        {waiver.header && waiver.header.length > 0 && (
          <div className="waiver-header">
            {waiver.header.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        )}
        {/* The release notice stays in plain view (it has to be conspicuous);
            the long agreement text is one tap away under the summary. */}
        {waiver.notice && <p className="waiver-notice">{waiver.notice}</p>}
        {shortVersion(waiver) && <LegalShortVersion points={shortVersion(waiver)!} />}
        <FullTerms label={`Read the full agreement (${waiver.sections.length} sections)`}>
          <div className="waiver-text">
            {waiver.sections.map((section, i) => (
              <div key={section.heading} style={{ marginBottom: 18 }}>
                <h3 className="waiver-heading">{i + 1}. {section.heading}</h3>
                <SectionBody body={section.body} />
              </div>
            ))}
          </div>
          <p className="form-section-hint" style={{ marginTop: 8 }}>Document: {waiver.version}</p>
        </FullTerms>
      </div>

      <div className="form-section">
        <h2 className="form-section-title">Your Details</h2>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="w-legal">Full Legal Name</label>
            <input id="w-legal" autoComplete="name" value={legalName} onChange={(e) => setLegalName(e.target.value)} required disabled={busy} maxLength={120} />
          </div>
          <div className="form-field">
            <label htmlFor="w-phone">Telephone</label>
            <input id="w-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required disabled={busy} maxLength={40} />
          </div>
        </div>
        {/* Email and its confirmation share a row so they're side by side on
         *  desktop and stacked together on mobile — a confirm field two rows
         *  away from the original defeats the point. */}
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="w-email">Email <span className="optional">(Your chat link goes here)</span></label>
            <input id="w-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} maxLength={120} />
          </div>
          <div className="form-field">
            <label htmlFor="w-email-confirm">Confirm Email</label>
            <input
              id="w-email-confirm"
              type="email"
              autoComplete="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              required
              disabled={busy}
              maxLength={120}
              aria-invalid={showEmailMismatch}
              aria-describedby={showEmailMismatch ? "w-email-mismatch" : undefined}
            />
            {showEmailMismatch && (
              <p id="w-email-mismatch" className="form-field-error">These don&apos;t match yet.</p>
            )}
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="w-screen">Screen Name <span className="optional">(shown in chat)</span></label>
            <input id="w-screen" autoComplete="nickname" value={screenName} onChange={(e) => setScreenName(e.target.value)} required disabled={busy} maxLength={60} />
          </div>
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

        {v11 ? (
          <MediaChoice
            name="w-media"
            label="My optional media choice under section 9"
            value={adultMediaChoice}
            onChange={setAdultMediaChoice}
            disabled={busy}
          />
        ) : (
          <>
            <label className="waiver-check">
              <input type="checkbox" checked={adultParticipating} onChange={(e) => setAdultParticipating(e.target.checked)} disabled={busy} />
              I am also {waiver.participationLabel} (leave unticked if you&apos;re only signing for children)
            </label>
            <label className="waiver-check">
              <input type="checkbox" checked={adultMediaConsent} onChange={(e) => setAdultMediaConsent(e.target.checked)} disabled={busy} />
              <strong>Media permission:</strong>&nbsp;I consent to photo, video, and audio of me being used as described above
            </label>
          </>
        )}
      </div>

      <div className="form-section">
        <h2 className="form-section-title">Children <span className="optional">(Optional)</span></h2>
        <p className="form-section-hint">
          Only if you&apos;re bringing children you&apos;re the parent or legal guardian of. Up to 4 — more require a signed
          paper attachment.
          {v11 && " You must attend and supervise them. Anyone 18 or older signs their own agreement."}
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
              {v11 && (
                <div className="form-field">
                  <label htmlFor={`c-vehicle-${i}`}>Vehicle They Ride In</label>
                  <input id={`c-vehicle-${i}`} value={child.vehicle} onChange={(e) => updateChild(i, { vehicle: e.target.value })} placeholder="e.g. Red JK" required disabled={busy} maxLength={60} />
                </div>
              )}
              {waiver.collectsAttendanceDates && (
                <div className="form-field">
                  <label htmlFor={`c-dates-${i}`}>Attendance Dates</label>
                  <input id={`c-dates-${i}`} value={child.attendanceDates} onChange={(e) => updateChild(i, { attendanceDates: e.target.value })} disabled={busy} maxLength={120} />
                </div>
              )}
            </div>
            {v11 ? (
              <MediaChoice
                name={`c-media-${i}`}
                label="Media under section 9 for this child"
                value={childMediaChoices[i] ?? null}
                onChange={(v) => setChildMediaChoices((prev) => { const next = [...prev]; next[i] = v; return next; })}
                disabled={busy}
              />
            ) : (
              <label className="waiver-check">
                <input type="checkbox" checked={child.mediaConsent} onChange={(e) => updateChild(i, { mediaConsent: e.target.checked })} disabled={busy} />
                Media permission for this child
              </label>
            )}
            <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => {
              setChildren((prev) => prev.filter((_, j) => j !== i));
              setChildMediaChoices((prev) => prev.filter((_, j) => j !== i));
            }}>
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

      {waiver.collectsEmergencyContact && v11 && (
        <div className="form-section">
          <h2 className="form-section-title">Emergency Contact</h2>
          <p className="form-section-hint">
            An emergency contact is optional. Providing one may help us reach someone if you cannot communicate. Please
            tell that person you have given us their details for event safety. Declining does not prevent emergency
            assistance but may make notification harder.
          </p>
          <fieldset className="waiver-choice">
            <legend>Select one</legend>
            <label className="waiver-check">
              <input type="radio" name="w-ec-choice" checked={emergencyChoice === "provide"} onChange={() => setEmergencyChoice("provide")} disabled={busy} />
              I will provide a contact.
            </label>
            <label className="waiver-check">
              <input type="radio" name="w-ec-choice" checked={emergencyChoice === "decline"} onChange={() => setEmergencyChoice("decline")} disabled={busy} />
              I do not have a contact to provide or prefer not to share one.
            </label>
          </fieldset>
          {emergencyChoice === "provide" && (
            <>
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="w-ec-name">Contact Name</label>
                  <input id="w-ec-name" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} required disabled={busy} maxLength={120} />
                </div>
                <div className="form-field">
                  <label htmlFor="w-ec-phone">Phone</label>
                  <input id="w-ec-phone" type="tel" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} required disabled={busy} maxLength={40} />
                </div>
              </div>
              <div className="form-field">
                <label htmlFor="w-ec-rel">Relationship</label>
                <input id="w-ec-rel" value={emergencyRelationship} onChange={(e) => setEmergencyRelationship(e.target.value)} required disabled={busy} maxLength={60} />
              </div>
            </>
          )}
        </div>
      )}

      {waiver.collectsEmergencyContact && !v11 && (
        <div className="form-section">
          <h2 className="form-section-title">
            Emergency Contact {noEmergencyContact && <span className="optional">(Skipped)</span>}
          </h2>
          <p className="form-section-hint">
            Someone we can reach if something happens to you out there. Strongly recommended — but if you don&apos;t
            have someone to list, or would rather not share it, tick the box below and carry on.
          </p>
          {!noEmergencyContact && (
            <>
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
            </>
          )}
          {/* Unmounting the inputs (rather than just dropping `required`) is
           *  what actually clears the browser's own validation — a hidden
           *  required field blocks submit with a tooltip pointing at nothing. */}
          <label className="waiver-check">
            <input
              type="checkbox"
              checked={noEmergencyContact}
              onChange={(e) => setNoEmergencyContact(e.target.checked)}
              disabled={busy}
            />
            I don&apos;t have an emergency contact to give, or would rather not share one.
          </label>
        </div>
      )}

      <div className="form-section">
        <h2 className="form-section-title">Acceptance</h2>
        <label className="waiver-check">
          <input type="checkbox" checked={acceptedAdultTerms} onChange={(e) => setAcceptedAdultTerms(e.target.checked)} disabled={busy} />
          {waiver.version === "POP-UP-1.0"
            ? "I am at least 18 and have read, understand, and accept the communications and privacy terms."
            : v11
              ? "Required: I am at least 18, have read and understand this agreement, and voluntarily accept it, including the adult release in section 5."
              : "I am at least 18, have read and understand this agreement, and voluntarily accept it, including the adult liability release."}
        </label>
        <label className="waiver-check">
          <input type="checkbox" checked={acceptedParentalAuthority} onChange={(e) => setAcceptedParentalAuthority(e.target.checked)} disabled={busy} />
          {v11
            ? "If children are listed: I confirm my authority, give the stated parental permissions, and will attend and supervise as required by section 8."
            : "If children are listed, I confirm my authority and give the stated parental permissions."}
        </label>
        {waiver.collectsMediaScopeAcknowledgment && (
          <label className="waiver-check">
            <input type="checkbox" checked={acceptedMediaScope} onChange={(e) => setAcceptedMediaScope(e.target.checked)} disabled={busy} />
            I understand that media permission applies only to people for whom consent is selected.
          </label>
        )}
        {v11 && (
          <label className="waiver-check">
            <input type="checkbox" checked={postingTermsAccepted} onChange={(e) => setPostingTermsAccepted(e.target.checked)} disabled={busy} />
            Required: for any photo or video I post in Tailgate during this event, I have the necessary rights and permissions and accept the media-submission terms in section 10.
          </label>
        )}
        <label className="waiver-check">
          <input type="checkbox" checked={acceptedElectronicSignature} onChange={(e) => setAcceptedElectronicSignature(e.target.checked)} disabled={busy} />
          {v11
            ? "If signing electronically: I intend my typed full legal name to be my signature on this agreement and the choices recorded here."
            : "If signing electronically, I intend my electronic signature to serve as my signature on this agreement."}
        </label>

        <div className="waiver-privacy">
          <h2 className="form-section-title" style={{ fontSize: 13 }}>Privacy Notice Acknowledgment</h2>
          <p className="form-section-hint" style={{ marginBottom: 8 }}>
            <a href={PRIVACY_POLICY_PATH} target="_blank" rel="noopener" style={{ color: "var(--accent)", fontWeight: 700 }}>
              Read the Privacy Policy &rarr;
            </a>
            <br />
            {PRIVACY_POLICY_LABEL}
          </p>
          <label className="waiver-check">
            <input type="checkbox" checked={acknowledgedPrivacyNotice} onChange={(e) => setAcknowledgedPrivacyNotice(e.target.checked)} disabled={busy} />
            Required: The Event Privacy Policy has been made available to me and explains registration information,
            staff access, attendee communications, children&apos;s information, public media, service providers, and
            retention. This acknowledgment is not photo or video permission, consent to optional marketing, or a
            substitute for any separately required parental consent.
          </label>
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
