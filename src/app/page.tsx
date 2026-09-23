import Link from "next/link";
import { loadToday } from "@/lib/today";
import { OS } from "@/lib/osData";
import { dayMonth } from "@/lib/date";
import StatBox, { Spark } from "@/components/today/StatBox";
import OutcomeCard, { DraftEodButton } from "@/components/today/OutcomeCard";
import ThreeChecklist from "@/components/today/ThreeChecklist";
import BlockChart from "@/components/today/BlockChart";
import StreamsBar from "@/components/today/StreamsBar";
import Checklist from "@/components/os/Checklist";
import ThemeToggle from "@/components/layout/ThemeToggle";
import HabitStreaks from "@/components/today/HabitStreaks";
import DeepWorkTimer from "@/components/today/DeepWorkTimer";
import QuickLog from "@/components/today/QuickLog";
import YesterdayRecap from "@/components/today/YesterdayRecap";
import FitnessPanel from "@/components/today/FitnessPanel";
import TaskList from "@/components/tasks/TaskList";
import CoachBriefModal from "@/components/modals/CoachBriefModal";
import ImportResponseModal from "@/components/modals/ImportResponseModal";

export const dynamic = "force-dynamic";

const last = <T,>(a: T[]) => a[a.length - 1];
const fmtShort = dayMonth;

