"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Plan, PlanDay, PlanItem } from "@/lib/garagePlan";

/**
 * The Planning Calendar (lib/garagePlan.ts has the why).
 *
 * MON–SUN across the top. Orange OUTLINE = today, the day you're in; SOLID
 * orange = you have something due that day (Jose 9/25). Everyone opens on
 * today. Monday is the planning view (Tue → Mon plus the look-ahead); any
 * other day shows only what's due on it.
 */
export default function GaragePlan({ plan, me }: { plan: Plan; me: string }) {
  const todayIndex = Math.max(0, plan.days.findIndex((d) => d.isToday));
  // Two weeks of buttons, one at a time: this week, and next week (whose
  // Monday is the plan you'll actually sit down with).
  const [page, setPage] = useState(todayIndex >= 7 ? 1 : 0);
  const [sel, setSel] = useState(todayIndex);
  const week = plan.days.slice(page * 7, page * 7 + 7);

  const mine = (i: PlanItem) => i.owner === me || i.owner === "everyone";
  const open = (i: PlanItem) => !i.done && i.need !== "missed";
  const mineOpen = (d: PlanDay) => d.items.filter((i) => mine(i) && open(i));

  const day = plan.days[sel];

  return (
    <div className="garage-plan">
      <div className="garage-plan-strip" role="group" aria-label="This week">
        {week.map((d, j) => {
          const i = page * 7 + j;
          const due = !d.isPast || d.isToday ? mineOpen(d).length : 0;
          const cls = ["garage-plan-day", due ? "has-mine" : "", d.isToday ? "is-today" : "", i === sel ? "is-selected" : ""]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={d.date}
              type="button"
              className={cls}
              aria-pressed={i === sel}
              aria-label={`${d.label} ${d.dayOfMonth}${d.isToday ? ", today" : ""}${due ? `, ${due} for you` : ""}`}
              onClick={() => setSel(i)}
            >
              <span>{d.label}</span>
              <b>{d.dayOfMonth}</b>
            </button>
          );
        })}
      </div>
      <div className="garage-plan-pager">
        {page === 0 ? (
          <button type="button" onClick={() => { setPage(1); setSel(7); }}>
            Next week ›
          </button>
        ) : (
          <button type="button" onClick={() => { setPage(0); setSel(todayIndex); }}>
            ‹ This week
          </button>
        )}
      </div>

      {day.label === "Mon" ? <Planning plan={plan} start={sel} mine={mine} open={open} /> : <DayView day={day} mine={mine} open={open} />}
    </div>
  );
}

type Is = (i: PlanItem) => boolean;

function Headline({ count, label, note }: { count: number; label: string; note: string }) {
  return (
    <div className="garage-plan-headline">
      <div className={count ? "garage-plan-big" : "garage-plan-big is-zero"}>
        {count}
        <small>{label}</small>
      </div>
      <p>{note}</p>
    </div>
  );
}

function ItemRow({ item, mine }: { item: PlanItem; mine: Is }) {
  const m = mine(item);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  /** Calendar v2: tick your own task off (or back on) right here. */
  async function tick(done: boolean) {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/garage/task", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, done }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Couldn't save.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save.");
      setBusy(false);
    }
  }

  /** Calendar v2: "I've got it" turns a shared item into your own task. */
  async function claim() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/garage/plan/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ side: item.side }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Couldn't claim it.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't claim it.");
      setBusy(false);
    }
  }

  const canTick = item.kind === "task" && m;
  return (
    <li className={item.done ? "is-done" : ""}>
      {canTick && (
        <input
          type="checkbox"
          className="garage-plan-tick"
          checked={item.done}
          disabled={busy}
          onChange={(e) => tick(e.target.checked)}
          aria-label={item.done ? `Mark "${item.title}" not done` : `Mark "${item.title}" done`}
        />
      )}
      <div className="garage-plan-item-text">
        {m && !item.done ? <strong>{item.title}</strong> : item.title}
        {item.sub && <span className="garage-plan-sub">{item.sub}</span>}
        {err && <span className="garage-plan-sub" role="alert">{err}</span>}
      </div>
      {item.done ? (
        <span className="garage-plan-fix">✓ done</span>
      ) : item.kind === "footage" && item.side ? (
        <button type="button" className="garage-plan-fix is-mine garage-plan-claim" onClick={claim} disabled={busy}>
          {busy ? "…" : "I've got it"}
        </button>
      ) : m ? (
        <Link href={item.href} className="garage-plan-fix is-mine">
          {item.need === "missed" ? "Missed" : item.fix} →
        </Link>
      ) : (
        <Link href={item.href} className="garage-plan-fix">
          {item.need === "missed" ? `Missed · ${item.ownerName}` : item.ownerName}
        </Link>
      )}
    </li>
  );
}

