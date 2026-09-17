/**
 * The Garage "Studio" screens for the Podcast Production base (replaces the
 * Airtable Podcast Production interface and the New Video Ideas form, so
 * Anthony works from his phone without an Airtable seat). Each table is
 * described once here; the list, the edit form and the save route all read
 * this. Safe to import on the client.
 */

export type StudioFieldKind = "text" | "textarea" | "select" | "date" | "checkbox" | "url" | "email" | "phone" | "number" | "links";

export interface StudioField {
  key: string;
  /** Airtable field name. */
  field: string;
  label: string;
  kind: StudioFieldKind;
  options?: string[];
  /** For `links`: which table's records to pick from. */
  linkTo?: StudioTableKey;
  help?: string;
  placeholder?: string;
  required?: boolean;
  /** Shown on the list card under the title. */
  onCard?: boolean;
}

export interface StudioTable {
  key: StudioTableKey;
  table: string;
  label: string;
  singular: string;
  /** The primary field (the card title). */
  titleField: string;
  groupField: string;
  groups: string[];
  /** Default values for a new record. */
  defaults: Record<string, string | boolean>;
  fields: StudioField[];
}

export type StudioTableKey = "ideas" | "episodes" | "guests" | "sponsors";

export const STUDIO_TABLES: Record<StudioTableKey, StudioTable> = {
  ideas: {
    key: "ideas",
    table: "Video Ideas",
    label: "Video ideas",
    singular: "idea",
    titleField: "Working Title",
    groupField: "Status",
    groups: ["Idea", "Approved", "Scheduled to Film", "Filmed", "In Edit", "Published"],
    defaults: { Status: "Idea", Source: "Team Idea", Type: "Podcast" },
    fields: [
      { key: "title", field: "Working Title", label: "Working title", kind: "text", required: true },
      { key: "status", field: "Status", label: "Status", kind: "select", options: ["Idea", "Approved", "Scheduled to Film", "Filmed", "In Edit", "Published"] },
      { key: "notes", field: "Concept / Notes", label: "Concept / notes", kind: "textarea", onCard: true },
      { key: "type", field: "Type", label: "Type", kind: "select", options: ["Podcast", "Trail Event"], onCard: true },
      { key: "source", field: "Source", label: "Where it came from", kind: "select", options: ["Team Idea", "Viewer Suggestion", "Research Pipeline", "Other"] },
      { key: "target", field: "Target Publish Date", label: "Target publish date", kind: "date", onCard: true },
      { key: "collab", field: "Collab", label: "Collab", kind: "checkbox", help: "With another creator or channel." },
      { key: "guests", field: "Guests", label: "Guests", kind: "links", linkTo: "guests" },
      { key: "episode", field: "Linked Episode", label: "Episode", kind: "links", linkTo: "episodes", help: "Link it once it's really being made." },
    ],
  },
  episodes: {
    key: "episodes",
    table: "Episodes",
    label: "Episodes",
    singular: "episode",
    titleField: "Title",
    groupField: "Status",
    groups: ["Draft", "Published"],
    defaults: { Status: "Draft", Type: "Podcast" },
    fields: [
      { key: "title", field: "Title", label: "Title", kind: "text", required: true },
      { key: "status", field: "Status", label: "Status", kind: "select", options: ["Draft", "Published"] },
      { key: "type", field: "Type", label: "Type", kind: "select", options: ["Podcast", "Trail Event"], onCard: true },
      { key: "date", field: "Publication Date", label: "Publication date", kind: "date", onCard: true },
      { key: "slug", field: "Slug", label: "Web address (slug)", kind: "text", placeholder: "lowercase-with-hyphens", help: "The end of /podcast/… Lowercase, hyphens, unique." },
      { key: "description", field: "Description", label: "Short description", kind: "textarea", help: "Used on cards and in search results." },
      { key: "showNotes", field: "Show Notes", label: "Show notes", kind: "textarea" },
      { key: "youtubeId", field: "YouTube Video ID", label: "YouTube video ID", kind: "text", placeholder: "dQw4w9WgXcQ" },
      { key: "guests", field: "Guests", label: "Guests", kind: "links", linkTo: "guests" },
      { key: "sponsors", field: "Sponsors", label: "Sponsors", kind: "links", linkTo: "sponsors" },
      { key: "collab", field: "Collab", label: "Collab", kind: "checkbox" },
      { key: "spotify", field: "Spotify URL", label: "Spotify link", kind: "url" },
      { key: "apple", field: "Apple Podcasts URL", label: "Apple Podcasts link", kind: "url" },
      { key: "amazon", field: "Amazon Music URL", label: "Amazon Music link", kind: "url" },
      { key: "ytmusic", field: "YouTube Music URL", label: "YouTube Music link", kind: "url" },
      { key: "buzzsprout", field: "Buzzsprout Embed URL", label: "Buzzsprout embed link", kind: "url" },
      { key: "playlist", field: "YouTube Playlist URL", label: "YouTube playlist link", kind: "url" },
      { key: "registration", field: "Event Registration URL", label: "Event registration link", kind: "url", help: "Trail Event episodes only." },
      { key: "affiliate", field: "Affiliate Disclosure", label: "Affiliate disclosure", kind: "textarea" },
    ],
  },
  guests: {
    key: "guests",
    table: "Guests",
    label: "Guests",
    singular: "guest",
    titleField: "Guest Name",
    groupField: "Booking Status",
    groups: ["Reached Out", "Confirmed", "Filmed", "Declined"],
    defaults: { "Booking Status": "Reached Out" },
    fields: [
      { key: "name", field: "Guest Name", label: "Name", kind: "text", required: true },
      { key: "booking", field: "Booking Status", label: "Booking status", kind: "select", options: ["Reached Out", "Confirmed", "Filmed", "Declined"] },
      { key: "email", field: "Contact Email", label: "Email", kind: "email", onCard: true },
      { key: "phone", field: "Contact Phone", label: "Phone", kind: "phone", onCard: true },
      { key: "bio", field: "Public Bio", label: "Public bio", kind: "textarea" },
      { key: "socials", field: "Social Links", label: "Social links", kind: "textarea", placeholder: "Instagram: https://instagram.com/handle", help: "One per line as Platform: link." },
      { key: "hasChannel", field: "Has Own YouTube Channel", label: "Has their own YouTube channel", kind: "checkbox", help: "A possible collab." },
      { key: "channel", field: "YouTube Channel URL", label: "YouTube channel link", kind: "url" },
      { key: "notes", field: "Notes", label: "Notes", kind: "textarea" },
      { key: "episodes", field: "Episodes", label: "Episodes", kind: "links", linkTo: "episodes" },
    ],
  },
  sponsors: {
    key: "sponsors",
    table: "Sponsors",
    label: "Sponsors",
    singular: "sponsor",
    titleField: "Sponsor Name",
    groupField: "Status",
    groups: ["Active", "Inactive"],
    defaults: { Status: "Active", "Payment Status": "Pending" },
    fields: [
      { key: "name", field: "Sponsor Name", label: "Sponsor", kind: "text", required: true },
      { key: "status", field: "Status", label: "Status", kind: "select", options: ["Active", "Inactive"] },
      { key: "payment", field: "Payment Status", label: "Payment", kind: "select", options: ["Pending", "Invoiced", "Paid"], onCard: true },
      { key: "rate", field: "Deal Rate", label: "Deal rate ($)", kind: "number", onCard: true },
      { key: "contactName", field: "Contact Name", label: "Contact name", kind: "text" },
      { key: "contactEmail", field: "Contact Email", label: "Contact email", kind: "email" },
      { key: "website", field: "Website URL", label: "Website", kind: "url" },
      { key: "disclosure", field: "Public Disclosure Text", label: "Public disclosure text", kind: "textarea", help: "Exactly what shows in the episode's sponsor block." },
      { key: "notes", field: "Notes", label: "Notes", kind: "textarea" },
      { key: "episodes", field: "Episodes", label: "Episodes", kind: "links", linkTo: "episodes" },
    ],
  },
};

export const STUDIO_ORDER: StudioTableKey[] = ["ideas", "episodes", "guests", "sponsors"];

export function isStudioTable(key: string): key is StudioTableKey {
  return key in STUDIO_TABLES;
}
