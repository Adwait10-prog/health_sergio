import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";

interface MetricEntry { date: string; qty?: number | number[]; asleep?: number | number[] }

// Shortcuts wraps values in arrays — unwrap to get the first value
function unwrap(v: number | number[] | undefined): number | null {
  if (v == null) return null;
  if (Array.isArray(v)) return v.length > 0 ? v[0] : null;
  return v;
}

// Average all values in an array — used for HRV to match Apple Health's daily average
function unwrapAvg(v: number | number[] | undefined): number | null {
  if (v == null) return null;
  if (Array.isArray(v)) {
    const nums = v.filter((x): x is number => typeof x === "number" && !isNaN(x));
    if (nums.length === 0) return null;
    return nums.reduce((s, x) => s + x, 0) / nums.length;
  }
  if (typeof v === "number" && !isNaN(v)) return v;
  return null;
}

interface Metric      { name: string; units?: string; data: MetricEntry[] }
interface HealthExportPayload { data: { metrics: Metric[] } }
// Flat format from iOS Shortcuts: { metric_name: [{date, qty}], ... }
type ShortcutsPayload = Record<string, MetricEntry[]>;

// Debug: GET returns last received payload
let lastPayload: unknown = null;
let lastParsed: unknown = null;
export async function GET() {
  return NextResponse.json({ lastPayload, lastParsed });
}

function parseDateToIST(rawDate: string): string {
  // Handle multiple date formats: "2026-05-25", "2026-05-25 07:30:00", "Tue, 26 May 2026 00:07:10 +0530"
  const parsed = new Date(rawDate);
  if (!isNaN(parsed.getTime())) {
    // Convert to IST (UTC+5:30) before extracting date — avoids midnight-UTC-rollback
    const istMs = parsed.getTime() + 5.5 * 60 * 60 * 1000;
    return new Date(istMs).toISOString().split("T")[0];
  }
  // Fallback: take first 10 chars (YYYY-MM-DD)
  return rawDate.substring(0, 10);
}

function processMetric(
  metricName: string,
  entry: MetricEntry,
  updates: Record<string, Record<string, unknown>>
) {
  const dateStr = parseDateToIST(entry.date?.toString() ?? "");
  if (!dateStr || dateStr.length < 8) return;
  if (!updates[dateStr]) updates[dateStr] = {};

  const qty   = unwrap(entry.qty);
  const asleep = unwrap(entry.asleep as number | number[] | undefined);

  if (metricName === "body_mass" && qty != null) {
    updates[dateStr].weightKg = Math.round(qty * 10) / 10;
  } else if (metricName === "resting_heart_rate" && qty != null) {
    updates[dateStr].rhrBpm = Math.round(qty);
  } else if (metricName === "sleep_analysis" && asleep != null) {
    updates[dateStr].sleepMin = Math.round(asleep * 60);
  } else if (metricName === "heart_rate_variability_sdnn") {
    const hrvAvg = unwrapAvg(entry.qty as number | number[] | undefined);
    if (hrvAvg != null) updates[dateStr].hrvMs = Math.round(hrvAvg * 10) / 10;
  } else if (metricName === "cardio_fitness" && qty != null) {
    updates[dateStr].vo2MaxMlKgMin = Math.round(qty * 10) / 10;
  }
}

export async function POST(req: NextRequest) {
  // Validate shared secret
  const token = req.headers.get("x-health-sync-token");
  if (token !== process.env.HEALTH_SYNC_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawText = await req.text();
  console.log("health-sync raw body:", rawText.substring(0, 500));
  lastPayload = rawText;

  // iOS Shortcuts can produce newline-separated numbers inside JSON arrays,
  // e.g. [100.19\n73.83\n56.30] — replace newlines inside brackets with commas.
  // We do this carefully: only replace \n that are between numbers (not inside strings).
  // Strategy: replace any newline between a digit/. and the next digit/. or ]
  const sanitized = rawText
    .replace(/(\d)\n(\d)/g, "$1,$2")   // "56\n73" → "56,73"
    .replace(/(\d)\n\]/g, "$1]")       // "56\n]" → "56]"
    .replace(/\[\n(\d)/g, "[$1");      // "[\n56" → "[56"

  let body: HealthExportPayload | ShortcutsPayload;
  try {
    body = JSON.parse(sanitized) as HealthExportPayload | ShortcutsPayload;
    lastParsed = body;
  } catch (e) {
    console.error("JSON parse failed:", e, "sanitized:", sanitized.substring(0, 300));
    return NextResponse.json({ error: "Invalid JSON", received: rawText.substring(0, 200) }, { status: 400 });
  }

  const userId = getUserId();
  const updates: Record<string, Record<string, unknown>> = {};

  // Detect format: Health Auto Export has { data: { metrics: [...] } }
  // iOS Shortcuts flat format: { resting_heart_rate: [{date, qty}], ... }
  if ("data" in body && (body as HealthExportPayload).data?.metrics) {
    // Health Auto Export format
    for (const metric of (body as HealthExportPayload).data.metrics) {
      for (const entry of metric.data ?? []) {
        processMetric(metric.name, entry, updates);
      }
    }
  } else {
    // Flat Shortcuts format
    const flat = body as ShortcutsPayload;
    for (const [metricName, entries] of Object.entries(flat)) {
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        if (!entry || typeof entry !== "object") continue;
        processMetric(metricName, entry as MetricEntry, updates);
      }
    }
  }

  console.log("health-sync updates computed:", JSON.stringify(updates));

  let upserted = 0;
  const errors: string[] = [];
  for (const [dateStr, data] of Object.entries(updates)) {
    if (Object.keys(data).length === 0) continue;
    // Store as midnight IST = 18:30 UTC previous day (matches rest of app)
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d) - 5.5 * 60 * 60 * 1000); // midnight IST in UTC
    console.log("upserting", dateStr, "→", date.toISOString(), data);
    try {
      await db.dailyLog.upsert({
        where:  { userId_date: { userId, date } },
        create: { userId, date, ...data },
        update: { ...data },
      });
      upserted++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("upsert failed:", msg);
      errors.push(`${dateStr}: ${msg}`);
    }
  }

  return NextResponse.json({ upserted, updates: Object.keys(updates), errors });
}