function Chips({ items, mine }: { items: PlanItem[]; mine: Is }) {
  return (
    <div className="garage-plan-chips">
      {items.map((i) => (
        <Link
          key={i.id}
          href={i.href}
          className={["garage-plan-chip", i.done ? "is-done" : mine(i) ? "is-mine" : ""].filter(Boolean).join(" ")}
        >
          {i.title}
          {!i.done && !mine(i) && <em> · {i.ownerName}</em>}
        </Link>
      ))}
    </div>
  );
}

function postingLine(d: PlanDay) {
  if (!d.autoTotal) return "Nothing posts on its own";
  return `${d.autoReady} of ${d.autoTotal} posting on their own`;
}

/** Monday: plan Tuesday → next Monday, and look six days further. */
function Planning({ plan, start, mine, open }: { plan: Plan; start: number; mine: Is; open: Is }) {
  const monday = plan.days[start];
  const week = plan.days.slice(start + 1, start + 8);
  const ahead = plan.days.slice(start + 8, start + 14);
  const all = [monday, ...week];
  const mineCount = all.flatMap((d) => d.items).filter((i) => mine(i) && open(i)).length;
  const openCount = all.flatMap((d) => d.items).filter(open).length;
  const ready = week.reduce((n, d) => n + d.autoReady, 0);
  const total = week.reduce((n, d) => n + d.autoTotal, 0);
  const aheadRows = ahead.filter((d) => d.events.length || d.items.some(open));

  return (
    <>
      <Headline
        count={mineCount}
        label="for you this week"
        note={`${openCount} open in total · ${ready} of ${total} auto posts ready · ${week[0].label} ${week[0].dayOfMonth} → ${week[6].label} ${week[6].dayOfMonth}`}
      />

      <div className="garage-plan-zone">
        <div className="garage-plan-label">
          <span>{monday.isToday ? "Today" : `${monday.label} ${monday.dayOfMonth}`}</span>
        </div>
        <div className="garage-plan-line">
          <span>
            <strong>{postingLine(monday)}</strong>
          </span>
          <span className="garage-plan-ok">{monday.autoReady === monday.autoTotal ? "✓ ready" : ""}</span>
        </div>
      </div>

      {monday.items.length > 0 && (
        <div className="garage-plan-zone">
          <div className="garage-plan-label">
            <span>Monday prep</span>
            <span>
              {monday.items.filter((i) => i.done).length} of {monday.items.length}
            </span>
          </div>
          <Chips items={monday.items} mine={mine} />
        </div>
      )}

      <div className="garage-plan-zone">
        <div className="garage-plan-label">
          <span>This week · planning</span>
          <span>Tue → Mon</span>
        </div>
        <div className="garage-plan-rows">
          {week.map((d) => (
            <DayRow key={d.date} day={d} mine={mine} open={open} />
          ))}
        </div>
      </div>

      <div className="garage-plan-zone">
        <div className="garage-plan-label">
          <span>Look-ahead · needs lead time</span>
          <span>
            {ahead[0].label} {ahead[0].dayOfMonth} → {ahead[5].label} {ahead[5].dayOfMonth}
          </span>
        </div>
        <p className="garage-plan-quiet">
          Footage in the Library:{" "}
          {plan.footage.map((f, i) => (
            <span key={f.side}>
              {i > 0 && " · "}
              {f.side} {f.unused} unused (~{f.weeks} wk{f.weeks === 1 ? "" : "s"})
            </span>
          ))}
        </p>
        {aheadRows.length ? (
          <div className="garage-plan-rows">
            {aheadRows.map((d) => (
              <DayRow key={d.date} day={d} mine={mine} open={open} />
            ))}
          </div>
        ) : (
          <p className="garage-plan-quiet">Nothing needs lead time yet.</p>
        )}
      </div>
    </>
  );
}

