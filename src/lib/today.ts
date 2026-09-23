// Everything the Today page reads, in one place. Two date conventions meet here:
//   • DB rows: midnight IST as a UTC instant (todayUTC(), 18:30Z the day before)
//   • osLogic: midnight UTC of the IST date (istToday()), for day arithmetic on osData strings
import { db } from "./db";
import { getUserId, ASANA_OWNER_GID } from "./user";
import { todayIST, todayUTC, yesterdayUTC, daysAgoUTC, dayMonth, istDayLabel } from "./date";
import { getTodayHMSession, getCurrentWeekHMStats, getRaceCountdown } from "./hmTracker";
import { getPatternInsights } from "./patternInsights";
import { OS } from "./osData";
import { METRIC_KEYS, type MetricKey } from "./metrics";
import { EOD_STREAMS, type EodStream } from "./eod";
import { computeMode, currentBlockWeek, daysUntil, istToday } from "./osLogic";

const DAY = 86400000;

// IST calendar key (YYYY-MM-DD) for any stored instant
export function istKey(d: Date): string {
  return new Date(d.getTime() + 5.5 * 3600000).toISOString().slice(0, 10);
}

export function istTime(d: Date): string {
  return new Date(d.getTime() + 5.5 * 3600000).toISOString().slice(11, 16);
}

export type Pt = { date: string; value: number };

export interface CountdownRow { id: string; label: string; days: number | null; when: string; sub?: string }

