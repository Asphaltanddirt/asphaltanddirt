/**
 * Event waiver documents — the legal text shown on /comms/[slug]/waiver.
 *
 * Which one an event uses is set per-event (Waiver Version on the Event
 * Settings table in the Comms base), not here. The signed record stores the
 * exact Form ID accepted (see the Waiver Signatures table), so a later
 * revision never rewrites what someone actually agreed to — bump the version
 * ID rather than editing text in place once a document has been signed.
 *
 * Only the substantive sections live here. The registration/signature block
 * at the end of each document is the form itself (components/WaiverForm.tsx).
 */

export type WaiverVersion = "ONE-DAY-1.0" | "MULTI-DAY-1.0" | "POP-UP-1.0" | "ONE-DAY-1.1" | "MULTI-DAY-1.1";

/** What an event gets when its Waiver Version is left blank. 1.0 stays in
 *  DOCUMENTS so older signatures still render, but nothing new falls into it. */
export const DEFAULT_WAIVER_VERSION: WaiverVersion = "ONE-DAY-1.1";

export const WAIVER_CONFIG = {
  ORGANIZER: "JLDA Holding Corp d/b/a Asphalt & Dirt",
  SYSTEM: "Tailgate",
  PRIVACY: "asphaltanddirt.com/event-privacy-policy",
  CONTACT: "team@asphaltanddirt.com",
};

/** Policy ID recorded on every signature, and its label. Changing the policy
 *  means a new ID and the real publication date here; never backdate. */
export const PRIVACY_POLICY_VERSION = "PRIVACY-1.1";
export const PRIVACY_POLICY_LABEL = "Policy ID PRIVACY-1.1 | Version 1.1 | Effective September 16, 2026";

/** Terms shown on the event page's photo/video upload form. */
export const UPLOAD_TERMS_VERSION = "UPLOAD-1.1";

/** The organizer's legal name from version 1.1 on (1.0 said "Holding"). */
export const ORGANIZER_V11 = "JLDA Holdings Corp, a New Jersey corporation d/b/a Asphalt & Dirt";
export const PRIVACY_POLICY_PATH = "/event-privacy-policy";

export interface WaiverSection {
  heading: string;
  /** Paragraphs separated by a blank line. Lines starting with "• " render as bullets. */
  body: string;
}

export interface WaiverDocument {
  version: WaiverVersion;
  title: string;
  subtitle: string;
  /** Shown above the text, in the same red-flag styling the documents use. */
  notice: string;
  sections: WaiverSection[];
  /** Which form fields this version collects beyond the shared core. */
  collectsEmergencyContact: boolean;
  collectsAttendanceDates: boolean;
  /** The pop-up form has a fourth acceptance checkbox the others don't. */
  collectsMediaScopeAcknowledgment: boolean;
  /** Label wording differs: "participating" on rides, "attending" at meetups. */
  participationLabel: string;
  /** Version 1.1 rules: header lines, a vehicle per child, the signer must
   *  attend when children are listed, explicit Yes/No media and emergency
   *  contact choices, and a one-time media-submission acceptance. */
  v11?: boolean;
  /** Header lines shown above the sections (1.1). */
  header?: string[];
}

const RISK_NOTICE =
  "IMPORTANT: READ CAREFULLY. THIS AGREEMENT INCLUDES AN ASSUMPTION OF RISK AND RELEASE OF CERTAIN LEGAL CLAIMS.";

const SHARED_RECOVERY: WaiverSection = {
  heading: "Vehicle Recovery And Expenses",
  body: `A vehicle may become stuck, disabled, or damaged. Recovery, winching, towing, or other assistance may cause additional damage even when reasonable care is used.

The Organizer does not guarantee recovery equipment, services, or success. Before non-emergency assistance begins, the driver or vehicle owner and those assisting should agree on the proposed method.

I am responsible for arranging my vehicle's recovery and paying towing, repair, storage, or recovery charges I authorize or that are otherwise legally payable by me.

This section does not expand the liability release or waive claims protected by applicable law.`,
};

const SHARED_PRIVACY: WaiverSection = {
  heading: "Privacy And Personal Information",
  body: `The backup system is configured to help participants communicate without sharing their last names, email addresses, or telephone numbers with other participants.

I will use the designated display name or identifier and avoid sharing my own or anyone else's private information in participant-visible profiles, messages, or channels. Information voluntarily shared may be copied or redistributed.

These features do not guarantee anonymity or confidentiality and do not override GMRS call-sign identification requirements.

Legal names, signatures, contact information, and emergency details must be submitted through the Organizer's designated private registration process. Their collection, access, use, and retention are described in the privacy notice at {{PRIVACY}}.

This agreement does not authorize recording private conversations or communications.`,
};

