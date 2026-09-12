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

export type WaiverVersion = "ONE-DAY-1.0" | "MULTI-DAY-1.0" | "POP-UP-1.0";

export const WAIVER_CONFIG = {
  ORGANIZER: "JLDA Holding Corp d/b/a Asphalt & Dirt",
  SYSTEM: "Tailgate",
  PRIVACY: "asphaltanddirt.com/event-privacy-policy",
  CONTACT: "team@asphaltanddirt.com",
};

export const PRIVACY_POLICY_VERSION = "PRIVACY-1.0";
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

const DOCUMENTS: Record<WaiverVersion, WaiverDocument> = {
  "ONE-DAY-1.0": ONE_DAY,
  "MULTI-DAY-1.0": MULTI_DAY,
  "POP-UP-1.0": POP_UP,
};

export interface WaiverContext {
  eventName: string;
  eventDate: string;
  location: string;
}

/** The document for a version, with event details and config substituted in. */
export function getWaiver(version: WaiverVersion | null | undefined, context: WaiverContext): WaiverDocument {
  const doc = DOCUMENTS[version || "ONE-DAY-1.0"] || ONE_DAY;
  const fill = (text: string) =>
    text
      .replace(/\{\{ORGANIZER\}\}/g, WAIVER_CONFIG.ORGANIZER)
      .replace(/\{\{SYSTEM\}\}/g, WAIVER_CONFIG.SYSTEM)
      .replace(/\{\{PRIVACY\}\}/g, WAIVER_CONFIG.PRIVACY)
      .replace(/\{\{CONTACT\}\}/g, WAIVER_CONFIG.CONTACT)
      .replace(/\{\{EVENT\}\}/g, context.eventName)
      .replace(/\{\{DATE\}\}/g, context.eventDate)
      .replace(/\{\{LOCATION\}\}/g, context.location);

  return { ...doc, sections: doc.sections.map((s) => ({ heading: s.heading, body: fill(s.body) })) };
}