export default async function TodayPage() {
  const t = await loadToday();
  const n = t.numbers;
  const cfg = OS.numbers;

  // "Wed 23 Sep 2026 · 18:10 IST" (built by hand: en-GB writes "Sept")
  const nowIST = new Date(Date.now() + 5.5 * 3600000);
  const dateline = `${nowIST.toUTCString().slice(0, 3)} ${nowIST.getUTCDate()} ${nowIST.toUTCString().slice(8, 11)} ${nowIST.getUTCFullYear()} · ${nowIST.toISOString().slice(11, 16)} IST`;

  const until = t.mode === "skeleton" ? `Until ${fmtShort(OS.skeletonEnds)}` : t.mode === "block" ? `Until ${fmtShort(OS.raceDay)}` : "After TMM";

  const reliance = last(n.reliance);
  const demos = last(n.demos);
  const demosPrev = n.demos.length > 1 ? n.demos[n.demos.length - 2].value : null;
  const ferritin = last(n.ferritin);
  const weekNow = last(n.week.km);
  const toGo = n.week.target ? Math.round((n.week.target - weekNow) * 10) / 10 : null;

  const vlog = t.todayLog ?? t.yesterdayLog;
  const vitals = vlog ? [
    { label: "RHR", value: vlog.rhrBpm, unit: "bpm" },
    { label: "HRV", value: vlog.hrvMs, unit: "ms" },
    { label: "VO₂ max", value: vlog.vo2MaxMlKgMin, unit: "ml/kg" },
    { label: "Weight", value: vlog.weightKg, unit: "kg" },
  ].filter(v => v.value != null) : [];
  const latestRun = t.strava[0];

  return (
    <div className="main">

      {/* ── Topbar ── */}
      <div className="topbar">
        <div className="left">
          <span className="pill accent"><i className="dot" /> {t.modeCfg.label}</span>
          <span className="meta">{dateline}</span>
        </div>
        <div className="right">
          <DraftEodButton />
          <ThemeToggle compact />
        </div>
      </div>

      <div className="modebar">
        <span className="eyebrow" style={{ color: "var(--accent)", whiteSpace: "nowrap" }}>{until}</span>
        <span className="hint">{t.modeCfg.rules}</span>
      </div>

      {/* ── Five numbers ── */}
      <section className="stats" aria-label="Five numbers">
        <StatBox
          eyebrow="Separation" value={n.separation.done} unit={`/${n.separation.total}`}
          visual={<div className="segs">{n.separation.statuses.map((s, i) => <i key={i} className={s === "done" ? "done" : s === "prog" ? "prog" : ""} />)}</div>}
          note="→ cutover" delta={`${n.separation.prog} in prog`}
        />
        <StatBox
          eyebrow={cfg.reliance.label} value={reliance?.value ?? "—"} unit={cfg.reliance.unit}
          visual={<Spark values={n.reliance.map(p => p.value)} />}
          note={`from ${cfg.reliance.baseline} · ${cfg.reliance.note}`}
          delta={reliance ? `×${(reliance.value / cfg.reliance.baseline).toFixed(1)}` : "—"}
          tone={reliance && reliance.value > cfg.reliance.baseline ? "up" : "flat"}
        />
        <StatBox
          eyebrow={cfg.demos.label} value={demos?.value ?? "—"} unit={cfg.demos.unit}
          visual={<Spark values={n.demos.map(p => p.value)} target={cfg.demos.target} area={false} />}
          note={cfg.demos.note}
          delta={demos && demosPrev != null && demos.value !== demosPrev ? `${demos.value > demosPrev ? "+" : ""}${demos.value - demosPrev}` : "—"}
          tone={demos && demosPrev != null ? (demos.value > demosPrev ? "up" : demos.value < demosPrev ? "down" : "flat") : "flat"}
        />
        <StatBox
          eyebrow="Week km" value={Math.round(weekNow)} unit={n.week.target ? `/ ${n.week.target}` : "km"}
          visual={<Spark values={n.week.km} target={n.week.target} />}
          note={n.week.label}
          delta={toGo == null ? "—" : toGo <= 0 ? "✓ hit" : `${toGo} to go`}
          tone={toGo != null && toGo <= 0 ? "up" : "flat"}
        />
        <StatBox
          eyebrow={cfg.ferritin.label} value={ferritin?.value ?? "—"} unit={cfg.ferritin.unit}
          visual={n.ferritin.length > 1 ? <Spark values={n.ferritin.map(p => p.value)} /> : <div className="bar"><i style={{ width: 0 }} /></div>}
          note={n.panelDays != null && n.panelDays >= 0 ? `Nov panel · ${n.panelDays}d` : "panel done"}
          delta={ferritin ? fmtShort(ferritin.date) : cfg.ferritin.note}
        />
      </section>

      <div className="grid g-32" style={{ marginTop: "var(--s3)" }}>
        {/* Left column */}
        <div className="stack">
          <OutcomeCard eod={t.eod} />
          <ThreeChecklist
            key={t.three.text}
            lines={t.three.lines} initialDone={t.three.done} listKey={t.three.listKey}
            written={t.three.written} text={t.three.text}
          />
          <BlockChart index={t.block.index} daysToStart={t.block.daysToStart} />
        </div>

        {/* Right column */}
        <div className="stack">
          <section className="card">
            <div className="card-h"><span className="eyebrow">Next</span><Link className="meta" href="/os">all {t.countdownTotal} →</Link></div>
            {t.countdowns.map(c => {
              const tone = c.days == null || c.days <= 3 ? "now" : c.days <= 14 ? "soon" : "later";
              return (
                <div key={c.id} className={`cd ${tone}`}>
                  <span className="d">{c.days == null ? "—" : c.days}</span>
                  <span>{c.label}{c.days == null && c.when && <span className="when" style={{ display: "block" }}>{c.when}</span>}</span>
                  <span className="when">{c.days == null ? "" : c.when}</span>
                </div>
              );
            })}
          </section>

          <section className="card">
            <div className="card-h"><span className="eyebrow">ElevenLabs</span><span className="pill info">partnership</span></div>
            <ul className="tl">
              {OS.elevenlabs.slice(0, 4).map(e => (
                <li key={e.label} className={e.status === "done" ? "done" : e.status === "next" ? "next" : undefined}>
                  {e.label}<small>{e.when}</small>
                </li>
              ))}
            </ul>
          </section>

          <StreamsBar streams={t.streams} days={t.streamDays} />

          <section className="card">
            <div className="card-h"><span className="eyebrow">Open · due soon</span><span className="meta">{t.open.items.length} of {t.open.left}</span></div>
            {t.open.items.length === 0
              ? <div className="meta">All {t.open.total} open items ticked.</div>
              : <Checklist listKey="open" items={t.open.items} initialDone={{}} hideCount />}
          </section>
        </div>
      </div>

      {/* ── Everything else ── */}
      <div className="below">
        <div className="card-h">
          <span className="eyebrow">Everything else</span>
          <span style={{ display: "flex", gap: "var(--s2)" }}><CoachBriefModal /><ImportResponseModal /></span>
        </div>

        <div className="grid g-32">
          <div className="stack" style={{ minWidth: 0 }}>
            <HabitStreaks logs={t.habitLogs} today={t.osDay} />
            <FitnessPanel
              todaySession={t.todayHMSession}
              recentActivities={t.strava.slice(0, 8).map(a => ({
                id: a.id, name: a.name, type: a.type, date: a.date,
                distanceM: a.distanceM, movingTimeSec: a.movingTimeSec,
                avgHeartRate: a.avgHeartRate, avgSpeedMps: a.avgSpeedMps,
                totalElevationM: a.totalElevationM,
              }))}
              weekBuckets={t.weekBuckets}
              currentWeekKm={t.weekBuckets[3]?.km ?? 0}
              currentWeekTargetKm={t.weekHMStats.targetKm}
              weekNum={t.weekHMStats.weekNum}
              raceCountdown={t.raceCountdown}
              inlineMode
            />
          </div>

          <div className="stack">
            {t.todayHMSession && (
              <section className="card">
                <div className="card-h"><span className="eyebrow">Training · wk {t.todayHMSession.weekNum}</span>
                  {t.todayHMSession.logStatus ? <span className="pill ok">{t.todayHMSession.logStatus}</span> : <Link className="btn sm" href="/log">Log it</Link>}
                </div>
                <div className="h3">{t.todayHMSession.name}</div>
                <div className="meta">
                  {[t.todayHMSession.targetMin && `~${t.todayHMSession.targetMin} min`, t.todayHMSession.targetKm && `${t.todayHMSession.targetKm} km`].filter(Boolean).join(" · ")}
                </div>
              </section>
            )}

            {vitals.length > 0 && (
              <section className="card">
                <div className="card-h"><span className="eyebrow">{t.todayLog ? "Today" : "Yesterday"} · Apple Watch</span></div>
                <div className="grid g-2" style={{ gap: "var(--s2)" }}>
                  {vitals.map(v => (
                    <div key={v.label} className="card inset tight">
                      <div className="meta">{v.label}</div>
                      <div><span className="num" style={{ fontSize: 20, fontWeight: 600 }}>{v.value}</span> <span className="meta">{v.unit}</span></div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <YesterdayRecap log={vlog} label={t.todayLog ? "Today's vitals" : "Yesterday's vitals"} />

            <section className="card">
              <div className="card-h"><span className="eyebrow">Coach insights · 30 days</span></div>
              <p className="lead" style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>{t.patternInsights}</p>
            </section>

            <section className="card">
              <div className="card-h"><span className="eyebrow">Active work · Asana</span><Link className="meta" href="/work">All tasks →</Link></div>
              {t.wipTasks.length === 0 ? (
                <div className="meta">No WIP tasks assigned to you right now.</div>
              ) : (
                t.wipTasks.map(task => (
                  <a key={task.asanaGid} className="row" href={task.permalink ?? `https://app.asana.com/0/${task.asanaGid}`} target="_blank" rel="noopener noreferrer">
                    <span className="l" style={{ overflow: "hidden" }}>
                      <span style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{task.name}</span>
                      <small>{task.project?.name ?? "—"}{task.dueOn && <span style={{ color: new Date(task.dueOn) < new Date() ? "var(--act)" : undefined }}> · due {task.dueOn}</span>}</small>
                    </span>
                  </a>
                ))
              )}
            </section>

            <section className="card">
              <div className="card-h"><span className="eyebrow">Today&rsquo;s tasks</span></div>
              <TaskList initialTasks={t.todayTasks as any} isToday={true} defaultSection="today" />
            </section>

            <QuickLog />
            <DeepWorkTimer />

            {latestRun && (
              <section className="card">
                <div className="card-h"><span className="eyebrow">Latest Strava</span><span className="pill">{latestRun.type}</span></div>
                <div className="h3">{latestRun.name}</div>
                <div className="meta">
                  {latestRun.date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).replace(",", "")}
                  {latestRun.distanceM ? ` · ${(latestRun.distanceM / 1000).toFixed(1)} km` : ""}
                  {latestRun.movingTimeSec ? ` · ${Math.floor(latestRun.movingTimeSec / 60)} min` : ""}
                  {latestRun.avgHeartRate ? ` · ${latestRun.avgHeartRate} bpm` : ""}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
