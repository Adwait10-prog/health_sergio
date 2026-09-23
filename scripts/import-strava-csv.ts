// One-off / rerunnable: import a Strava bulk-export activities.csv into StravaActivity.
// Insert-only (skips stravaIds already in the DB) so richer API-synced rows are never overwritten.
//
//   set -a; source .env.local; set +a
//   ./node_modules/.bin/tsx scripts/import-strava-csv.ts "<path>/activities.csv" --dry-run
//   ./node_modules/.bin/tsx scripts/import-strava-csv.ts "<path>/activities.csv"

import fs from "fs";
import { db } from "../src/lib/db";
import { getUserId } from "../src/lib/user";

const [, , csvPath, ...flags] = process.argv;
const DRY = flags.includes("--dry-run");
if (!csvPath) { console.error("usage: import-strava-csv.ts <activities.csv> [--dry-run]"); process.exit(1); }

// ── minimal RFC-4180 parser (quoted fields, embedded commas/quotes/newlines) ──
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length > 1);
}

// "Sep 22, 2026, 2:26:22 PM" (export dates are UTC) → Date
const MONTHS: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
function parseDate(s: string): Date | null {
  const m = s.trim().match(/^([A-Z][a-z]{2}) (\d{1,2}), (\d{4}), (\d{1,2}):(\d{2}):(\d{2}) (AM|PM)$/);
  if (!m) return null;
  let h = Number(m[4]) % 12; if (m[7] === "PM") h += 12;
  return new Date(Date.UTC(Number(m[3]), MONTHS[m[1]], Number(m[2]), h, Number(m[5]), Number(m[6])));
}

// Export type labels → Strava API type names used elsewhere in the app
const TYPE_MAP: Record<string, string> = {
  "Weight Training": "WeightTraining", "Trail Run": "TrailRun", "Virtual Run": "VirtualRun",
  "Virtual Ride": "VirtualRide", "E-Bike Ride": "EBikeRide", "Stair-Stepper": "StairStepper",
  "Nordic Ski": "NordicSki", "Alpine Ski": "AlpineSki", "Ice Skate": "IceSkate", "Inline Skate": "InlineSkate",
  "Rock Climb": "RockClimbing", "Stand Up Paddling": "StandUpPaddling",
};
const normType = (t: string) => TYPE_MAP[t] ?? t.replace(/\s+/g, "");

const num = (s: string | undefined): number | null => {
  if (s == null || s.trim() === "") return null;
  const n = Number(s); return Number.isFinite(n) ? n : null;
};
const int = (s: string | undefined): number | null => { const n = num(s); return n == null ? null : Math.round(n); };

async function main() {
  const text = fs.readFileSync(csvPath, "utf-8");
  const [header, ...rows] = parseCsv(text);

  // Header has duplicate names (summary vs detailed). Keep all positions per name.
  const pos: Record<string, number[]> = {};
  header.forEach((h, i) => { (pos[h.trim()] ??= []).push(i); });
  const col = (name: string, nth = 0) => pos[name]?.[nth];
  const get = (r: string[], name: string, nth = 0) => { const i = col(name, nth); return i == null ? undefined : r[i]; };
  // prefer the detailed (2nd) occurrence, fall back to the 1st
  const getD = (r: string[], name: string) => { const v = get(r, name, 1); return v != null && v !== "" ? v : get(r, name, 0); };

  const userId = getUserId();
  const existing = new Set((await db.stravaActivity.findMany({ select: { stravaId: true } })).map(a => a.stravaId));

  const mapped = [];
  let badDate = 0;
  const types = new Map<string, number>();
  for (const r of rows) {
    const stravaId = (get(r, "Activity ID") ?? "").trim();
    if (!stravaId) continue;
    const date = parseDate(get(r, "Activity Date") ?? "");
    if (!date) { badDate++; continue; }

    const type = normType((get(r, "Activity Type") ?? "").trim());
    types.set(type, (types.get(type) ?? 0) + 1);

    // The detailed (2nd) Distance column is always metres. The summary (1st) column is km for
    // most sports but METRES for swims, so only fall back to it when the detailed one is empty.
    let distanceM = num(get(r, "Distance", 1));
    if (distanceM == null) {
      const summary = num(get(r, "Distance", 0));
      if (summary != null) distanceM = type === "Swim" ? summary : summary * 1000;
    }

    const description = (get(r, "Activity Description") ?? "").trim();
    const raw = Object.fromEntries(header.map((h, i) => [h.trim() + (pos[h.trim()].indexOf(i) ? `_${pos[h.trim()].indexOf(i) + 1}` : ""), r[i]]));

    mapped.push({
      userId,
      stravaId,
      date,
      name: (get(r, "Activity Name") ?? "").trim() || type,
      type,
      distanceM,
      movingTimeSec: int(get(r, "Moving Time")),
      elapsedTimeSec: int(getD(r, "Elapsed Time")),
      totalElevationM: num(get(r, "Elevation Gain")),
      avgSpeedMps: num(get(r, "Average Speed")),
      avgHeartRate: int(get(r, "Average Heart Rate")),
      maxHeartRate: int(getD(r, "Max Heart Rate")),
      calories: int(get(r, "Calories")),
      kudosCount: null as number | null,
      sufferScore: int(getD(r, "Relative Effort")),
      // keys the app already reads from rawJson (query_run) + the full CSV row for reference
      rawJson: JSON.stringify({
        source: "strava-csv-export",
        id: Number(stravaId), name: (get(r, "Activity Name") ?? "").trim(), type,
        start_date: date.toISOString(),
        description: description || undefined,
        average_cadence: num(get(r, "Average Cadence")) ?? undefined,
        perceived_exertion: num(get(r, "Perceived Exertion")) ?? undefined,
        csv: raw,
      }),
    });
  }

  const toInsert = mapped.filter(m => !existing.has(m.stravaId));
  const dates = mapped.map(m => m.date.getTime());
  console.log(`csv rows: ${rows.length} · parsed: ${mapped.length} · bad dates: ${badDate}`);
  console.log(`range: ${new Date(Math.min(...dates)).toISOString().slice(0, 10)} → ${new Date(Math.max(...dates)).toISOString().slice(0, 10)}`);
  console.log(`already in DB: ${mapped.length - toInsert.length} · to insert: ${toInsert.length}`);
  console.log("types:", Object.fromEntries([...types.entries()].sort((a, b) => b[1] - a[1])));
  const sample = toInsert.slice(0, 3).map(({ rawJson, userId: _u, ...rest }) => rest);
  console.log("sample:", JSON.stringify(sample, null, 1));

  if (DRY) { console.log("DRY RUN — nothing written."); return; }

  const res = await db.stravaActivity.createMany({ data: toInsert, skipDuplicates: true });
  console.log(`inserted: ${res.count}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
