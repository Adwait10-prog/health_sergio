import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { startOfDay, startOfWeek, startOfMonth } from "date-fns";

export async function POST(req: NextRequest) {
  const userId = getUserId();
  const body = await req.json();
  const type: "daily" | "weekly" | "monthly" = body.type ?? "daily";

  // Date key depends on type
  let date: Date;
  const now = new Date();
  if (type === "monthly")     date = startOfDay(startOfMonth(now));
  else if (type === "weekly") date = startOfDay(startOfWeek(now, { weekStartsOn: 1 }));
  else                        date = startOfDay(now);

  const data: Record<string, unknown> = { type };

  if (type === "daily") {
    if (body.journalText    != null) data.journalText    = body.journalText;
    if (body.lessonsLearned != null) data.lessonsLearned = body.lessonsLearned;
    if (body.gratitudeItems != null) data.gratitudeItems = body.gratitudeItems;
  }
  if (type === "weekly") {
    if (body.weeklyWins    != null) data.weeklyWins    = body.weeklyWins;
    if (body.weeklyMisses  != null) data.weeklyMisses  = body.weeklyMisses;
    if (body.nextWeekFocus != null) data.nextWeekFocus = body.nextWeekFocus;
    if (body.weeklyScore   != null) data.weeklyScore   = Number(body.weeklyScore);
  }
  if (type === "monthly") {
    if (body.amProudScore    != null) data.amProudScore    = Number(body.amProudScore);
    if (body.goalAlignPct    != null) data.goalAlignPct    = Number(body.goalAlignPct);
    if (body.identityActions != null) data.identityActions = Number(body.identityActions);
  }

  const entry = await db.reflection.upsert({
    where: { userId_date_type: { userId, date, type } },
    create: { userId, date, type, ...data },
    update: data,
  });

  // For monthly — also upsert MonthlyReview identity sliders
  if (type === "monthly") {
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const sliders: Record<string, unknown> = {};
    const sliderKeys = ["leadershipScore","confidenceScore","communicationScore","technicalDepthScore","decisionMakingScore","disciplineScore"];
    sliderKeys.forEach((k) => { if (body[k] != null) sliders[k] = Number(body[k]); });
    if (Object.keys(sliders).length) {
      // compute overall as avg of provided sliders
      const vals = Object.values(sliders) as number[];
      sliders.overallScore = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10;
      await db.monthlyReview.upsert({
        where: { userId_month: { userId, month } },
        create: { userId, month, notes: body.notes ?? null, ...sliders },
        update: sliders,
      });
    }
  }

  return NextResponse.json(entry);
}

export async function GET(req: NextRequest) {
  const userId = getUserId();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "daily";

  const entries = await db.reflection.findMany({
    where: { userId, type },
    orderBy: { date: "desc" },
    take: 10,
  });

  return NextResponse.json(entries);
}
