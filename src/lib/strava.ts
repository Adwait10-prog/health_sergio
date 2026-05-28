import { db } from "./db";
import { getUserId } from "./user";

const STRAVA_CLIENT_ID     = process.env.STRAVA_CLIENT_ID!;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!;
const STRAVA_REDIRECT_URI  = process.env.STRAVA_REDIRECT_URI!;

export function stravaAuthUrl(): string {
  const params = new URLSearchParams({
    client_id:     STRAVA_CLIENT_ID,
    redirect_uri:  STRAVA_REDIRECT_URI,
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read_all",
  });
  return `https://www.strava.com/oauth/authorize?${params}`;
}

async function refreshIfNeeded(userId: string) {
  const token = await db.stravaToken.findUnique({ where: { userId } });
  if (!token) throw new Error("No Strava token — connect first");

  const now = Math.floor(Date.now() / 1000);
  if (token.expiresAt > now + 300) return token.accessToken;

  // Refresh
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id:     STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      grant_type:    "refresh_token",
      refresh_token: token.refreshToken,
    }),
  });
  const data = await res.json() as {
    access_token: string; refresh_token: string; expires_at: number;
  };
  await db.stravaToken.update({
    where: { userId },
    data: {
      accessToken:  data.access_token,
      refreshToken: data.refresh_token,
      expiresAt:    data.expires_at,
    },
  });
  return data.access_token;
}

export interface StravaActivityRaw {
  id: number;
  name: string;
  type: string;
  start_date: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  calories?: number;
  kudos_count?: number;
  suffer_score?: number;
}

export async function fetchAndSyncActivities(perPage = 20): Promise<number> {
  const userId = getUserId();
  const accessToken = await refreshIfNeeded(userId);

  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Strava API error: ${res.status}`);
  const activities = await res.json() as StravaActivityRaw[];

  let upserted = 0;
  for (const a of activities) {
    await db.stravaActivity.upsert({
      where:  { stravaId: String(a.id) },
      create: {
        userId,
        stravaId:       String(a.id),
        date:           new Date(a.start_date),
        name:           a.name,
        type:           a.type,
        distanceM:      a.distance,
        movingTimeSec:  a.moving_time,
        elapsedTimeSec: a.elapsed_time,
        totalElevationM: a.total_elevation_gain,
        avgSpeedMps:    a.average_speed,
        avgHeartRate:   a.average_heartrate ?? null,
        maxHeartRate:   a.max_heartrate ?? null,
        calories:       a.calories ?? null,
        kudosCount:     a.kudos_count ?? null,
        sufferScore:    a.suffer_score ?? null,
        rawJson:        JSON.stringify(a),
      },
      update: {
        kudosCount:  a.kudos_count ?? null,
        sufferScore: a.suffer_score ?? null,
        rawJson:     JSON.stringify(a),
      },
    });
    upserted++;
  }

  // Auto-fill HM Tracker SessionLog for matching dates
  await autoFillHMTracker(activities);

  return upserted;
}

// For each run/swim activity, try to match a HM Tracker session by date
// and upsert a SessionLog if none exists
async function autoFillHMTracker(activities: StravaActivityRaw[]) {
  const HM_DB_PATH = require("path").resolve(process.cwd(), "../hm-tracker/dev.db");
  let hmDb: import("better-sqlite3").Database | null = null;
  try {
    const Database = require("better-sqlite3");
    hmDb = new Database(HM_DB_PATH, { fileMustExist: true });
  } catch {
    return; // HM Tracker DB not available — skip silently
  }

  const userId = getUserId();
  const hmUserId: string | undefined = (hmDb!
    .prepare("SELECT id FROM User LIMIT 1")
    .get() as { id: string } | undefined)?.id;

  if (!hmUserId) { hmDb!.close(); return; }

  for (const a of activities) {
    if (!["Run", "TrailRun", "Swim", "WeightTraining", "Workout"].includes(a.type)) continue;

    // Convert UTC start_date to IST local date (sessions stored as midnight IST = 18:30 UTC prev day)
    const activityDate = new Date(a.start_date);
    const istDate = new Date(activityDate.getTime() + 5.5 * 60 * 60 * 1000);
    const dateStr = istDate.toISOString().split("T")[0]; // YYYY-MM-DD in IST

    // Match session type to Strava activity type
    let sessionTypeFilter: string;
    if (["Run", "TrailRun"].includes(a.type)) {
      sessionTypeFilter = `AND type IN ('easy','quality','long','race')`;
    } else if (a.type === "Swim") {
      sessionTypeFilter = `AND type = 'swim'`;
    } else {
      // WeightTraining / Workout → try to infer gym session type from activity name
      const nameLower = (a.name ?? "").toLowerCase();
      if (/leg|squat|lower|lc|glute|hamstring/.test(nameLower)) {
        sessionTypeFilter = `AND type = 'gym_lc'`;
      } else if (/upper|ub|chest|back|shoulder|pull|push|arm/.test(nameLower)) {
        sessionTypeFilter = `AND type IN ('gym_ub','gym_fb_light')`;
      } else {
        // No keyword match — match any gym session on that day (only one should exist)
        sessionTypeFilter = `AND type IN ('gym_lc','gym_ub','gym_fb_light')`;
      }
    }

    const session = hmDb!.prepare(
      `SELECT id FROM Session WHERE date(date, '+5 hours', '30 minutes') = date(?) ${sessionTypeFilter} LIMIT 1`
    ).get(dateStr) as { id: string } | undefined;

    if (!session) continue;

    // Check if log already exists
    const existing = hmDb!.prepare(
      `SELECT id FROM SessionLog WHERE sessionId = ?`
    ).get(session.id);

    if (existing) continue;

    // Insert SessionLog
    const cuid = `strava_${a.id}`;
    const loggedAt = new Date().toISOString();
    const isGym = ["WeightTraining", "Workout"].includes(a.type);
    hmDb!.prepare(`
      INSERT INTO SessionLog (id, sessionId, userId, status, actualKm, actualMin, avgHr, maxHr, calories, effort, notes, loggedAt)
      VALUES (?, ?, ?, 'done', ?, ?, ?, ?, ?, NULL, ?, ?)
    `).run(
      cuid,
      session.id,
      hmUserId,
      isGym ? null : a.distance / 1000,   // gym sessions have no distance
      Math.round(a.moving_time / 60),      // sec → min
      a.average_heartrate ?? null,
      a.max_heartrate ?? null,
      a.calories ?? null,
      `Synced from Strava: ${a.name}`,
      loggedAt,
    );
  }

  hmDb!.close();
}

export async function isStravaConnected(): Promise<boolean> {
  const userId = getUserId();
  const token = await db.stravaToken.findUnique({ where: { userId } });
  return !!token;
}

export function formatPace(avgSpeedMps: number): string {
  if (!avgSpeedMps || avgSpeedMps === 0) return "—";
  const minPerKm = 1000 / 60 / avgSpeedMps;
  const min = Math.floor(minPerKm);
  const sec = Math.round((minPerKm - min) * 60);
  return `${min}:${String(sec).padStart(2, "0")} /km`;
}

export function formatDistance(metres: number): string {
  return `${(metres / 1000).toFixed(2)} km`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}
