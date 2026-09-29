// The snapshot Jarvis starts every conversation with (passed as a dynamic variable),
// so most questions are answered without a tool call. Plain sentences, written for the ear.
import { db } from "../db";
import { getUserId, ASANA_OWNER_GID } from "../user";
import { todayUTC, todayIST as todayKey, daysAgoUTC, dayMonth, istDayLabel } from "../date";
import { getTodayHMSession, getCurrentWeekHMStats, getRaceCountdown } from "../hmTracker";
import { OS } from "../osData";
import { computeMode, daysUntil, istToday } from "../osLogic";

const DAY = 86400000;
const istNow = () => new Date(Date.now() + 5.5 * 3600000);

export type SessionMode = "morning" | "evening" | "open";

export async function buildBriefing(sessionMode: SessionMode = "open"): Promise<{ briefing: string; greeting: string }> {
  const userId = getUserId();
  const osDay = istToday();
  const todayDB = todayUTC();
  const dow = (osDay.getUTCDay() + 6) % 7;
  const mondayDB = new Date(todayDB.getTime() - dow * DAY);

  const yesterdayDB = new Date(todayDB.getTime() - DAY);
  const [metrics, three, threeTicks, openTicks, eod, tasks, wip, runs, lastRun, vitals, lastTalk, session, week, raceDays, yEod, ySession] = await Promise.all([
    db.metric.findMany({ orderBy: { date: "desc" }, take: 30 }),
    db.osNote.findUnique({ where: { key: "three" } }),
    db.osChecklistItem.findMany({ where: { listKey: `three:${todayKey()}` } }),
    db.osChecklistItem.findMany({ where: { listKey: "open", done: true } }),
    db.eodUpdate.findUnique({ where: { date: todayDB } }),
    db.task.findMany({ where: { userId, isToday: true, status: { notIn: ["done", "cancelled"] } }, orderBy: [{ priority: "asc" }], take: 8 }),
    db.asanaTask.findMany({
      where: { assigneeGid: ASANA_OWNER_GID, status: "incomplete", parentGid: null, sectionName: { in: ["WIP", "Work in Progress", "In Progress", "Prioritized"] } },
      orderBy: { syncedAt: "desc" }, take: 5, select: { name: true, dueOn: true, project: { select: { name: true } } },
    }),
    db.stravaActivity.findMany({ where: { userId, date: { gte: mondayDB }, type: { in: ["Run", "TrailRun"] } } }),
    db.stravaActivity.findFirst({ where: { userId, type: { in: ["Run", "TrailRun"] } }, orderBy: { date: "desc" } }),
    db.dailyLog.findFirst({ where: { userId, date: { gte: daysAgoUTC(1) } }, orderBy: { date: "desc" } }),
    db.agentConversation.findFirst({ where: { userLines: { not: null } }, orderBy: { startedAt: "desc" } }),
    getTodayHMSession(),
    getCurrentWeekHMStats(),
    getRaceCountdown(),
    db.eodUpdate.findUnique({ where: { date: yesterdayDB } }),
    db.hMSession.findFirst({ where: { userId, date: { gte: yesterdayDB, lt: todayDB } }, include: { log: true } }),
  ]);

  const mode = computeMode(osDay);
  const now = istNow();
  const hour = now.getUTCHours();
  const lines: string[] = [];

  lines.push(`Now: ${istDayLabel(new Date())}, ${now.toISOString().slice(11, 16)} IST. Mode: ${OS.modes[mode].label} (${OS.modes[mode].rules}).`);

  // The five numbers
  const latest = (k: string) => metrics.find(m => m.key === k);
  const rel = latest("reliance"), dem = latest("demos"), fer = latest("ferritin");
  const sepDone = OS.separation.filter(s => s.status === "done").length;
  const weekKm = runs.reduce((s, r) => s + (r.distanceM ?? 0) / 1000, 0);
  lines.push([
    `Numbers — Separation ${sepDone} of ${OS.separation.length} steps done`,
    rel ? `Reliance ${rel.value} min/day (baseline 20, logged ${dayMonth(new Date(rel.date.getTime() + 5.5 * 3600000))})` : "Reliance not logged yet",
    dem ? `demos ${dem.value} of 3 this week` : "demos not logged",
    `week km ${weekKm.toFixed(1)}${week.targetKm ? ` of ${week.targetKm}` : ""}`,
    fer ? `ferritin ${fer.value} ng/mL` : "ferritin unknown until the November panel",
  ].join("; ") + ".");

  // Today's three
  const threeLines = (three?.text ?? "").split("\n").map(l => l.replace(/^\s*(\d+[.)]|[-–•])\s*/, "").trim()).filter(Boolean).slice(0, 3);
  const ticked = new Set(threeTicks.filter(t => t.done).map(t => Number(t.itemId)));
  lines.push(threeLines.length
    ? `Today's three: ${threeLines.map((l, i) => `${i + 1}) ${l}${ticked.has(i) ? " [done]" : ""}`).join("; ")}.`
    : "Today's three: not set.");

  const yParts = [
    yEod && `EoD outcome "${yEod.outcome}"`,
    ySession && `training "${ySession.name}" ${ySession.log?.status ?? "not logged"}`,
  ].filter(Boolean);
  if (yParts.length) lines.push(`Yesterday: ${yParts.join("; ")}.`);
  lines.push(eod ? `EoD: drafted${eod.final ? " and posted" : ""} — outcome "${eod.outcome}".` : "EoD: not drafted yet today.");

  // Training
  if (session) {
    lines.push(`Training today (HM week ${session.weekNum}): ${session.name}${session.targetKm ? `, ${session.targetKm} km` : ""}${session.logStatus ? ` — ${session.logStatus}` : " — not logged"}. Delhi half marathon in ${raceDays} days.`);
  }
  if (lastRun) {
    const km = ((lastRun.distanceM ?? 0) / 1000).toFixed(1);
    const pace = lastRun.avgSpeedMps ? `${Math.floor(1000 / lastRun.avgSpeedMps / 60)}:${String(Math.round((1000 / lastRun.avgSpeedMps) % 60)).padStart(2, "0")}/km` : "";
    lines.push(`Last run: ${istDayLabel(lastRun.date)}, ${km} km${pace ? ` at ${pace}` : ""}${lastRun.avgHeartRate ? `, avg HR ${lastRun.avgHeartRate}` : ""}.`);
  }
  if (vitals && (vitals.rhrBpm || vitals.hrvMs || vitals.sleepMin)) {
    lines.push(`Recovery: ${[vitals.rhrBpm && `RHR ${vitals.rhrBpm}`, vitals.hrvMs && `HRV ${vitals.hrvMs} ms`, vitals.sleepMin && `sleep ${(vitals.sleepMin / 60).toFixed(1)} h`].filter(Boolean).join(", ")}.`);
  }

  // Work
  if (tasks.length) lines.push(`Personal tasks today: ${tasks.map(t => t.title).join("; ")}.`);
  if (wip.length) lines.push(`Asana in progress: ${wip.map(w => `${w.name}${w.project?.name ? ` (${w.project.name})` : ""}${w.dueOn ? `, due ${w.dueOn}` : ""}`).join("; ")}.`);

  // Plan
  const upcoming = OS.countdowns
    .map(c => ({ ...c, days: c.date ? daysUntil(c.date, osDay) : null }))
    .filter(c => c.days == null || c.days >= 0)
    .sort((a, b) => (a.days ?? -1) - (b.days ?? -1))
    .slice(0, 6);
  const nextDated = upcoming.find(c => c.days != null);
  if (nextDated) lines.push(`Next dated countdown: ${nextDated.label} in ${nextDated.days} days (${dayMonth(nextDated.date!)}).`);
  lines.push(`Coming up, in order: ${upcoming.map(c => c.days == null ? `${c.label} (${c.text})` : `${c.label} in ${c.days} days (${dayMonth(c.date!)})`).join("; ")}.`);
  const doneIds = new Set(openTicks.map(t => t.itemId));
  const open = OS.open.filter(o => !doneIds.has(o.id));
  lines.push(`Open items (${open.length}): ${open.slice(0, 5).map(o => o.label).join("; ")}.`);
  lines.push(`ElevenLabs partnership next step: ${OS.elevenlabs.find(e => e.status === "next")?.label ?? "none"}.`);

  if (lastTalk?.userLines) {
    lines.push(`Last time you spoke (${istDayLabel(lastTalk.startedAt)}), he said: "${lastTalk.userLines.slice(0, 500)}".`);
  }

  const part = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  let greeting: string;
  if (sessionMode === "morning") greeting = `Morning, Adwait. Quick run-through — two minutes.`;
  else if (sessionMode === "evening") greeting = `Evening, Adwait. Let's close out the day.`;
  else {
    const hint = !eod && hour >= 17 ? "EoD's not drafted yet." : !threeLines.length ? "No three set for today yet." : session && !session.logStatus ? `${session.name} is still on the list today.` : "";
    greeting = `${part}, Adwait.${hint ? ` ${hint}` : ""} What do you need?`;
  }

  return { briefing: lines.join("\n"), greeting };
}
