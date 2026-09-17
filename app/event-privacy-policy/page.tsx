import type { Metadata } from "next";
import { PRIVACY_POLICY_LABEL, PRIVACY_POLICY_VERSION } from "@/lib/waivers";
import { LegalShortVersion } from "@/components/FormHelpers";

export const metadata: Metadata = {
  alternates: { canonical: "/event-privacy-policy" },
  title: "Event Registration, Communications & Media Privacy Policy",
  description:
    "How Asphalt & Dirt handles registration information, communications data, children's information, and event media.",
};

/** PRIVACY-1.1, published 2026-09-16. Merges the reviewed 1.1 replacement
 *  sections (staff access, media approval, providers, retention) into the 1.0
 *  policy. The label comes from lib/waivers.ts so the policy and every form show
 *  the same ID and date. Retention promises are kept by /api/cron/retention
 *  (lib/retention.ts: emergency contacts, rejected submissions); messages and
 *  signed agreements aren't due before 2028 / 2033. Backups: Airtable snapshots up to a year
 *  on the Team plan, Google up to 6 months, Resend logs 30 days, so "one year".
 *  The mailing address is the email-footer one (NEWSLETTER_MAILING_ADDRESS). */
const MAILING_ADDRESS = process.env.NEWSLETTER_MAILING_ADDRESS || "[TBD]";
const ORGANIZER = "JLDA Holdings Corp, a New Jersey corporation d/b/a Asphalt & Dirt";
const POLICY_VERSION = PRIVACY_POLICY_VERSION;
const EFFECTIVE = PRIVACY_POLICY_LABEL.split(" | ").slice(1).join(" · ");

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "What This Policy Covers",
    body: `This policy explains how ${ORGANIZER} ("A&D" or "the Organizer") collects, uses, shares, and retains personal information in connection with:
• One-day off-road events.
• Multi-day off-road events.
• Pop-up meetups, including meals, car shows, and social gatherings.
• Event registration, signed agreements, and parental permissions.
• Tailgate, our event communications system.
• Event photographs, videos, and audio recordings, including media you submit.

It applies to information handled by the Organizer. Independently operated venues, government agencies, social media platforms, and other services may handle information under their own privacy policies.

This policy explains our information practices. It is not a liability waiver, and acknowledging it does not grant photo or video permission or consent to optional marketing.`,
  },
  {
    heading: "Information We Collect",
    body: `Registration and agreement information. We collect the information requested on the applicable registration form, which may include: adult legal name, email address, and telephone number; screen name and vehicle name; event selection and attendance dates; whether the adult is participating; signature, signing date, agreement version, the accepted agreement text, and acceptance records; photo, video, and audio permission choices; and, if you choose to provide one, an emergency contact's name, telephone number, and relationship.

When a parent or legal guardian registers a child, we also collect the child's legal name, age, relationship to the signing adult, the vehicle the child will ride in, attendance information where applicable, and the adult's permission choices for that child.

Communications information. We process the information needed to provide and administer Tailgate, including screen names, vehicle names, check-in status, and messages and media users submit.

Submitted media. When you send photos or videos through an event page or Tailgate, we collect the files, your name and email address, your permission choices and notes, your signature and the terms version you accepted, and your confirmation that you are 18 or older.

Technical information. Our services and their providers may process technical information such as IP addresses, browser and device information, access times, and error records. The providers involved are identified below.

Safety and incident information. If an incident occurs, we may receive information reasonably needed to seek assistance, document the incident, communicate with those involved, or handle an insurance or legal matter. Please avoid sending unnecessary medical or other sensitive information through group channels.`,
  },
  {
    heading: "Why We Use Information",
    body: `We use personal information to register participants and administer events; document agreements, parental permissions, and media choices; coordinate check-in, attendance, and event instructions; provide and manage Tailgate access; protect participants' contact information from unnecessary disclosure to other attendees; respond to questions, safety concerns, and misuse reports; contact emergency contacts or emergency services when appropriate; maintain necessary incident and legal records; review, publish, and manage event media in accordance with permission choices; maintain system reliability and security; and meet applicable legal obligations.

Information required to administer participation may be necessary to complete registration. Media permission is separate and may be declined.`,
  },
  {
    heading: "Staff Access And Attendee Visibility",
    body: `${ORGANIZER} uses private registration information to record event agreements, administer participation, coordinate check-in, and support event safety. Authorized event staff may access information needed for those tasks. The staff roster includes attendee telephone numbers, vehicle identifiers, and check-in status. Staff may use roster information for safety and event coordination, not unrelated personal purposes.

Tailgate shows your screen name and vehicle name to other attendees. It does not display your private registration fields, such as legal name, email address, or telephone number, in attendee profiles. Messages or media you choose to share may reveal your identity or other information. Other viewers may copy that content; screen names do not guarantee anonymity.

Before staff check you in, messages you send through Tailgate go to staff only. After check-in, group messages and posted media are visible to other checked-in participants when chat is open. Staff access is not continuous monitoring. Trail messaging closes at Roll Out and reopens when staff end trail mode. Closing chat or ending your access does not delete stored records.

Your Tailgate link provides personal access, may be stored on your device, and is emailed to you. Protect it like a password. Someone with the link or access to the device may use your account. Tell staff or contact team@asphaltanddirt.com if access is compromised; staff can reset your link so the old one stops working and a new one is emailed to you.

Children's legal names, signatures, and emergency contacts are never shown in attendee-visible profiles or channels. Do not post your own or anyone else's private information in group communications.`,
  },
  {
    heading: "GMRS, Recording, And Location",
    body: `GMRS radio is our primary event communication method. Tailgate provides an additional way to communicate, especially for participants without a GMRS radio.

GMRS transmissions may be heard by others, and FCC call-sign identification requirements still apply. Tailgate's privacy features do not make GMRS transmissions private.

Neither this policy nor an event agreement authorizes recording private conversations.

Voice recording and transcription: Tailgate is text, photo, and video only. It does not record, transmit, or transcribe voice calls.

Location information: Tailgate does not collect, display, or share precise location. Participants describe their own position in their own words when they choose to.`,
  },
  {
    heading: "Event Media And Public Galleries",
    body: `Photos posted in Tailgate are visible to checked-in participants when posted but require staff approval before publication in the public event gallery. Videos do not enter the public gallery automatically. Media submitted through the event page also requires review before publication. Publicly published media may be accessible worldwide, indexed by search engines, copied, and shared beyond A&D's control.

We record optional media permission separately for adults and each listed child. A person may decline and still participate. An unselected media choice does not grant permission. An uploader's permission to use a file does not replace the permissions needed from identifiable people. Our media permission does not authorize publication of private registration information or children's full names.

We may reject, hide, or remove a submission, and we review requests concerning media we control at team@asphaltanddirt.com. Removing an item from A&D's pages may not remove copies already made by others, and we may be unable to retrieve printed materials already distributed. This does not limit any legal removal or withdrawal rights.`,
  },
  {
    heading: "Children's Information",
    body: `Event registration and agreement signing must be completed by an adult. Parents or legal guardians provide children's participation details and media choices, and the signing parent or guardian must attend with the child.

We use children's registration information to document permission, administer participation, support supervision and emergency assistance, and record media choices.

Tailgate accounts and uploads are restricted to adults aged 18 or older; children do not receive accounts through this registration. If you believe a child has submitted information directly, contact team@asphaltanddirt.com so we can review the account and the applicable requirements.

A parent or legal guardian may contact us to request access to, correction of, or deletion of their child's information or to discuss permission choices. We may verify the requester's identity and authority. The retention schedule below may limit deletion.`,
  },
  {
    heading: "Service Providers And Other Recipients",
    body: `Authorized staff. People who need information for registration, communications administration, participant support, safety, or incident handling. Access reflects their responsibilities.

Service providers. These providers process relevant information to supply their services:
• Agreement, registration, and Tailgate records: Airtable (airtable.com/privacy).
• Media storage: Google Drive (policies.google.com/privacy).
• Email delivery: Resend (resend.com/legal/privacy-policy).
• Website hosting and site analytics: Vercel (vercel.com/legal/privacy-policy).
• Processing locations: primarily the United States.

Emergency and professional assistance. Emergency responders, emergency contacts, legal advisers, or other appropriate professionals when needed for assistance, claims, or legal obligations.

Authorities and legal requests. Recipients required by applicable law or valid legal process, or when disclosure is reasonably necessary to address fraud, security incidents, or threats to safety.

Public audiences. People who view event media published under the applicable media permission.

Venues and government agencies generally collect their own registrations, permits, payments, and waivers directly. We do not routinely send participant registration information to venues.`,
  },
  {
    heading: "Cookies, Analytics, And Advertising",
    body: `Our registration pages and Tailgate may use cookies or similar technology, including your device's local storage, to maintain sessions, support security, remember settings, and operate forms.

Analytics: we use Vercel Web Analytics, which reports aggregate page traffic. It does not use cross-site tracking cookies to build advertising profiles.

We do not sell personal information or share it for cross-context behavioral advertising, and we do not use participant information for targeted advertising.

Optional promotional email: our newsletter is entirely separate from event registration. People opt in themselves, and every newsletter includes an unsubscribe link. Registering for an event does not subscribe you to it. Operational event messages are separate from optional promotional subscriptions.`,
  },
  {
    heading: "How Long We Keep Information",
    body: `We use the following schedule for information collected under this policy version. We restrict access to retained records and delete information when its retention period expires unless a specific legal requirement, unresolved claim, or documented preservation duty requires us to keep it longer. We retain only the information needed for that purpose and review the exception when it ends.

Adult agreements and participation records. We retain signed agreements, the accepted text and version, necessary signature evidence, and participation records for seven years after the event ends.

Children's participation records. We retain parental permissions, relevant participation and incident records, and necessary signature evidence until the later of seven years after the event ends or the child's 21st birthday. This schedule does not require retaining unrelated chat or emergency-contact details for that entire period.

Routine Tailgate messages. We retain routine messages for two years after the event ends. A message relevant to an incident or claim may instead be retained with the restricted incident record for the period applicable to that record.

Emergency contacts. We delete additional emergency-contact names and telephone numbers within 90 days after the event ends, except for information specifically needed for an unresolved incident or a legal preservation duty. The attendee's own registration contact information follows the participation-record schedule. Additional emergency contacts are stored separately from the long-term signed agreement.

Submitted media. We delete rejected or unused submissions within 90 days after the event ends or submission, whichever is later. We review published or otherwise actively used media at least annually and remove files no longer needed for the permitted purposes. Withdrawal requests are handled as described in the media terms and applicable law.

Media consent evidence. We retain the minimum evidence of consent and any withdrawal while the corresponding media remains in use and for three years after A&D's final use, or longer when the participation-record schedule or a specific legal preservation duty applies. Retaining proof of consent does not authorize new uses after withdrawal.

Technical and security logs. Kept by our service providers for up to 90 days.

Deletion and backups. We carry out scheduled deletion through manual or automated procedures. Deleted information may remain in restricted backups for up to one year before it is overwritten or securely deleted. Those copies are not used for ordinary operations, and deletion instructions are reapplied if a backup must be restored. Applicable legal obligations may require a different process.

Earlier versions. Information collected under an earlier policy is handled in accordance with the promises applicable when it was collected, except where a lawful change or overriding legal obligation permits or requires otherwise.`,
  },
  {
    heading: "Information Security",
    body: `We use safeguards appropriate to the information we handle.

Our safeguards include:

• Access to registration records, signed agreements, and Tailgate data is limited to Asphalt & Dirt staff accounts.
• The accounts that administer those records are protected with two-step verification.
• Participants' telephone numbers, email addresses, legal names, and emergency contacts are shown only to staff, never to other participants.
• Personal Tailgate links use random access codes that staff can reset.
• The website is served only over encrypted (HTTPS) connections.
• Our service providers encrypt the data they store and the data sent to and from them.
• The credentials our website uses to reach those providers stay on our servers and are never sent to participants' browsers.

No system or transmission method is completely secure. Participants should protect their personal links and report suspected unauthorized access to the contact listed below.

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
    body: `We may update this policy as our practices change. The published policy will identify its policy ID, version, and effective date, and every form will show the same label.

For material changes, we will provide notice through an appropriate channel and obtain additional consent where required. A policy update does not itself expand previously granted media permission.`,
  },
  {
    heading: "Contact Us",
    body: `For privacy questions or requests, contact ${ORGANIZER} at team@asphaltanddirt.com.

Mailing address: ${MAILING_ADDRESS}.

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
        <p className="lead mt-2">{EFFECTIVE}</p>

        {/* Plain summary + contents first, so nobody has to read 15 sections to
            find the one answer they came for. The policy text below is unchanged. */}
        <div className="mt-4">
          <LegalShortVersion
            points={[
              "This covers event sign-ups, Tailgate, and photos and videos from our events. It isn't a waiver.",
              "Other attendees only see your screen name and vehicle name. Staff see your phone number, vehicle and check-in status, for coordination and safety.",
              "Photo and video permission is optional. Photos need staff approval before they go in a public gallery.",
              "We don't sell your information or use it for targeted ads.",
              "Emergency contacts are deleted within 90 days. Signed agreements are kept 7 years and routine Tailgate messages 2 years.",
              "Email team@asphaltanddirt.com to see, correct or delete your information.",
            ]}
          />
        </div>
        <nav className="legal-contents mt-3" aria-label="Policy sections">
          <p className="legal-contents-title">Contents</p>
          <ol>
            {SECTIONS.map((section, i) => (
              <li key={section.heading}>
                <a href={`#policy-${i + 1}`}>{section.heading}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-6">
          {SECTIONS.map((section, i) => (
            <div key={section.heading} style={{ marginBottom: 28 }}>
              <h2 id={`policy-${i + 1}`} style={{ fontSize: 20, scrollMarginTop: 96 }}>{i + 1}. {section.heading}</h2>
              <div className="mt-2">
                <Body body={section.body} />
              </div>
            </div>
          ))}
        </div>

        <p style={{ color: "var(--text-dim)", fontSize: 13 }}>{PRIVACY_POLICY_LABEL}</p>
      </div>
    </section>
  );
}