function mediaSection(scopeWord: string): WaiverSection {
  return {
    heading: "Photo, Video, And Audio Permission",
    body: `This section applies only to people for whom "Consent" is selected below.

I authorize the Organizer and service providers acting on its behalf to capture and use each consenting person's image, likeness, and voice in all photographs, videos, and audio recordings made during ${scopeWord}.

Permission includes editing, reproduction, publication, display, and distribution worldwide in print and digital media for the Organizer's event documentation, training, website, social media, advertising, and promotion, without compensation or further approval, to the extent permitted by law.

Permission continues after the event, subject to applicable law. It does not permit unlawful or misleading use, implied endorsement of unrelated products, publication of private registration details, or publication of children's full names.

I retain ownership of media I voluntarily submit and grant the Organizer a nonexclusive, royalty-free license for these uses. I confirm that I have the necessary rights and permissions.

Requests concerning future media use may be sent to {{CONTACT}}. Applicable withdrawal and privacy rights remain unaffected.

Declining media permission does not prevent participation. This permission governs the Organizer's media practices; independent attendees may take their own photographs or videos.`,
  };
}

const ONE_DAY: WaiverDocument = {
  version: "ONE-DAY-1.0",
  title: "One-Day Off-Road Event Agreement",
  subtitle: "Adult Liability Waiver • Parent/Guardian Consent • Communications Terms • Media Permission",
  notice: RISK_NOTICE,
  collectsEmergencyContact: true,
  collectsAttendanceDates: false,
  collectsMediaScopeAcknowledgment: false,
  participationLabel: "participating",
  sections: [
    {
      heading: "Event And Organizer's Role",
      body: `This agreement covers {{EVENT}} on {{DATE}} at {{LOCATION}}, including trail riding, group coordination, guidance, spotting, vehicle recovery assistance when provided, and event communications.

The Organizer does not charge for participation or guiding. Participants pay required admission, access, or permit fees directly to the government agency or facility. The Organizer does not collect these fees and does not own or operate the riding property.

Participants must follow applicable laws, access restrictions, permit requirements, and facility rules and complete any separate venue registration, parental permission, or waiver requirements.

The participation and liability provisions apply only to this event. Communications terms also cover event-related coordination before and after the event.`,
    },
    {
      heading: "Acknowledgment Of Risks And Safety Responsibilities",
      body: `Off-road activities can cause property damage, serious injury, permanent disability, or death. Risks include unstable terrain, rocks, mud, water, steep slopes, drop-offs, collisions, rollovers, mechanical failure, sudden vehicle movement, weather, wildlife, errors by guides or participants, and delayed emergency assistance.

Drivers and passengers may experience jolting, impact, or ejection. Walking around vehicles, entering or exiting vehicles, spotting, and observing activities also present risks. Winching and towing involve moving vehicles, tensioned lines, equipment failure, and flying debris.

I voluntarily participate and accept the inherent risks. I will participate within my abilities and my vehicle's capabilities, follow safety instructions, and avoid driving or performing safety-sensitive activities while impaired.

Each driver remains responsible for vehicle condition, lawful operation, passengers, safe spacing, and deciding whether to attempt an obstacle. Guidance or spotting does not guarantee safe passage. I may decline an obstacle or stop safely and request assistance.

I will:
• Comply with applicable driver licensing, vehicle registration, and insurance requirements.
• Use appropriate seat belts, child restraints, helmets, and other protective equipment required by law, the facility, event rules, or the vehicle manufacturer.
• Remain on authorized routes, respect other users, and avoid damaging the land or leaving litter.
• Keep clear of moving vehicles and recovery operations unless assigned a role I am competent to perform.
• Follow recovery safety instructions and applicable facility restrictions.
• Report hazards, injuries, or equipment problems when safe to do so.

The Organizer may restrict or end participation for unsafe conduct or failure to follow event rules.`,
    },
    SHARED_RECOVERY,
    {
      heading: "Adult Liability Release",
      body: `TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, I RELEASE {{ORGANIZER}}, ITS OFFICERS, EMPLOYEES, VOLUNTEERS, AND RIDE LEADERS ACTING ON ITS BEHALF ("RELEASED PARTIES") FROM MY OWN CLAIMS FOR INJURY, DEATH, PROPERTY DAMAGE, OR LOSS ARISING FROM THIS EVENT OR ITS COMMUNICATIONS SYSTEM, INCLUDING CLAIMS CAUSED BY THE ORDINARY NEGLIGENCE OF THE RELEASED PARTIES.

As a parent or legal guardian, I also release related claims belonging to me personally, to the extent permitted by law.

This agreement does not purport to waive a child's independent legal claims. It does not release gross negligence, recklessness, intentional misconduct, or liability that cannot legally be released, including negligence where New York General Obligations Law § 5-326 applies.

No parent or guardian is required by this agreement to indemnify or reimburse the Released Parties for a child's claim.`,
    },
    {
      heading: "GMRS And Backup Communications",
      body: `GMRS radio is the Organizer's first line of communication at this event.

Anyone transmitting on GMRS must operate under a valid FCC GMRS license or other authorization permitted by FCC rules, including eligible family authorization where applicable. Participants must follow FCC call-sign identification requirements and event channel instructions.

Registration does not provide a GMRS license or authorize otherwise unlawful radio operation.

{{SYSTEM}} is a secondary, backup way to communicate, especially for participants who do not have a GMRS radio. It supplements the primary GMRS communication plan.

Coverage, connectivity, device compatibility, battery power, and service failures may delay or prevent messages. Neither method guarantees continuous monitoring, contact, rescue, or emergency response.

I will seek acknowledgment of important messages, follow the event briefing and emergency procedures, and contact 911 when appropriate and possible. I will communicate respectfully and stop in a safe location before using a screen or adjusting equipment.`,
    },
    SHARED_PRIVACY,
    {
      heading: "Children And Emergency Assistance",
      body: `I confirm that I am the parent or legal guardian of each child listed below and have authority to provide these permissions.

I permit each listed child to participate, acknowledge the disclosed risks, and will provide appropriate supervision. I will explain safety and privacy rules in an age-appropriate way and ensure required restraints and protective equipment are used.

This permission does not override driving restrictions, manufacturer age restrictions, system age limits, or separately required consent for children's accounts or personal information.

If I cannot communicate my wishes, I authorize the Organizer to seek emergency assistance for me. I also authorize the Organizer to seek emergency assistance for my listed children when needed.

Treatment remains subject to applicable law and healthcare-provider requirements. Assistance may be delayed, and I remain responsible for expenses legally payable by me.`,
    },
    mediaSection("this event"),
  ],
};

