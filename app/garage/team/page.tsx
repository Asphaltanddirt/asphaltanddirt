import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import GarageBack from "@/components/GarageBack";
import { canSeeOwnerOnly, getSession, listGarageUsers } from "@/lib/garageAuth";
import { getWeekTasks, todayNY } from "@/lib/garageTasks";
import { listRecords, isAirtableConfigured } from "@/lib/airtable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Team · A and D Garage",
  robots: { index: false, follow: false },
};

/** Counts for the review queue — what's sitting there waiting on Jose or
 *  Anthony. Each one links to its Garage screen. */
async function queueCounts() {
  const crewBase = process.env.AIRTABLE_BASE_ID;
  const buildsBase = process.env.AIRTABLE_BUILD_SUBMISSIONS_BASE_ID;
  const reviewsBase = process.env.AIRTABLE_TESTIMONIALS_BASE_ID;
  const count = async (base: string | undefined, table: string, formula: string) => {
    if (!isAirtableConfigured(base)) return null;
    try {
      return (await listRecords(table, formula, { baseId: base })).length;
    } catch {
      return null;
    }
  };
  const [applications, builds, reviews] = await Promise.all([
    count(crewBase, "Applications", `OR({Review Decision} = BLANK(), {Review Decision} = 'Hold / Second Review', {Review Decision} = 'Exceptional Candidate / Crew Review')`),
    count(buildsBase, process.env.AIRTABLE_BUILD_SUBMISSIONS_TABLE || "Submissions", `AND(NOT({Approved}), NOT({Declined}))`),
    count(reviewsBase, "Testimonials", `AND(NOT({Approved}), NOT({Declined}))`),
  ]);
  return { applications, builds, reviews };
}

export default async function GarageTeamPage() {
  const session = await getSession();
  if (!session) redirect("/garage");
  if (!canSeeOwnerOnly(session)) redirect("/garage");

  const today = todayNY();
  const [people, tasks, queue] = await Promise.all([
    listGarageUsers().catch(() => []),
    getWeekTasks().catch(() => []),
    queueCounts(),
  ]);

  const byPerson = people.map((person) => ({
    person,
    tasks: tasks.filter((t) => t.assignee === person.email),
  }));

  const links = [
    { label: "Airtable", href: "https://airtable.com" },
    { label: "A&D Trail Runs (Drive)", href: "https://drive.google.com/drive/folders/0AKXjKBxcWmfuUk9PVA" },
    { label: "Vercel", href: "https://vercel.com/team-1121/asphaltanddirt" },
    { label: "Fourthwall", href: "https://fourthwall.com" },
    { label: "Resend", href: "https://resend.com/emails" },
    { label: "YouTube Studio", href: "https://studio.youtube.com" },
    { label: "Search Console", href: "https://search.google.com/search-console" },
  ];

  return (
    <div className="garage">
      <GarageBack title="Team" />
      <div className="garage-body">
        <section className="garage-panel">
          <h2>Waiting on you</h2>
          <p>
            <Link href="/garage/applications">
              {queue.applications ?? "–"} crew application{queue.applications === 1 ? "" : "s"} to review
            </Link>{" "}
            ·{" "}
            <Link href="/garage/review/builds">
              {queue.builds ?? "–"} build{queue.builds === 1 ? "" : "s"}
            </Link>{" "}
            ·{" "}
            <Link href="/garage/review/reviews">
              {queue.reviews ?? "–"} review{queue.reviews === 1 ? "" : "s"}
            </Link>
          </p>
          <p className="garage-form-note">
            All reviewed here in the Garage. <Link href="/garage/review/featured">Featured on the site</Link>
          </p>
        </section>

        <h2 className="garage-section">This week</h2>
        {byPerson.map(({ person, tasks: theirs }) => {
          const done = theirs.filter((t) => t.done).length;
          return (
            <div key={person.id} className="garage-panel">
              <h2>
                {person.name || person.email} · {person.role}
              </h2>
              {theirs.length === 0 ? (
                <p className="garage-empty">Nothing assigned this week.</p>
              ) : (
                <>
                  <p>
                    {done} of {theirs.length} done
                  </p>
                  <ul className="garage-tasks">
                    {theirs.map((task) => (
                      <li key={task.id} className={task.done ? "garage-task is-done" : "garage-task"}>
                        <Link href={`/garage/tasks/${task.id}`} className="garage-task-main">
                          <span className="garage-task-title">{task.title}</span>
                        </Link>
                        <span className={!task.done && task.due < today ? "garage-task-when late" : "garage-task-when"}>
                          {task.done ? "Done" : task.due < today ? "Overdue" : task.due === today ? "Today" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          );
        })}

        <h2 className="garage-section">Owners&apos; links</h2>
        <div className="garage-panel">
          <p className="garage-links garage-links-wrap">
            {links.map((link) => (
              <a key={link.label} href={link.href} target="_blank" rel="noopener">
                {link.label} ↗
              </a>
            ))}
          </p>
          <p className="garage-form-note">Keys and passwords stay in the Website APIs base, not here.</p>
        </div>
      </div>
    </div>
  );
}