/** One line per day: a count when it's ready, the gaps when it isn't. */
function DayRow({ day, mine, open }: { day: PlanDay; mine: Is; open: Is }) {
  const gaps = day.items.filter(open);
  const date = (
    <span className="garage-plan-date">
      {day.label}
      <b>{day.dayOfMonth}</b>
    </span>
  );
  const events = day.events.map((e) => e.title).join(" · ");
  if (!gaps.length) {
    return (
      <div className="garage-plan-row is-ready">
        {date}
        <span className="garage-plan-what">
          {events && <span className="garage-plan-event">{events}</span>}
          {day.autoTotal ? `${day.autoTotal} posts` : events ? "" : "Nothing planned"}
        </span>
        <span className="garage-plan-ok">✓ ready</span>
      </div>
    );
  }
  const myGaps = gaps.filter(mine);
  const others = [...new Set(gaps.filter((g) => !mine(g)).map((g) => g.ownerName))];
  return (
    <details className={myGaps.length ? "garage-plan-row is-mine" : "garage-plan-row"}>
      <summary>
        {date}
        <span className="garage-plan-what">
          {events && <span className="garage-plan-event">{events}</span>}
          {gaps.map((g, i) => (
            <span key={g.id}>
              {i > 0 && " · "}
              {mine(g) ? <strong>{g.title}</strong> : g.title}
            </span>
          ))}
        </span>
        {myGaps.length ? (
          <span className="garage-plan-pill is-mine">{myGaps.length} for you</span>
        ) : (
          <span className="garage-plan-pill">
            {gaps.length} · {others.join(", ")}
          </span>
        )}
      </summary>
      <ul className="garage-plan-items">
        {gaps.map((g) => (
          <ItemRow key={g.id} item={g} mine={mine} />
        ))}
      </ul>
    </details>
  );
}

/** Any day but Monday: what posts on its own, and what's due on it. */
function DayView({ day, mine, open }: { day: PlanDay; mine: Is; open: Is }) {
  const due = day.items.filter((i) => !i.done);
  const done = day.items.filter((i) => i.done);
  const mineCount = due.filter((i) => mine(i) && open(i)).length;
  return (
    <>
      <Headline
        count={mineCount}
        label={`for you ${day.isToday ? "today" : `on ${day.label}`}`}
        note={day.events.length ? day.events.map((e) => e.title).join(" · ") : `${day.label} ${day.dayOfMonth}`}
      />

      <div className="garage-plan-zone">
        <div className="garage-plan-label">
          <span>Posting</span>
        </div>
        <div className="garage-plan-line">
          <span>
            <strong>{postingLine(day)}</strong>
          </span>
          <span className="garage-plan-ok">{day.autoTotal && day.autoReady === day.autoTotal ? "✓ ready" : ""}</span>
        </div>
      </div>

      {day.events.length > 0 && (
        <div className="garage-plan-zone">
          <div className="garage-plan-label">
            <span>Events</span>
          </div>
          <div className="garage-plan-chips">
            {day.events.map((e) => (
              <Link key={e.href} href={e.href} className="garage-plan-chip">
                {e.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="garage-plan-zone">
        <div className="garage-plan-label">
          <span>{day.isPast && !day.isToday ? "Still open" : "Due"}</span>
          <span>{done.length ? `${done.length} done` : ""}</span>
        </div>
        {due.length || done.length ? (
          <ul className="garage-plan-items is-boxed">
            {[...due, ...done].map((i) => (
              <ItemRow key={i.id} item={i} mine={mine} />
            ))}
          </ul>
        ) : (
          <p className="garage-plan-quiet">Nothing needs anyone this day.</p>
        )}
        {day.unmarked > 0 && (
          <p className="garage-plan-quiet mt-2">
            {day.unmarked} by-hand post{day.unmarked === 1 ? "" : "s"} never marked posted (fine if you posted from the app).{" "}
            <Link href="/garage/social?all=1">Open the board</Link>
          </p>
        )}
      </div>
    </>
  );
}