const MULTI_DAY: WaiverDocument = {
  version: "MULTI-DAY-1.0",
  title: "Multi-Day Off-Road Event Agreement",
  subtitle: "Adult Liability Waiver • Parent/Guardian Consent • Communications Terms • Media Permission",
  notice: RISK_NOTICE,
  collectsEmergencyContact: true,
  collectsAttendanceDates: true,
  collectsMediaScopeAcknowledgment: false,
  participationLabel: "participating",
  sections: [
    {
      heading: "Event And Organizer's Role",
      body: `This agreement covers participation in {{EVENT}} at {{LOCATION}} between the stated start and end dates, including scheduled trail rides, group coordination, guidance, spotting, vehicle recovery assistance when provided, scheduled Organizer-led gatherings, and event communications.

Independently arranged travel, lodging, camping, and personal activities are not Organizer-led activities merely because they occur during the event dates.

The Organizer does not charge for participation or guiding. Participants pay required admission, access, or permit fees directly to the applicable government agency or facility. The Organizer does not collect these fees and does not own or operate the riding properties.

Participants must follow applicable laws, access restrictions, permit requirements, and each venue's rules and separate registration, parental permission, or waiver requirements.

This agreement applies to each event day attended, including leaving and returning within the stated dates. It does not cover later events or an extension beyond those dates.`,
    },
    {
      heading: "Acknowledgment Of Risks And Daily Responsibilities",
      body: `Off-road activities can cause property damage, serious injury, permanent disability, or death. Risks include unstable terrain, rocks, mud, water, steep slopes, drop-offs, collisions, rollovers, mechanical failure, sudden vehicle movement, weather, wildlife, errors by guides or participants, and delayed emergency assistance.

Drivers and passengers may experience jolting, impact, or ejection. Walking around vehicles, entering or exiting vehicles, spotting, and observing activities also present risks. Winching and towing involve moving vehicles, tensioned lines, equipment failure, and flying debris.

Conditions and vehicle condition may change between days. Fatigue can affect judgment and driving ability. I will reassess my readiness each day and stop when tired, impaired, or unable to participate safely.

I voluntarily participate and accept the inherent risks. Each driver remains responsible for vehicle condition, lawful operation, passengers, safe spacing, and deciding whether to attempt an obstacle. Guidance or spotting does not guarantee safe passage. I may decline any activity or stop safely and request assistance.

I will:
• Participate within my abilities and my vehicle's capabilities.
• Comply with applicable driver licensing, vehicle registration, and insurance requirements.
• Use appropriate seat belts, child restraints, helmets, and other protective equipment required by law, the facility, event rules, or the vehicle manufacturer.
• Follow each day's briefings and safety instructions.
• Remain on authorized routes, respect other users, and avoid damaging the land or leaving litter.
• Keep clear of moving vehicles and recovery operations unless assigned a role I am competent to perform.
• Report hazards, injuries, or equipment problems when safe to do so.

The Organizer may change or cancel activities because of conditions and may restrict or end participation for unsafe conduct.`,
    },
    SHARED_RECOVERY,
    {
      heading: "Adult Liability Release",
      body: `TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, I RELEASE {{ORGANIZER}}, ITS OFFICERS, EMPLOYEES, VOLUNTEERS, AND RIDE LEADERS ACTING ON ITS BEHALF ("RELEASED PARTIES") FROM MY OWN CLAIMS FOR INJURY, DEATH, PROPERTY DAMAGE, OR LOSS ARISING FROM COVERED EVENT ACTIVITIES OR THE COMMUNICATIONS SYSTEM, INCLUDING CLAIMS CAUSED BY THE ORDINARY NEGLIGENCE OF THE RELEASED PARTIES.

As a parent or legal guardian, I also release related claims belonging to me personally, to the extent permitted by law.

This agreement does not purport to waive a child's independent legal claims. It does not release gross negligence, recklessness, intentional misconduct, or liability that cannot legally be released, including negligence where New York General Obligations Law § 5-326 applies.

No parent or guardian is required by this agreement to indemnify or reimburse the Released Parties for a child's claim.`,
    },
    {
      heading: "GMRS And Backup Communications",
      body: `GMRS radio is the Organizer's first line of communication during event activities.

Anyone transmitting on GMRS must operate under a valid FCC GMRS license or other authorization permitted by FCC rules, including eligible family authorization where applicable. Participants must follow FCC call-sign identification requirements and event channel instructions.

Registration does not provide a GMRS license or authorize otherwise unlawful radio operation.

{{SYSTEM}} is a secondary, backup way to communicate, especially for participants who do not have a GMRS radio. It supplements the primary GMRS communication plan.

Coverage, connectivity, device compatibility, battery power, and service failures may delay or prevent messages. Neither system guarantees continuous monitoring, contact, rescue, or emergency response, including overnight.

I will follow each day's communication and emergency briefing, seek acknowledgment of important messages, and contact 911 when appropriate and possible. I will communicate respectfully and stop in a safe location before using a screen or adjusting equipment.`,
    },
    SHARED_PRIVACY,
    {
      heading: "Children And Emergency Assistance",
      body: `I confirm that I am the parent or legal guardian of each child listed below and have authority to provide these permissions.

I permit each listed child to participate during the stated event dates, acknowledge the disclosed risks, and will provide appropriate supervision throughout their attendance. I will explain safety and privacy rules in an age-appropriate way and ensure required restraints and protective equipment are used.

This permission does not override driving restrictions, manufacturer age restrictions, system age limits, or separately required consent for children's accounts or personal information.

If I cannot communicate my wishes, I authorize the Organizer to seek emergency assistance for me. I also authorize the Organizer to seek emergency assistance for my listed children when needed.

Treatment remains subject to applicable law and healthcare-provider requirements. Assistance may be delayed, and I remain responsible for expenses legally payable by me.

Anyone who turns 18 during the event must sign an adult agreement before further participation as an adult.`,
    },
    mediaSection("covered event activities"),
  ],
};

