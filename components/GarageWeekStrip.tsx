import Link from "next/link";
import type { PostingWeek } from "@/lib/garageWeek";

/**
 * The posting week at a glance.
 *
 * Reads as "what's still on me", not "what was planned". Done work greys out
 * and gets a tick; the automatic posts are a count, never a list — listing
 * them is what made the printed content calendar unreadable.
 */
export default function GarageWeekStrip({ week }: { week: PostingWeek }) {
  const { days, leftByHand, missed } = week;

  return (
    <div className="garage-week">
      <p className="garage-week-top">
        {leftByHand > 0 ? (
          <strong>
            {leftByHand} to post by hand{missed > 0 && ", "}
          </strong>
        ) : (
          <strong>Nothing left by hand this week.</strong>
        )}
        {missed > 0 && <span className="garage-week-missed">{missed} missed</span>}
      </p>

      <ol className="garage-week-days">
        {days.map((day) => {
          const open = day.byHand.filter((b) => !b.done).length;
          const quiet = day.byHand.length === 0 && day.auto.total === 0;
          return (
            <li
              key={day.date}
              className={[
                "garage-week-day",
                day.isToday ? "is-today" : "",
                day.isPast ? "is-past" : "",
                open > 0 && !day.isPast ? "has-open" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="garage-week-date">
                <span className="garage-week-dow">{day.label}</span>
                <span className="garage-week-dom">{day.dayOfMonth}</span>
              </span>

              <span className="garage-week-items">
                {day.byHand.map((item) => (
                  <span key={item.id} className={item.done ? "garage-week-item is-done" : "garage-week-item"}>
                    {item.done && <span aria-hidden="true">✓ </span>}
                    <strong>{item.platform}</strong>
                    {item.time && <> · {item.time}</>}
                    {item.what && <span className="garage-week-what"> {item.what}</span>}
                  </span>
                ))}

                {day.auto.total > 0 && (
                  <span className={day.auto.failed > 0 ? "garage-week-auto has-failed" : "garage-week-auto"}>
                    {day.auto.failed > 0
                      ? `${day.auto.failed} didn't post`
                      : day.auto.done === day.auto.total
                        ? `${day.auto.total} posted automatically`
                        : day.auto.done > 0 || day.isPast
                          ? // A day where some went and some didn't used to read
                            // "4 automatic", identical to a day that hasn't
                            // happened. Say what actually happened.
                            `${day.auto.done} of ${day.auto.total} posted`
                          : `${day.auto.total} automatic`}
                  </span>
                )}

                {quiet && <span className="garage-week-auto">—</span>}
              </span>
            </li>
          );
        })}
      </ol>

      <Link href="/garage/social" className="garage-week-link">
        Open the posting board →
      </Link>
    </div>
  );
}
