import { getTodayHMSession, getLast7HMSessions, getCurrentWeekHMStats, getRaceCountdown } from "@/lib/hmTracker";
import { isStravaConnected, formatPace, formatDistance, formatDuration } from "@/lib/strava";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { subDays } from "date-fns";
import { format, parseISO } from "date-fns";
import StravaConnect from "@/components/fitness/StravaConnect";

export const dynamic = "force-dynamic";

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  gym_lc:       { bg: "#FEF3C7", text: "#B45309", label: "Gym LC"    },
  gym_ub:       { bg: "#FEF3C7", text: "#B45309", label: "Gym UB"    },
  gym_fb_light: { bg: "#FEF7E0", text: "#B45309", label: "Gym FB"    },
  easy:         { bg: "#D1FAE5", text: "#065F46", label: "Easy"      },
  quality:      { bg: "#A7F3D0", text: "#065F46", label: "Quality"   },
  long:         { bg: "#16A34A", text: "#FFFFFF", label: "Long"      },
  swim:         { bg: "#DBEAFE", text: "#2563EB", label: "Swim"      },
  rest:         { bg: "#F0F3F8", text: "#94A3B8", label: "Rest"      },
  race:         { bg: "#16A34A", text: "#FFFFFF", label: "Race"      },
};

function typeChip(type: string) {
  const c = TYPE_COLORS[type] ?? { bg: "#F0F3F8", text: "#94A3B8", label: type };
  return (
    <span
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.text }}
    >
      {c.label}
    </span>
  );
}

function StatusDot({ status }: { status: string | null }) {
  if (status === "done")    return <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />;
  if (status === "partial") return <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400" />;
  if (status === "skipped") return <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-400" />;
  return <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "var(--border)" }} />;
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

const STRAVA_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  Run:           { bg: "#D1FAE5", color: "#065F46" },
  TrailRun:      { bg: "#A7F3D0", color: "#065F46" },
  Ride:          { bg: "#DBEAFE", color: "#1D4ED8" },
  VirtualRide:   { bg: "#EDE9FE", color: "#6D28D9" },
  Swim:          { bg: "#BAE6FD", color: "#0369A1" },
  WeightTraining:{ bg: "#FEF3C7", color: "#B45309" },
  Workout:       { bg: "#FEF3C7", color: "#B45309" },
  Walk:          { bg: "#F0F3F8", color: "#94A3B8" },
};