const POP_UP: WaiverDocument = {
  version: "POP-UP-1.0",
  title: "Pop-Up Meetup Communications & Media Agreement",
  subtitle: "For Meals, Car Shows, Social Gatherings, and Similar Meetups",
  notice: "",
  collectsEmergencyContact: false,
  collectsAttendanceDates: false,
  collectsMediaScopeAcknowledgment: true,
  participationLabel: "attending",
  sections: [
    {
      heading: "Scope And Participation",
      body: `This agreement covers communications and media permission for {{EVENT}} on {{DATE}} at {{LOCATION}}, including related coordination before and after it.

The Organizer does not charge for meetup coordination. Participants pay their own food, admission, parking, and other purchases directly to the relevant business or agency.

Participants must follow venue rules, respect other attendees, and act safely around vehicles and parking areas. Parents and legal guardians remain responsible for supervising children in their care.

This form does not authorize off-road riding, vehicle recovery, or other organized driving activities. An organized trail ride requires a separate ride agreement.`,
    },
    {
      heading: "GMRS And Backup Communications",
      body: `GMRS radio is the Organizer's first line of event communication.

Anyone transmitting on GMRS must operate under a valid FCC GMRS license or other authorization permitted by FCC rules, including eligible family authorization where applicable. Participants must follow FCC call-sign identification requirements and event channel instructions.

Registration does not provide a GMRS license or authorize otherwise unlawful radio operation.

{{SYSTEM}} is a secondary, backup way to communicate, especially for attendees who do not have a GMRS radio.

Messages may be delayed or unavailable because of coverage, connectivity, battery power, device compatibility, or service interruptions. Neither system guarantees continuous monitoring, contact, or emergency response.

For an emergency, contact 911 when appropriate and possible and notify venue staff.

I will use communications respectfully, avoid harassment and unnecessary messages, and park safely before typing or adjusting equipment while operating a vehicle.`,
    },
    SHARED_PRIVACY,
    mediaSection("this meetup"),
    {
      heading: "Children And Parent/Guardian Permission",
      body: `I confirm that I am the parent or legal guardian of each child listed below and have authority to provide these permissions.

I authorize their attendance under appropriate supervision. Where system age requirements allow, I permit supervised communications-system use.

This permission does not override service age restrictions or replace separately required consent for children's accounts or personal information.

This agreement does not waive my or my children's personal-injury claims.`,
    },
  ],
};