export async function loadToday() {
  const userId = getUserId();
  const osDay = istToday();                 // for osData arithmetic
  const todayDB = todayUTC();               // for DB rows
  const dow = (osDay.getUTCDay() + 6) % 7;  // 0 = Monday
  const mondayDB = new Date(todayDB.getTime() - dow * DAY);
  const eightWeeksDB = new Date(mondayDB.getTime() - 7 * 7 * DAY);
  const threeKey = `three:${todayIST()}`;

  const [
    todayLog, yesterdayLog, last35Logs, todayTasks,
    last35TechLogs, last35FounderLogs, last35Reflections,
    strava8w, wipTasks, osThree, threeTicks, openTicks,
    latestEod, weekEods, metricRows,
    todayHMSession, weekHMStats, raceCountdown, patternInsights,
  ] = await Promise.all([
    db.dailyLog.findFirst({ where: { userId, date: todayDB } }),
    db.dailyLog.findFirst({ where: { userId, date: yesterdayUTC() } }),
    db.dailyLog.findMany({ where: { userId, date: { gte: daysAgoUTC(35) } }, orderBy: { date: "desc" } }),
    db.task.findMany({ where: { userId, isToday: true, status: { not: "cancelled" } }, orderBy: [{ priority: "asc" }, { createdAt: "asc" }] }),
    db.technicalLog.findMany({ where: { userId, date: { gte: daysAgoUTC(35) } } }),
    db.founderLog.findMany({ where: { userId, date: { gte: daysAgoUTC(35) } } }),
    db.reflection.findMany({ where: { userId, type: "daily", date: { gte: daysAgoUTC(35) } } }),
    db.stravaActivity.findMany({ where: { userId, date: { gte: eightWeeksDB } }, orderBy: { date: "desc" } }),
    db.asanaTask.findMany({
      where: {
        assigneeGid: ASANA_OWNER_GID,
        status: "incomplete",
        parentGid: null,
        sectionName: { in: ["WIP", "Work in Progress", "In Progress", "Prioritized", "Exploring", "Planning/Scoping"] },
      },
      orderBy: { syncedAt: "desc" },
      take: 5,
      select: { asanaGid: true, name: true, sectionName: true, dueOn: true, permalink: true, project: { select: { name: true } } },
    }),
    db.osNote.findUnique({ where: { key: "three" } }),
    db.osChecklistItem.findMany({ where: { listKey: threeKey } }),
    db.osChecklistItem.findMany({ where: { listKey: "open" } }),
    db.eodUpdate.findFirst({ orderBy: { date: "desc" } }),
    db.eodUpdate.findMany({ where: { date: { gte: mondayDB } } }),
    db.metric.findMany({ where: { key: { in: [...METRIC_KEYS] } }, orderBy: { date: "asc" } }),
    getTodayHMSession(),
    getCurrentWeekHMStats(),
    getRaceCountdown(),
    getPatternInsights(userId),
  ]);

  // ── Mode ──
  const mode = computeMode(osDay);
  const modeCfg = OS.modes[mode];

  // ── Metrics: last 14 entries per key ──
  const metrics = Object.fromEntries(METRIC_KEYS.map(k => {
    const pts: Pt[] = metricRows.filter(r => r.key === k).slice(-14).map(r => ({ date: istKey(r.date), value: r.value }));
    return [k, pts];
  })) as Record<MetricKey, Pt[]>;

  // ── Week km: runs since Monday IST, plus the 7 weeks before ──
  const runs = strava8w.filter(a => a.type === "Run" || a.type === "TrailRun");
  const weekKm: number[] = [];
  for (let w = 7; w >= 0; w--) {
    const start = mondayDB.getTime() - w * 7 * DAY;
    const km = runs.filter(a => a.date.getTime() >= start && a.date.getTime() < start + 7 * DAY)
      .reduce((s, a) => s + (a.distanceM ?? 0) / 1000, 0);
    weekKm.push(Math.round(km * 10) / 10);
  }
  const block = currentBlockWeek(osDay);
  const weekTarget = block.index >= 0 ? OS.block[block.index].km : weekHMStats.targetKm || null;
  const weekLabel = block.index >= 0
    ? `block wk ${block.index + 1}`
    : weekHMStats.weekNum > 0 ? `HM wk ${weekHMStats.weekNum} · race ${raceCountdown}d` : "no plan this week";

  // ── Separation ──
  const sepDone = OS.separation.filter(s => s.status === "done").length;
  const sepProg = OS.separation.filter(s => s.status === "prog").length;

  // ── Ferritin panel countdown ──
  const panel = OS.countdowns.find(c => c.id === OS.numbers.ferritin.panelCountdownId);
  const panelDays = panel?.date ? daysUntil(panel.date, osDay) : null;

  // ── EoD streams this week ──
  const daysSoFar = dow + 1;
  const streamCount = new Map<EodStream, number>();
  for (const e of weekEods) {
    let tags: string[] = [];
    try { tags = JSON.parse(e.streams); } catch { /* ignore */ }
    for (const t of tags) if ((EOD_STREAMS as readonly string[]).includes(t)) streamCount.set(t as EodStream, (streamCount.get(t as EodStream) ?? 0) + 1);
  }
  // Research is Tue/Thu only in skeleton mode: over if tagged on more days than Tue/Thu so far
  const researchAllowed = mode === "skeleton" ? [1, 3].filter(d => d <= dow).length : Infinity;
  const streams = EOD_STREAMS.filter(s => streamCount.has(s)).map(s => ({
    key: s, days: streamCount.get(s)!, over: s === "research" && streamCount.get(s)! > researchAllowed,
  })).sort((a, b) => b.days - a.days);

  // ── Today's three ──
  const threeLines = (osThree?.text ?? "").split("\n")
    .map(l => l.replace(/^\s*(\d+[.)]|[-–•])\s*/, "").trim())
    .filter(Boolean).slice(0, 3);
  const threeDone = Object.fromEntries(threeTicks.map(t => [t.itemId, t.done]));
  const threeWritten = osThree
    ? istKey(osThree.updatedAt) === todayIST()
      ? `written today ${istTime(osThree.updatedAt)}`
      : istKey(osThree.updatedAt) === istKey(new Date(todayDB.getTime() - DAY)) ? "written last night" : `written ${dayMonth(istKey(osThree.updatedAt))}`
    : null;

  // ── Countdowns: the undated "this week" first, then the next dated ones ──
  const countdowns: CountdownRow[] = [
    ...OS.countdowns.filter(c => !c.date).map(c => ({ id: c.id, label: c.label, days: null, when: c.text ?? "" })),
    ...OS.countdowns.filter(c => c.date).map(c => ({ id: c.id, label: c.label, days: daysUntil(c.date!, osDay), when: dayMonth(c.date!) }))
      .filter(c => c.days >= 0).sort((a, b) => a.days - b.days),
  ].slice(0, 6);

  // ── Open items: first four unticked ──
  const openDone = Object.fromEntries(openTicks.map(t => [t.itemId, t.done]));
  const openLeft = OS.open.filter(i => !openDone[i.id]);

  // ── Habit streaks: last 7 days of DailyLog, with workout/code/learn/network/journal filled from other logs ──
  type HabitLog = (typeof last35Logs)[number];
  const habitMap = new Map<string, HabitLog>();
  for (const log of last35Logs) habitMap.set(istKey(log.date), { ...log });
  for (let i = 0; i < 7; i++) {
    const d = new Date(osDay.getTime() - i * DAY);
    const key = d.toISOString().slice(0, 10);
    if (!habitMap.has(key)) {
      habitMap.set(key, {
        id: key, userId, date: d,
        weightKg: null, sleepMin: null, rhrBpm: null, energyLevel: null,
        stressLevel: null, moodScore: null, anxietyLevel: null,
        didWorkout: false, didRead: false, didCode: false,
        didJournal: false, didMeditate: false, didNetwork: false, didLearn: false,
        deepWorkMin: null, distractionCount: null, tasksPlanned: null, tasksCompleted: null,
        kcal: null, proteinG: null, waterL: null, alcoholUnits: null,
        disciplineScore: null, momentumScore: null, vo2MaxMlKgMin: null, hrvMs: null,
        notes: null, loggedAt: d,
      });
    }
  }
  for (const a of strava8w) { const e = habitMap.get(istKey(a.date)); if (e && a.type !== "Walk") e.didWorkout = true; }
  for (const tl of last35TechLogs) {
    const e = habitMap.get(istKey(tl.date));
    if (!e) continue;
    if ((tl.hoursCodedMin ?? 0) > 0) e.didCode = true;
    if ((tl.aiAgentsBuilt ?? 0) + (tl.promptsEngineered ?? 0) + (tl.modelsExperimented ?? 0) > 0) e.didLearn = true;
  }
  for (const fl of last35FounderLogs) {
    const e = habitMap.get(istKey(fl.date));
    if (e && (fl.newPeopleMet ?? 0) + (fl.highValueConnections ?? 0) + (fl.coffeeChats ?? 0) + (fl.linkedinPosts ?? 0) + (fl.investorOutreach ?? 0) + (fl.followUpsDone ?? 0) > 0) e.didNetwork = true;
  }
  for (const r of last35Reflections) { const e = habitMap.get(istKey(r.date)); if (e && r.journalText) e.didJournal = true; }
  const habitLogs = [...habitMap.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([, l]) => l);

  // ── Fitness panel: last four weeks of the same buckets ──
  const weekBuckets = weekKm.slice(-4).map((km, i) => ({
    label: i === 3 ? "This wk" : i === 2 ? "Last wk" : `${3 - i}wk ago`,
    km,
    targetKm: i === 3 ? weekHMStats.targetKm : Math.max(km, 1),
  }));

  return {
    userId, todayDB, osDay, mode, modeCfg,
    numbers: {
      separation: { done: sepDone, prog: sepProg, total: OS.separation.length, statuses: OS.separation.map(s => s.status) },
      reliance: metrics.reliance,
      demos: metrics.demos,
      ferritin: metrics.ferritin,
      week: { km: weekKm, target: weekTarget, label: weekLabel },
      panelDays,
    },
    eod: latestEod ? {
      isToday: latestEod.date.getTime() === todayDB.getTime(),
      dateLabel: istDayLabel(latestEod.date),
      outcome: latestEod.outcome,
      draft: latestEod.draft,
      final: latestEod.final,
      streams: (() => { try { return JSON.parse(latestEod.streams) as string[]; } catch { return []; } })(),
      time: istTime(latestEod.updatedAt),
    } : null,
    three: { lines: threeLines, done: threeDone, listKey: threeKey, written: threeWritten, text: osThree?.text ?? "" },
    block: { index: block.index, daysToStart: block.daysToStart },
    countdowns, countdownTotal: OS.countdowns.length,
    streams, streamDays: daysSoFar,
    open: { items: openLeft.slice(0, 4), left: openLeft.length, total: OS.open.length },
    // below the fold
    todayLog, yesterdayLog, todayTasks, habitLogs, weekBuckets,
    strava: strava8w, wipTasks, todayHMSession, weekHMStats, raceCountdown, patternInsights,
  };
}

export type TodayData = Awaited<ReturnType<typeof loadToday>>;
