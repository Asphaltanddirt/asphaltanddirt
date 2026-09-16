import type { EventRequirements } from "@/lib/vehicleRules";

/** The event page's Requirements, closed until tapped: the event's own items
 *  first, then each linked venue's waiver/pass/rules links, then the standard
 *  set for each Venue Type. The RSVP form's checkbox agrees to all of it. */
export default function EventRequirementsSection({ requirements }: { requirements: EventRequirements }) {
  const { items, venues, ruleSets } = requirements;
  const count = items.length + venues.length + ruleSets.reduce((n, set) => n + set.groups.reduce((m, g) => m + g.rules.length, 0), 0);
  return (
    <details className="event-rules">
      <summary>
        <span className="eyebrow">Requirements</span>
        <span className="event-rules-hint">
          {count} to read before you RSVP{ruleSets.length ? `, including ${ruleSets.map((set) => set.title).join(" and ")}` : ""}
        </span>
      </summary>
      {items.length > 0 && (
        <div className="event-rules-group">
          <h3>For This Ride</h3>
          <ul>
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {venues.map((venue) => (
        <div key={venue.name} className="event-rules-group event-rules-venue">
          <h3>{venue.name}</h3>
          {venue.riderNotes.length > 0 && (
            <ul>
              {venue.riderNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
          {(venue.waiverUrl || venue.passUrl || venue.rulesUrl) && (
            <p className="event-rules-links">
              {venue.waiverUrl && (
                <a className="btn btn-outline btn-sm" href={venue.waiverUrl} target="_blank" rel="noopener">
                  Sign Their Waiver &rarr;
                </a>
              )}
              {venue.passUrl && (
                <a className="btn btn-outline btn-sm" href={venue.passUrl} target="_blank" rel="noopener">
                  Get Your Pass &rarr;
                </a>
              )}
              {venue.rulesUrl && (
                <a href={venue.rulesUrl} target="_blank" rel="noopener">
                  Park Rules &rarr;
                </a>
              )}
            </p>
          )}
        </div>
      ))}
      {ruleSets.map((rules) => (
        <div key={rules.version} className="event-rules-set">
          <h3>{rules.title}</h3>
          <p>{rules.intro}</p>
          {rules.groups.map((group) => (
            <div key={group.heading} className="event-rules-group">
              <h4>
                {group.heading} <span>({group.cite})</span>
              </h4>
              <ul>
                {group.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
          ))}
          {rules.link && (
            <p className="event-rules-link">
              <a href={rules.link.url} target="_blank" rel="noopener">
                {rules.link.label} &rarr;
              </a>
            </p>
          )}
        </div>
      ))}
    </details>
  );
}