// ---------------------------------------------------------------------------
// Version 1.1 (2026-09-16). Adopted by JLDA Holdings Corp from the drafts in
// "AD-Event-Agreements-Revised-Drafts.docx". Text is word for word; section 12
// of the drafts (details, choices and signature) is the form itself.
// ---------------------------------------------------------------------------

const V11_NOTICE =
  "READ CAREFULLY. THIS AGREEMENT INCLUDES AN ASSUMPTION OF RISK AND A RELEASE OF CERTAIN ADULT CLAIMS, INCLUDING ORDINARY NEGLIGENCE WHERE THE LAW PERMITS. MEDIA PERMISSION IS OPTIONAL.";

const V11_REGISTRATION: WaiverSection = {
  heading: "Registration And Check In",
  body: `Each attending adult must complete and sign their own agreement. I cannot sign for another adult. Each child must be listed by a parent or legal guardian who attends and accepts the supervision duties below. Registration may be completed in advance or through the event registration code at check-in.

Staff may check in registered occupants by vehicle, but each adult's signature and each child's parental permission remain separate. I will identify my vehicle and all occupants and report changes. Registration or vehicle check-in alone does not establish that everyone is authorized to participate. The Organizer may refuse or end participation when required permissions are missing.`,
};

const V11_RECOVERY: WaiverSection = {
  heading: "Vehicle Recovery And Expenses",
  body: `A stuck or disabled vehicle may suffer additional damage during recovery even when reasonable care is used. The Organizer does not guarantee recovery equipment, services, or success. Before non-emergency assistance begins, the vehicle owner or driver and those assisting should agree on the proposed method and any charge.

I am responsible for arranging recovery and for towing, repair, storage, or recovery charges that I authorize or that are otherwise legally payable by me. This provision does not expand the release below or excuse unlawful conduct.`,
};

const V11_RELEASE: WaiverSection = {
  heading: "Adult Liability Release",
  body: `TO THE EXTENT PERMITTED BY APPLICABLE LAW, I RELEASE THE ORGANIZER AND ITS OFFICERS, EMPLOYEES, VOLUNTEERS, AND RIDE LEADERS ACTING ON ITS BEHALF (THE "RELEASED PARTIES") FROM CLAIMS BELONGING TO ME FOR INJURY, DEATH, LOSS OF OR DAMAGE TO MY VEHICLE OR OTHER PROPERTY, OR OTHER LOSS ARISING FROM MY PARTICIPATION IN THE COVERED ACTIVITIES, INCLUDING CLAIMS CAUSED BY THE RELEASED PARTIES' ORDINARY NEGLIGENCE IN EVENT COORDINATION, GUIDANCE, SPOTTING, RECOVERY ASSISTANCE, OR EVENT COMMUNICATIONS.

If I sign as a parent or legal guardian, this release also applies, to the extent legally permitted, to related claims belonging to me personally. It does not waive a child's independent claims or impose any duty to indemnify or reimburse the Released Parties for a child's claim.

This agreement does not release gross negligence, recklessness, intentional misconduct, violation of a duty or liability that cannot lawfully be released, or negligence to which New York General Obligations Law § 5-326 applies. It does not release independent claims of nonsigners, including any wrongful-death rights that cannot be waived by me. It does not release claims for unlawful use or disclosure of personal information or media. The risk acknowledgment does not expand this release.`,
};

