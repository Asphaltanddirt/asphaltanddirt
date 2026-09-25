"use client";

import { useState } from "react";
import type { AudienceLine, Compare, Numbers } from "@/lib/garageNumbers";

/**
 * Garage → Numbers. Every figure sits next to the one before it; the arrow is
 * the point. Trend lines are tiny on purpose: they answer "which way", not
 * "how much", which the number beside them already does.
 */

const fmt = (n: number, unit?: Compare["unit"]) =>
  unit === "$" ? `$${Math.round(n).toLocaleString()}` : `${Math.round(n).toLocaleString()}${unit === "min" ? " min" : ""}`;

function Change({ now, before, unit }: { now: number | null; before: number | null; unit?: Compare["unit"] }) {
  if (now === null || before === null) return <span className="garage-numbers-change is-flat">new</span>;
  const d = now - before;
  if (d === 0) return <span className="garage-numbers-change is-flat">no change</span>;
  const up = d > 0;
  return (
    <span className={`garage-numbers-change ${up ? "is-up" : "is-down"}`}>
      <span aria-hidden="true">{up ? "↑" : "↓"}</span>
      <span className="sr-only">{up ? "up" : "down"}</span> {fmt(Math.abs(d), unit)}
    </span>
  );
}

function Trend({ points }: { points: { value: number }[] }) {
  if (points.length < 2) return <span className="garage-numbers-trend" aria-hidden="true" />;
  const vs = points.map((p) => p.value);
  const lo = Math.min(...vs);
  const hi = Math.max(...vs);
  const w = 64;
  const h = 20;
  const d = vs
    .map((v, i) => `${i ? "L" : "M"}${((i / (vs.length - 1)) * w).toFixed(1)},${(hi === lo ? h / 2 : h - ((v - lo) / (hi - lo)) * h).toFixed(1)}`)
    .join(" ");
  return (
    <svg className="garage-numbers-trend" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AudienceRow({ line, unit }: { line: AudienceLine; unit?: Compare["unit"] }) {
  return (
    <li className="garage-numbers-row">
      <span className="garage-numbers-name">
        {line.platform}
        <small>{line.metric.toLowerCase()}</small>
      </span>
      <Trend points={line.trend} />
      <span className="garage-numbers-value">{line.now ? fmt(line.now.value, unit) : "—"}</span>
      <Change now={line.now?.value ?? null} before={line.before?.value ?? null} unit={unit} />
    </li>
  );
}

function CompareRows({ rows }: { rows: Compare[] }) {
  return (
    <ul className="garage-numbers-list">
      {rows.map((r) => (
        <li key={r.label} className="garage-numbers-row is-plain">
          <span className="garage-numbers-name">{r.label}</span>
          <span className="garage-numbers-value">{r.now === null ? "—" : fmt(r.now, r.unit)}</span>
          <Change now={r.now} before={r.before} unit={r.unit} />
        </li>
      ))}
    </ul>
  );
}

type Period = "week" | "month";

/** The paste-anywhere summary (the "period reports" half of #9). */
function report(n: Numbers, period: Period): string {
  const change = (now: number | null, before: number | null, unit?: Compare["unit"]) =>
    now === null ? "no data" : before === null ? fmt(now, unit) : `${fmt(now, unit)} (${now - before >= 0 ? "+" : "−"}${fmt(Math.abs(now - before), unit)})`;
  const lines = [`A&D numbers, ${period === "week" ? "last 7 days" : "last 28 days"} (as of ${n.today})`, ""];
  lines.push("Audience");
  // Audience "before": last week's reading, or the one about 4 weeks back.
  const back = (a: AudienceLine) => {
    if (period === "week" || !a.now) return a.before?.value ?? null;
    const cutoff = new Date(Date.parse(`${a.now.date}T12:00:00Z`) - 26 * 86_400_000).toISOString().slice(0, 10);
    return [...a.trend].reverse().find((p) => p.date <= cutoff)?.value ?? null;
  };
  for (const a of n.audience) lines.push(`- ${a.platform} ${a.metric.toLowerCase()}: ${change(a.now?.value ?? null, back(a))}`);
  const yt = period === "week" ? n.youtube.week : n.youtube.month;
  lines.push("", `YouTube${n.youtube.asOf ? ` (through ${n.youtube.asOf})` : ""}`);
  for (const r of yt) lines.push(`- ${r.label}: ${change(r.now, r.before, r.unit)}`);
  const st = period === "week" ? n.site.week : n.site.month;
  lines.push("", `Website${n.site.asOf ? ` (through ${n.site.asOf})` : ""}`);
  for (const r of st) lines.push(`- ${r.label}: ${change(r.now, r.before, r.unit)}`);
  if (n.merch.length) {
    lines.push("", "Merch (store to date)");
    for (const m of n.merch) lines.push(`- ${m.metric}: ${change(m.now?.value ?? null, back(m), m.metric === "Revenue" ? "$" : undefined)}`);
  }
  if (n.posts.best.length) {
    lines.push("", "Best posts");
    for (const p of n.posts.best) lines.push(`- ${p.platform}: ${p.title} — ${p.views.toLocaleString()} views (${p.why})`);
  }
  return lines.join("\n");
}

export default function GarageNumbers({ numbers: n }: { numbers: Numbers }) {
  const [copied, setCopied] = useState<Period | null>(null);

  async function copy(period: Period) {
    try {
      await navigator.clipboard.writeText(report(n, period));
      setCopied(period);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="garage-numbers">
      <section aria-labelledby="numbers-audience">
        <h2 id="numbers-audience" className="garage-section">Audience</h2>
        <p className="garage-form-note">Change since the last weekly reading. TikTok, X and the FB Group come from Weekly Socials.</p>
        {n.audience.length ? (
          <ul className="garage-numbers-list">
            {n.audience.map((a) => (
              <AudienceRow key={`${a.platform}-${a.metric}`} line={a} />
            ))}
          </ul>
        ) : (
          <p className="garage-empty">No readings yet. The Monday cron writes the first ones.</p>
        )}
      </section>

      <section aria-labelledby="numbers-youtube">
        <h2 id="numbers-youtube" className="garage-section">YouTube</h2>
        <p className="garage-form-note">
          Last 7 days vs the 7 before{n.youtube.asOf ? `, through ${n.youtube.asOf}` : ""}. YouTube runs about 3 days behind.
        </p>
        <CompareRows rows={n.youtube.week} />
        {n.youtube.formats.length > 0 ? (
          <>
            <p className="garage-numbers-sub">Shorts vs long-form</p>
            <CompareRows rows={n.youtube.formats} />
          </>
        ) : (
          <p className="garage-form-note">Shorts vs long-form starts with Monday&apos;s snapshot.</p>
        )}
      </section>

      <section aria-labelledby="numbers-posts">
        <h2 id="numbers-posts" className="garage-section">Posts</h2>
        <p className="garage-form-note">
          The last 5 weeks, ranked on views after 7 days ({n.posts.counted} post{n.posts.counted === 1 ? "" : "s"} with numbers so far).
        </p>
        {n.posts.best.length ? (
          <ol className="garage-numbers-posts">
            {n.posts.best.map((p) => (
              <li key={p.id}>
                <a href={`/garage/social?card=${p.id}`}>
                  <strong>{p.views.toLocaleString()}</strong> {p.platform} · {p.title}
                </a>
                <span>{p.why}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="garage-empty">No 7-day numbers yet.</p>
        )}
        {n.posts.weakest && (
          <p className="garage-numbers-weak">
            Weakest: <strong>{n.posts.weakest.views.toLocaleString()}</strong> {n.posts.weakest.platform} · {n.posts.weakest.title}
            <span>{n.posts.weakest.why}</span>
          </p>
        )}
      </section>

      <section aria-labelledby="numbers-site">
        <h2 id="numbers-site" className="garage-section">Site and merch</h2>
        <CompareRows rows={n.site.week} />
        {n.site.sources.length > 0 && (
          <p className="garage-form-note">
            Where visitors came from: {n.site.sources.map((s) => `${s.name} ${s.visitors}`).join(" · ")}
          </p>
        )}
        {n.merch.length > 0 && (
          <ul className="garage-numbers-list">
            {n.merch.map((m) => (
              <AudienceRow key={m.metric} line={m} unit={m.metric === "Revenue" ? "$" : undefined} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="numbers-tests">
        <h2 id="numbers-tests" className="garage-section">Tests</h2>
        {n.tests.map((t) => (
          <div key={t.name} className="garage-numbers-test">
            <p className="garage-numbers-sub">{t.name}</p>
            {t.arms.length && t.arms.some((a) => a.posts > 0) ? (
              <ul className="garage-numbers-list">
                {t.arms.map((a) => (
                  <li key={a.label} className="garage-numbers-row is-plain">
                    <span className="garage-numbers-name">
                      {a.label}
                      <small>
                        {a.posts} post{a.posts === 1 ? "" : "s"}
                      </small>
                    </span>
                    <span className="garage-numbers-value">{a.average === null ? "—" : a.average.toLocaleString()}</span>
                    <span className="garage-numbers-change is-flat">{t.metric}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="garage-form-note">No results yet.</p>
            )}
          </div>
        ))}
        <p className="garage-form-note">Too few posts to call either test yet. Read them at the dates on the calendar.</p>
      </section>

      <section aria-labelledby="numbers-report">
        <h2 id="numbers-report" className="garage-section">Report</h2>
        <p className="garage-form-note">Copies a plain-text summary to paste anywhere.</p>
        <div className="card-actions">
          <button type="button" className="btn btn-primary" onClick={() => copy("week")}>
            {copied === "week" ? "Copied" : "Copy this week"}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => copy("month")}>
            {copied === "month" ? "Copied" : "Copy last 28 days"}
          </button>
        </div>
        <p className="sr-only" aria-live="polite">
          {copied ? "Report copied." : ""}
        </p>
      </section>
    </div>
  );
}