export default async function FitnessPage() {
  const userId       = getUserId();
  const today        = getTodayHMSession();
  const last7        = getLast7HMSessions();
  const weekStats    = getCurrentWeekHMStats();
  const daysToRace   = getRaceCountdown();
  const stravaConnected = await isStravaConnected();

  const [recentActivities, latestActivity] = await Promise.all([
    db.stravaActivity.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 10,
    }),
    db.stravaActivity.findFirst({
      where: { userId },
      orderBy: { date: "desc" },
    }),
  ]);

  // This week's Strava km (runs only)
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekStravaKm = recentActivities
    .filter(a => new Date(a.date) >= weekStart && ["Run","TrailRun"].includes(a.type))
    .reduce((s, a) => s + (a.distanceM ?? 0) / 1000, 0);

  const weekPct = weekStats.targetKm > 0
    ? Math.min(100, Math.round((Math.max(weekStats.doneKm, weekStravaKm) / weekStats.targetKm) * 100))
    : 0;

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--fitness)" }}>Fitness</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>HM Training · Vedanta Delhi Half Marathon</p>
        </div>
        <StravaConnect connected={stravaConnected} />
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_300px] gap-4">
        {/* Left column */}
        <div className="flex flex-col gap-4">

          {/* Race countdown + week badge */}
          <div
            className="rounded-xl p-4 flex items-center justify-between"
            style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
          >
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Race day</p>
              <p className="text-xl font-bold mt-0.5" style={{ color: "var(--fitness)" }}>
                {daysToRace} days to go
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>18 Oct 2026 · Vedanta Delhi HM</p>
            </div>
            <div
              className="text-center px-4 py-2 rounded-xl"
              style={{ background: "var(--bg-soft)", border: "1px solid var(--border)" }}
            >
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Week</p>
              <p className="text-2xl font-bold" style={{ color: "var(--fitness)" }}>{weekStats.weekNum}</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>of 24</p>
            </div>
          </div>

          {/* Today's session */}
          <div
            className="rounded-xl p-4"
            style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>Today</p>
            {today ? (
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {typeChip(today.type)}
                      {today.logStatus && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                          <StatusDot status={today.logStatus} />
                          {today.logStatus}
                        </span>
                      )}
                    </div>
                    <p className="text-base font-semibold" style={{ color: "var(--text)" }}>{today.name}</p>
                  </div>
                  {today.targetKm && (
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold" style={{ color: "var(--fitness)" }}>{today.targetKm} km</p>
                      {today.targetMin && (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>~{today.targetMin} min</p>
                      )}
                    </div>
                  )}
                </div>
                {today.logStatus && (
                  <div className="flex gap-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                    {today.actualKm != null && (
                      <div>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Actual</p>
                        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{today.actualKm} km</p>
                      </div>
                    )}
                    {today.actualMin != null && (
                      <div>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Duration</p>
                        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{today.actualMin} min</p>
                      </div>
                    )}
                    {today.effort != null && (
                      <div>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Effort</p>
                        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{today.effort}/10</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No session scheduled for today.</p>
            )}
          </div>

          {/* Weekly km progress */}
          <div
            className="rounded-xl p-4"
            style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                Week {weekStats.weekNum} km
              </p>
              <span className="text-xs font-semibold" style={{ color: "var(--fitness)" }}>
                {weekStats.doneKm.toFixed(1)} / {weekStats.targetKm.toFixed(1)} km
              </span>
            </div>
            <div className="rounded-full h-2 overflow-hidden" style={{ background: "var(--bg-soft)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${weekPct}%`, background: "var(--fitness)" }}
              />
            </div>
            <p className="text-xs mt-1.5 text-right" style={{ color: "var(--text-muted)" }}>{weekPct}% complete</p>

            {/* Week sessions grid */}
            <div className="grid grid-cols-7 gap-1.5 mt-4">
              {weekStats.sessions.map((s, i) => {
                const c = TYPE_COLORS[s.type] ?? { bg: "#F0F3F8", text: "#94A3B8" };
                return (
                  <div key={s.id} className="flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-md py-1.5 flex flex-col items-center relative overflow-hidden"
                      style={{ background: c.bg, minHeight: 36 }}
                    >
                      {s.logStatus === "done" && (
                        <div className="absolute inset-0 opacity-20" style={{ background: "var(--fitness)" }} />
                      )}
                      <span className="text-[9px] font-bold relative z-10" style={{ color: c.text }}>
                        {DAY_LABELS[i] ?? ""}
                      </span>
                      {s.targetKm ? (
                        <span className="text-[8px] relative z-10" style={{ color: c.text }}>{s.targetKm}k</span>
                      ) : (
                        <span className="text-[8px] relative z-10" style={{ color: c.text }}>—</span>
                      )}
                    </div>
                    <StatusDot status={s.logStatus} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Latest Strava activity */}
          {latestActivity && (
            <div
              className="rounded-xl p-4"
              style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
                Latest Strava activity
              </p>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: (STRAVA_TYPE_COLORS[latestActivity.type] ?? { bg: "#F0F3F8" }).bg,
                        color: (STRAVA_TYPE_COLORS[latestActivity.type] ?? { color: "#94A3B8" }).color,
                      }}
                    >
                      {latestActivity.type}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {format(new Date(latestActivity.date), "EEE d MMM")}
                    </span>
                  </div>
                  <p className="text-base font-semibold truncate" style={{ color: "var(--text)" }}>
                    {latestActivity.name}
                  </p>
                </div>
                {latestActivity.distanceM != null && (
                  <p className="text-xl font-bold shrink-0" style={{ color: "var(--fitness)" }}>
                    {formatDistance(latestActivity.distanceM)}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                {latestActivity.movingTimeSec != null && (
                  <div>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Duration</p>
                    <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                      {formatDuration(latestActivity.movingTimeSec)}
                    </p>
                  </div>
                )}
                {latestActivity.avgSpeedMps != null && ["Run","TrailRun"].includes(latestActivity.type) && (
                  <div>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Pace</p>
                    <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                      {formatPace(latestActivity.avgSpeedMps)}
                    </p>
                  </div>
                )}
                {latestActivity.avgHeartRate != null && (
                  <div>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Avg HR</p>
                    <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                      {latestActivity.avgHeartRate} bpm
                    </p>
                  </div>
                )}
                {latestActivity.totalElevationM != null && (
                  <div>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Elevation</p>
                    <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                      {Math.round(latestActivity.totalElevationM)}m
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Strava activities list */}
          {recentActivities.length > 0 && (
            <div
              className="rounded-xl p-4"
              style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
                Recent activities
              </p>
              <div className="flex flex-col">
                {recentActivities.slice(0, 8).map((a) => {
                  const c = STRAVA_TYPE_COLORS[a.type] ?? { bg: "#F0F3F8", color: "#94A3B8" };
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 py-2"
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ background: c.bg, color: c.color }}
                      >
                        {a.type.slice(0, 4).toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: "var(--text)" }}>{a.name}</p>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          {format(new Date(a.date), "EEE d MMM")}
                          {a.movingTimeSec != null ? ` · ${formatDuration(a.movingTimeSec)}` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {a.distanceM != null && (
                          <p className="text-sm font-semibold" style={{ color: "var(--fitness)" }}>
                            {formatDistance(a.distanceM)}
                          </p>
                        )}
                        {a.avgHeartRate != null && (
                          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            ♥ {a.avgHeartRate}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!stravaConnected && (
            <div
              className="rounded-xl p-4 flex items-center gap-3"
              style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px dashed var(--border)" }}
            >
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Connect Strava</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Sync your runs and workouts. Auto-fills HM Tracker logs.
                </p>
              </div>
              <a
                href="/api/strava/connect"
                className="px-3 py-1.5 rounded-lg text-sm font-semibold shrink-0"
                style={{ background: "#FC4C02", color: "#fff", textDecoration: "none" }}
              >
                Connect →
              </a>
            </div>
          )}

          {/* Open HM Tracker CTA */}
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl p-4 flex items-center justify-between"
            style={{
              background: "var(--bg-card)",
              boxShadow: "var(--shadow-sm)",
              border: "1px solid var(--border)",
              textDecoration: "none",
            }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Open HM Tracker</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Log sessions · view plan · coach brief</p>
            </div>
            <div
              className="px-3 py-1.5 rounded-lg text-sm font-semibold shrink-0"
              style={{ background: "var(--fitness)", color: "#fff" }}
            >
              Open →
            </div>
          </a>
        </div>

        {/* Right column — last 7 days */}
        <div
          className="rounded-xl p-4 h-fit lg:sticky lg:top-6"
          style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Last 7 days</h2>
          {last7.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No sessions in range.</p>
          ) : (
            <div className="flex flex-col">
              {last7.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2.5 py-2"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <StatusDot status={s.logStatus} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--text)" }}>{s.name}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {format(parseISO(s.date), "EEE d MMM")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {typeChip(s.type)}
                    {(s.actualKm ?? s.targetKm) != null && (
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {s.actualKm ?? s.targetKm} km
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>Status</p>
            <div className="flex flex-col gap-1">
              {[
                { color: "#22C55E", label: "Done" },
                { color: "#FBBF24", label: "Partial" },
                { color: "#FB923C", label: "Skipped" },
                { color: "var(--border)", label: "Not logged" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