function v11Comms(overnight: boolean): WaiverSection {
  return {
    heading: "Trail Communications Radios And Tailgate",
    body: `The group's primary trail communication method is the staff-designated radio channel. A working, compatible radio in every vehicle is strongly recommended. Before departure, I will tell staff if my vehicle lacks one and agree on a workable communication arrangement. The Organizer may restrict participation if no suitable arrangement is available and is not obligated to supply equipment.

GMRS transmission requires a valid license or other authority permitted by FCC rules, including authorized family operation where applicable. I will follow required call-sign identification and staff channel instructions. Registration and a loaned radio provide no additional transmitting authority. Properly authorized FRS equipment may be used when compatible with the event plan.

Tailgate supports registration, check-in, and communication before and after trail activities. At Roll Out, attendee messaging closes and the screen displays the selected trail channel and its last update time. Channel changes are announced by radio. A screen may remain outdated without a connection. Tailgate is not a trail communication or emergency system and has no SOS or emergency-alert feature.

Coverage, connectivity, equipment, batteries, and service failures can prevent contact. No method guarantees continuous monitoring, rescue, or emergency response${overnight ? ", including overnight" : ""}. I will follow the emergency briefing, use the trail radio or safely signal a staff vehicle to reach staff, and seek acknowledgment of important messages. In an emergency I will contact 911 when possible, including an available satellite emergency feature if appropriate. I will stop safely before using a screen or adjusting equipment.`,
  };
}

const V11_PRIVACY: WaiverSection = {
  heading: "Personal Access And Privacy",
  body: `After registration I receive a personal Tailgate link by email, and access may be remembered on my device. Someone with the link or access to that device may act as me. I will keep both secure and notify staff or {{CONTACT}} promptly if access is compromised. I will not share my account with another adult or a child. Tailgate accounts and uploads are for adults aged 18 or older.

Before check-in, my messages go to staff only; this is not a continuously monitored service. After check-in, group messages are visible to other checked-in participants. Tailgate displays my screen name and vehicle name to attendees, not my private registration fields. Information I put in a message or profile may identify me and may be copied. Radio traffic is not private and call-sign requirements still apply.

I will submit legal names, signatures, contact information, and emergency details through the private registration process. Authorized staff can access registration information needed for event administration and safety. The event roster includes my phone number, vehicle, and check-in status. Staff may use it for event coordination and safety, not unrelated personal purposes. Service providers process information as described in the Event Privacy Policy at {{PRIVACY}}. I will avoid sharing private information about myself or others in attendee-visible channels. This agreement does not authorize recording private conversations.`,
};

function v11Children(multiDay: boolean): WaiverSection {
  return {
    heading: "Children And Emergency Assistance",
    body: `I confirm that I am the parent or legal guardian of each listed child and have authority to give these permissions. I authorize their participation, acknowledge the described risks, and will attend and provide appropriate supervision. I will explain safety rules, follow age and driving restrictions, and ensure required restraints and protective equipment are used.

At check-in and whenever an assignment changes, I will tell staff which vehicle each child occupies. A child may ride with another registered adult only with my permission while I remain an attending guardian responsible for supervision. This permission does not create a child's Tailgate account or replace venue permissions or any separately required data consent. ${
      multiDay
        ? "A person who turns 18 during the event must sign their own adult agreement before continuing as an adult."
        : "A person who is 18 or older on the event date must sign their own adult agreement."
    }

If I cannot communicate my wishes, I authorize the Organizer to seek emergency assistance for me. I also authorize it to seek help for my listed children when needed. Treatment is subject to law and healthcare-provider requirements. Assistance may be delayed. I remain responsible for expenses legally payable by me. An adult may decline an additional emergency contact; that can make notification more difficult.`,
  };
}

const V11_MEDIA: WaiverSection = {
  heading: "Optional Media Permission",
  body: `Only a person with "Yes" selected on the signature page grants this permission. Declining does not prevent participation. For each consenting person, I authorize the Organizer and providers acting for it to capture and use that person's image, likeness, and voice from Covered Activities, including media submitted by attendees, for event documentation, training, the website and public event gallery, social media, advertising, and promotion. Uses may include editing, reproduction, and distribution worldwide in print and digital media, without compensation or further approval.

Permission continues after the event until withdrawn for future uses. It does not authorize unlawful or misleading use, endorsement of unrelated products, disclosure of private registration information, publication of a child's full name, or recording private conversations. I may withdraw by contacting {{CONTACT}}. After processing the request, the Organizer will stop new uses and take reasonable steps to remove affected media it controls. Previously distributed printed copies and third-party copies may remain; applicable legal rights are preserved. Independent attendees may take their own photos and videos; this permission does not authorize their independent uses.`,
};

