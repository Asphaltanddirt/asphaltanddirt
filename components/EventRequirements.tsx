import type { EventRequirements } from "@/lib/vehicleRules";

/** The event page's Requirements, closed until tapped: the event's own items
 *  first, then the standard set for each Venue Type. The RSVP form's checkbox agrees to all of it. */
export default function EventRequirementsSection({ requirements }: { requirements: EventRequirements }) {
  const { items, ruleSets } = requirements;
  const count = items.length + ruleSets.reduce((n, set) => n + set.groups.reduce((m, g) => m + g.rules.length, 0), 0);
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
