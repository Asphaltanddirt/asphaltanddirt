import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Event Registration, Communications & Media Privacy Policy",
  description:
    "How Asphalt & Dirt handles registration information, communications data, children's information, and event media.",
};

export const POLICY_VERSION = "PRIVACY-1.0";

/** TODO — still to fill before this is final: effective date, mailing
 *  address, retention periods (§10), and the specific security measures
 *  (§11). Everything else reflects the stack as actually built
 *  (Airtable / Resend / Vercel). */
const TBD = "[TBD]";
const ORGANIZER = "JLDA Holding Corp d/b/a Asphalt & Dirt";

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "What This Policy Covers",
    body: `This policy explains how ${ORGANIZER} ("the Organizer") collects, uses, shares, and retains personal information in connection with:
• One-day off-road events.
• Multi-day off-road events.
• Pop-up meetups, including meals, car shows, and social gatherings.
• Event registration, signed agreements, and parental permissions.
• Our backup communications system.
• Event photographs, videos, and audio recordings.

It applies to information handled by the Organizer. Independently operated venues, government agencies, social media platforms, and other services may handle information under their own privacy policies.

This policy explains our information practices. It is not a liability waiver, and acknowledging it does not grant photo/video permission or consent to unrelated marketing.`,
  },
  {
    heading: "Information We Collect",
    body: `Registration and agreement information. We collect the information requested on the applicable registration form, which may include: adult legal name, email address, and telephone number; event selection and attendance dates; whether the adult is participating; signature, signing date, agreement version, and acceptance records; photo, video, and audio permission choices; and emergency contact name, telephone number, and relationship.

When a parent or legal guardian registers a child, we also collect the child's legal name, age, relationship to the signing adult, attendance information where applicable, and the adult's permission choices.

Communications information. We process the information needed to provide and administer the backup communications system, including display names, vehicle callsigns, group membership, and messages users submit.

Technical information. Our services and their providers may process technical information such as IP addresses, browser and device information, access times, and error records. The providers involved are identified below.

Event media. We may collect photographs, videos, and audio recordings during events and media voluntarily submitted to us. Our use of identifiable event media is governed by the separate media choices in the applicable event agreement.

Safety and incident information. If an incident occurs, we may receive information reasonably needed to seek assistance, document the incident, communicate with those involved, or handle an insurance or legal matter. Please avoid sending unnecessary medical or other sensitive information through group channels.`,
  },
  {
    heading: "Why We Use Information",
    body: `We use personal information to register participants and administer events; document agreements, parental permissions, and media choices; coordinate attendance and distribute event instructions; provide and manage communications access; protect participants' contact information from unnecessary disclosure to other users; respond to questions, safety concerns, and misuse reports; contact emergency contacts or emergency services when appropriate; maintain necessary incident, insurance, and legal records; publish and manage event media in accordance with permission choices; maintain system reliability and security; and meet applicable legal obligations.

Information required to administer participation may be necessary to complete registration. Media permission is separate and may be declined.`,
  },
  {
    heading: "What Other Participants Can See",
    body: `The backup communications system is configured to help participants communicate without sharing their last names, email addresses, or telephone numbers with other participants.

Participants should use the designated display name or identifier. Other users may see that identifier and information shared in channels or groups they can access.

Private registration information, including children's legal names, signatures, and emergency contacts, is not intended for participant-visible profiles or channels.

Do not post your own or anyone else's private information in group communications. Information voluntarily disclosed may be heard, seen, copied, or redistributed by recipients.

These features reduce unnecessary disclosure but do not guarantee anonymity or confidentiality.`,
  },
  {
    heading: "GMRS, Recording, And Location",
    body: `GMRS radio is our primary event communication method. The backup system provides an additional way to communicate, especially for participants without a GMRS radio.

GMRS transmissions may be heard by others, and FCC call-sign identification requirements still apply. The backup system's privacy features do not make GMRS transmissions private.

Neither this policy nor an event waiver authorizes recording private conversations.

Voice recording and transcription: the backup communications system is text-only. It does not record, transmit, or transcribe voice.

Location information: the backup communications system does not collect, display, or share precise location. Participants describe their own position in their own words when they choose to.`,
  },
  {
    heading: "Children's Information",
    body: `Event registration and agreement signing must be completed by an adult. Parents or legal guardians provide the information needed to register their children.

We use children's registration information to document permission, administer participation, support appropriate supervision and emergency assistance, and record media choices.

Children's legal names and private registration details must not be placed in participant-visible profiles or group channels. Our event media permission does not authorize publication of children's full names.

Children under 13 must not create an account or independently submit information through the backup system under this policy. Parents should manage event coordination on their behalf.

Participants aged 13–17 may use the system only where the service permits their age group and a parent or legal guardian authorizes use.

If we introduce direct online collection from children under 13, we will first establish the notices, parental consent, and other safeguards required by applicable law.

A parent or legal guardian may contact us to request access to, correction of, or deletion of their child's information or to discuss permission choices. We may verify the requester's identity and authority. Legal record-retention requirements may limit deletion.

If you believe a child under 13 has submitted information directly without an appropriate process, contact us so we can investigate and take appropriate action.`,
  },
  {
    heading: "Service Providers And Other Recipients",
    body: `Authorized organizers and volunteers. Personnel who need information for registration, communications administration, participant support, safety, or incident handling. Access reflects their responsibilities.

Service providers we use:
• Registration records, signed agreements, and communications data: Airtable (airtable.com/privacy).
• Email delivery: Resend (resend.com/legal/privacy-policy).
• Website hosting and site analytics: Vercel (vercel.com/legal/privacy-policy).
• Processing locations: primarily the United States.

Emergency and professional assistance. Emergency responders, emergency contacts, insurers, legal advisers, or other appropriate professionals when needed for assistance, claims, or legal obligations.

Authorities and legal requests. Recipients required by applicable law or valid legal process, or when disclosure is reasonably necessary to address fraud, security incidents, or threats to safety.

Public audiences. People who view event media published under the applicable media permission. Posting media publicly allows others to view, copy, or redistribute it.

Venues and government agencies generally collect their own registrations, permits, payments, and waivers directly. We do not routinely send participant registration information to venues.`,
  },
  {
    heading: "Cookies, Analytics, And Advertising",
    body: `Our registration pages and communications services may use cookies or similar technology to maintain sessions, support security, remember settings, and operate forms.

Analytics: we use Vercel Web Analytics, which reports aggregate page traffic. It does not use cross-site tracking cookies to build advertising profiles.

We do not sell personal information or share it for cross-context behavioral advertising, and we do not use participant information for targeted advertising.

Optional promotional email: our newsletter is entirely separate from event registration. People opt in themselves, and every newsletter includes an unsubscribe link. Registering for an event does not subscribe you to it.

Operational event messages are separate from optional promotional subscriptions. Publicly posting media with permission is also separate from selling participant data.`,
  },
  {
    heading: "Photo, Video, And Audio Choices",
    body: `Media permission is collected separately for each adult and child on the applicable event form.

An unselected media choice does not grant permission. Declining media permission does not prevent participation.

When permission is granted, we may use event media for the purposes described in that event agreement. We do not use that permission to publish private registration information or children's full names.

To request a change to future media use or removal of an identifiable image from channels we control, contact us with enough information to locate the material.

We will review and respond to requests in accordance with applicable law and the relevant permission. We may be unable to retrieve printed materials already distributed or copies made by independent third parties. This does not limit any legal removal or withdrawal rights.`,
  },
  {
    heading: "How Long We Keep Information",
    body: `We retain information only for identified operational, safety, recordkeeping, or legal purposes. Retention depends on the category of information and applicable obligations.

Retention schedule: ${TBD}. Signed agreements, parental permissions, acceptance records, routine registration and attendance information, emergency contacts, communications accounts and messages, technical and security logs, event media and permission records, incident/insurance/legal records, and backup copies each have their own retention period, to be stated here.

Relevant information may be retained longer when required by law or reasonably needed for an active claim, investigation, or legal hold. Records concerning minors may require a different retention period from adult records.

When information is no longer needed, we delete, securely dispose of, or de-identify it as appropriate. Deletion from active systems may precede removal from scheduled backups.`,
  },
  {
    heading: "Information Security",
    body: `We use safeguards appropriate to the information we handle.

Our safeguards include: ${TBD}.

No system or transmission method is completely secure. Participants should protect account credentials and report suspected unauthorized access to the contact listed below.

We will provide notices concerning security incidents where required by applicable law.`,
  },
  {
    heading: "Your Requests And Choices",
    body: `You may contact us to ask what personal information we hold about you; request correction of inaccurate information; request access to or deletion of your information; update contact details or media choices; ask about your child's information where you have legal authority; or raise a privacy concern.

Depending on applicable law, you may also have rights to receive a copy of information, withdraw consent, opt out of certain processing, or appeal a decision concerning your request.

We may need to verify your identity or authority using information proportionate to the request. Please do not send identity documents or sensitive information unless we explain why they are needed and provide an appropriate submission method.

We respond within time limits required by applicable law. Some requests may be limited by recordkeeping obligations, legal claims, security needs, or other lawful exceptions. Where a request is declined, we will explain the reason and any applicable appeal process.

If you disagree with our response, email the privacy contact with "Privacy Appeal" in the subject line.`,
  },
  {
    heading: "Other Websites And Services",
    body: `Links to venue waivers, government permit sites, social media, or other third-party services lead to services with their own information practices.

Review their policies before submitting information. This policy does not control information collected independently by those services.`,
  },
  {
    heading: "Policy Changes",
    body: `We may update this policy as our practices change. The published policy will identify its version and effective date.

For material changes, we will provide notice through an appropriate channel and obtain additional consent where required. A policy update does not itself expand previously granted media permission.`,
  },
  {
    heading: "Contact Us",
    body: `For privacy questions or requests, contact ${ORGANIZER} at team@asphaltanddirt.com.

Mailing address: ${TBD}.

Please identify the relevant event and the nature of your request. Avoid including unnecessary sensitive information.`,
  },
];

function Body({ body }: { body: string }) {
  return (
    <>
      {body.split("\n\n").map((block, i) => {
        const lines = block.split("\n");
        if (lines[0].startsWith("• ")) {
          return (
            <ul key={i} className="mb-3" style={{ paddingLeft: 20 }}>
              {lines.map((line, j) => (
                <li key={j} style={{ marginBottom: 4 }}>{line.replace(/^•\s*/, "")}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{block}</p>;
      })}
    </>
  );
}

export default function EventPrivacyPolicyPage() {
  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="eyebrow accent">Policy ID: {POLICY_VERSION}</div>
        <h1 className="mt-2">Event Registration, Communications &amp; Media Privacy Policy</h1>
        <p className="lead mt-2">Version 1.0 — September 12, 2026</p>

        <div className="mt-6">
          {SECTIONS.map((section, i) => (
            <div key={section.heading} style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 20 }}>{i + 1}. {section.heading}</h2>
              <div className="mt-2">
                <Body body={section.body} />
              </div>
            </div>
          ))}
        </div>

        <p style={{ color: "var(--text-dim)", fontSize: 13 }}>
          Policy ID: {POLICY_VERSION} &middot; Version 1.0 — September 12, 2026
        </p>
      </div>
    </section>
  );
}