const V11_SUBMISSIONS: WaiverSection = {
  heading: "Participant Media Submissions",
  body: `When chat is open after check-in, media I post in Tailgate is visible immediately to other checked-in participants. Photos require staff approval before appearing in the public event gallery. Videos do not enter that gallery automatically. Uploads through the event page also require review before publication. Service providers store the files. Staff may hide or remove posts, including any associated gallery display. Other viewers may already have copied them.

I will share only files I created or am authorized to license and only with permission appropriate to the sharing and proposed uses from recognizable adults and from a parent or legal guardian of each recognizable child. I will respect media refusals and avoid private information. I retain ownership of my submitted files and grant the Organizer a nonexclusive, royalty-free license to store, reproduce, edit, display, and distribute them for the uses in section 9, subject to valid permissions for depicted people. This license is separate from my own likeness choice and grants no rights I do not hold. The withdrawal process in section 9 also applies to future use of my submissions.`,
};

const V11_LAW: WaiverSection = {
  heading: "Applicable Law And Separate Provisions",
  body: `To the extent legally permitted, this agreement is governed by the law of the event state identified above. This choice does not displace any mandatory protection applicable to a person or claim. A dispute may be brought in a court with lawful jurisdiction and venue. This agreement imposes no arbitration or jury-trial waiver. If a provision is unenforceable, the remaining provisions continue to the extent lawful; severability does not enlarge the release or eliminate a protected claim.`,
};

const V11_PAYMENT = `The Organizer receives no payment for this event, including participation, guiding, or access fees, and does not own or operate the riding property. I pay required access, admission, or permit charges directly to the relevant facility or government agency. I must follow applicable laws, access restrictions, permit conditions, and venue rules and complete any separately required venue registration or permissions.`;

const V11_RISK_OPENING = `Off-road activities can cause property damage, serious injury, permanent disability, or death. Risks include unstable terrain, rocks, mud, water, slopes, drop-offs, collisions, rollovers, mechanical failure, sudden vehicle movement, weather, wildlife, errors by guides or participants, and delayed emergency assistance. Entering and leaving vehicles, walking, spotting, and observing also present risks. Winching and towing involve tensioned lines, equipment failure, and flying debris.`;

const V11_RISK_DUTIES = `I will use required seat belts, child restraints, helmets, and protective equipment; comply with driver-license, registration, and insurance requirements; stay on authorized routes; respect other users and the land; keep clear of recovery operations unless competent and assigned a role; and report hazards or injuries when safe. I will not drive or perform safety-sensitive activities while impaired. The Organizer may change or cancel activities or restrict participation for unsafe conduct.`;

const ONE_DAY_V11: WaiverDocument = {
  version: "ONE-DAY-1.1",
  title: "One Day Off Road Event Agreement",
  subtitle: "Adult participation and parental permission",
  notice: V11_NOTICE,
  collectsEmergencyContact: true,
  collectsAttendanceDates: false,
  collectsMediaScopeAcknowledgment: false,
  participationLabel: "participating",
  v11: true,
  header: [
    "Event: {{EVENT}}   Date: {{DATE}}",
    "Location and property: {{LOCATION}}   Event state: {{STATE}}",
    "Organizer: {{ORGANIZER_V11}} (the \"Organizer\").",
  ],
  sections: [
    {
      heading: "Event And Organizer Role",
      body: `This agreement covers trail riding, group coordination, guidance, spotting, vehicle recovery assistance when provided, and related event communications for the stated event (the "Covered Activities"). In exchange for permission to participate, I accept the terms below.

${V11_PAYMENT}

The participation and liability terms cover only this event. Communications terms also apply to its coordination before and after the event. Independent travel to and from the event and separately arranged personal activities are not covered activities.`,
    },
    V11_REGISTRATION,
    {
      heading: "Risks And Safety Responsibilities",
      body: `${V11_RISK_OPENING}

I voluntarily participate at my own risk of injury or death and loss of or damage to my vehicle or other property, subject to section 5. Drivers remain responsible for vehicle condition, lawful operation, passengers, safe spacing, and obstacle decisions. Guidance does not guarantee safety. I may decline an activity or stop safely to request help. I will follow the safety briefing and participate within my abilities and my vehicle's capabilities.

${V11_RISK_DUTIES}`,
    },
    V11_RECOVERY,
    V11_RELEASE,
    v11Comms(false),
    V11_PRIVACY,
    v11Children(false),
    V11_MEDIA,
    V11_SUBMISSIONS,
    V11_LAW,
  ],
};

