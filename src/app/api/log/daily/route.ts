import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { calcDisciplineScore, calcMomentumScore } from "@/lib/scores";

// Returns midnight IST as UTC — matches how all dates are stored in DB
function todayIST(): Date {
  const now = new Date();
  const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
  const dateStr = new Date(istMs).toISOString().split("T")[0];
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - 5.5 * 60 * 60 * 1000);
}

export async function POST(req: NextRequest) {
  const userId = getUserId();
  const body = await req.json();
  // Use IST-aware date — never use startOfDay(new Date()) which is UTC
  const date = body.date ? (() => {
    const [y, m, d] = body.date.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d) - 5.5 * 60 * 60 * 1000);
  })() : todayIST();

  const data = {
    weightKg: body.weightKg ?? undefined,
    sleepMin: body.sleepMin ?? undefined,
    rhrBpm: body.rhrBpm ?? undefined,
    energyLevel: body.energyLevel ?? undefined,
    stressLevel: body.stressLevel ?? undefined,
    moodScore: body.moodScore ?? undefined,
    anxietyLevel: body.anxietyLevel ?? undefined,
    didWorkout: body.didWorkout ?? undefined,
    didRead: body.didRead ?? undefined,
    didCode: body.didCode ?? undefined,
    didJournal: body.didJournal ?? undefined,
    didMeditate: body.didMeditate ?? undefined,
    didNetwork: body.didNetwork ?? undefined,
    didLearn: body.didLearn ?? undefined,
    deepWorkMin: body.deepWorkMin ?? undefined,
    tasksPlanned: body.tasksPlanned ?? undefined,
    tasksCompleted: body.tasksCompleted ?? undefined,
    kcal: body.kcal ?? undefined,
    proteinG: body.proteinG ?? undefined,
    waterL: body.waterL ?? undefined,
    alcoholUnits: body.alcoholUnits ?? undefined,
    notes: body.notes ?? undefined,
  };

  // Remove undefined keys so upsert doesn't overwrite existing values
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));

  const log = await db.dailyLog.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, ...clean },
    update: clean,
  });

  // Recompute scores and store
  const updated = await db.dailyLog.update({
    where: { id: log.id },
    data: {
      disciplineScore: calcDisciplineScore(log),
      momentumScore: calcMomentumScore(log),
    },
  });

  return NextResponse.json(updated);
}
