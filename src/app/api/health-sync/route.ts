import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { startOfDay } from "date-fns";

// Health Auto Export metric names → our DailyLog fields
const METRIC_MAP: Record<string, string> = {
  body_mass:            "weightKg",
  resting_heart_rate:   "rhrBpm",
  heart_rate_variability_sdnn: "hrvMs",  // stored in notes for now
};

interface MetricEntry { date: string; qty?: number; asleep?: number }
interface Metric      { name: string; units?: string; data: MetricEntry[] }
interface Payload     { data: { metrics: Metric[] } }

export async function POST(req: NextRequest) {
  // Validate shared secret
  const token = req.headers.get("x-health-sync-token");
  if (token !== process.env.HEALTH_SYNC_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as Payload;
  const userId = getUserId();
  const updates: Record<string, Record<string, unknown>> = {};

  for (const metric of body.data?.metrics ?? []) {
    for (const entry of metric.data ?? []) {
      const dateStr = entry.date.split(" ")[0]; // "2026-05-25 07:30:00" → "2026-05-25"
      if (!updates[dateStr]) updates[dateStr] = {};

      if (metric.name === "body_mass" && entry.qty != null) {
        updates[dateStr].weightKg = entry.qty;
      } else if (metric.name === "resting_heart_rate" && entry.qty != null) {
        updates[dateStr].rhrBpm = Math.round(entry.qty);
      } else if (metric.name === "sleep_analysis" && entry.asleep != null) {
        updates[dateStr].sleepMin = Math.round(entry.asleep * 60);
      } else if (metric.name === "heart_rate_variability_sdnn" && entry.qty != null) {
        // HRV: store in notes field as supplemental data
        updates[dateStr]._hrv = Math.round(entry.qty);
      }
    }
  }

  let upserted = 0;
  for (const [dateStr, data] of Object.entries(updates)) {
    const date = startOfDay(new Date(dateStr));
    const { _hrv, ...fields } = data;
    const notesAppend = _hrv != null ? `HRV: ${_hrv}ms` : undefined;

    await db.dailyLog.upsert({
      where:  { userId_date: { userId, date } },
      create: { userId, date, ...fields, notes: notesAppend ?? null },
      update: {
        ...fields,
        ...(notesAppend ? { notes: notesAppend } : {}),
      },
    });
    upserted++;
  }

  return NextResponse.json({ upserted });
}