const MULTI_DAY_V11: WaiverDocument = {
  version: "MULTI-DAY-1.1",
  title: "Multi Day Off Road Event Agreement",
  subtitle: "Adult participation and parental permission",
  notice: V11_NOTICE,
  collectsEmergencyContact: true,
  collectsAttendanceDates: true,
  collectsMediaScopeAcknowledgment: false,
  participationLabel: "participating",
  v11: true,
  header: [
    "Event: {{EVENT}}   Dates: {{DATE}}",
    "Location and property: {{LOCATION}}   Event state: {{STATE}}",
    "Organizer: {{ORGANIZER_V11}} (the \"Organizer\").",
  ],
  sections: [
    {
      heading: "Event And Organizer Role",
      body: `This agreement covers scheduled trail rides, scheduled Organizer-led gatherings, group coordination, guidance, spotting, vehicle recovery assistance when provided, and related event communications during the stated dates (the "Covered Activities"). In exchange for permission to participate, I accept the terms below.

${V11_PAYMENT}

This agreement covers each event day I attend, including leaving and returning within the stated dates. Independently arranged travel, lodging, camping, and personal activities are not covered merely because they occur during those dates. A later event or an extension beyond these dates requires a new agreement.`,
    },
    V11_REGISTRATION,
    {
      heading: "Risks And Safety Responsibilities",
      body: `${V11_RISK_OPENING}

I voluntarily participate at my own risk of injury or death and loss of or damage to my vehicle or other property, subject to section 5. Drivers remain responsible for vehicle condition, lawful operation, passengers, safe spacing, and obstacle decisions. Guidance does not guarantee safety. I may decline an activity or stop safely to request help. Conditions and vehicle condition may change between days. I will reassess readiness each day, follow each day's briefing, and stop when fatigue, impairment, or other conditions prevent safe participation.

${V11_RISK_DUTIES}`,
    },
    V11_RECOVERY,
    V11_RELEASE,
    v11Comms(true),
    V11_PRIVACY,
    v11Children(true),
    V11_MEDIA,
    V11_SUBMISSIONS,
    V11_LAW,
  ],
};

const DOCUMENTS: Record<WaiverVersion, WaiverDocument> = {
  "ONE-DAY-1.0": ONE_DAY,
  "MULTI-DAY-1.0": MULTI_DAY,
  "POP-UP-1.0": POP_UP,
  "ONE-DAY-1.1": ONE_DAY_V11,
  "MULTI-DAY-1.1": MULTI_DAY_V11,
};

export interface WaiverContext {
  eventName: string;
  eventDate: string;
  location: string;
  /** 1.1: the governing-law state, e.g. "New Jersey". */
  state?: string;
}


/** The document for a version, with event details and config substituted in. */
export function getWaiver(version: WaiverVersion | null | undefined, context: WaiverContext): WaiverDocument {
  const doc = DOCUMENTS[version || DEFAULT_WAIVER_VERSION] || ONE_DAY_V11;
  const fill = (text: string) =>
    text
      .replace(/\{\{ORGANIZER_V11\}\}/g, ORGANIZER_V11)
      .replace(/\{\{ORGANIZER\}\}/g, WAIVER_CONFIG.ORGANIZER)
      .replace(/\{\{STATE\}\}/g, context.state || "New Jersey")
      .replace(/\{\{SYSTEM\}\}/g, WAIVER_CONFIG.SYSTEM)
      .replace(/\{\{PRIVACY\}\}/g, WAIVER_CONFIG.PRIVACY)
      .replace(/\{\{CONTACT\}\}/g, WAIVER_CONFIG.CONTACT)
      .replace(/\{\{EVENT\}\}/g, context.eventName)
      .replace(/\{\{DATE\}\}/g, context.eventDate)
      .replace(/\{\{LOCATION\}\}/g, context.location);

  return {
    ...doc,
    header: doc.header?.map(fill),
    sections: doc.sections.map((s) => ({ heading: s.heading, body: fill(s.body) })),
  };
}

/** The whole agreement as plain text, exactly as shown, for the signature
 *  record (so what someone signed survives any later change to this file). */
export function waiverSnapshot(doc: WaiverDocument): string {
  return [
    `${doc.title} (${doc.version})`,
    doc.subtitle,
    ...(doc.header || []),
    doc.notice,
    ...doc.sections.map((s, i) => `${i + 1}. ${s.heading}\n${s.body}`),
  ]
    .filter(Boolean)
    .join("\n\n");
}
