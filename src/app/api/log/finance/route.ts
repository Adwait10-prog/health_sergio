import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { startOfDay, format } from "date-fns";

export async function POST(req: NextRequest) {
  const userId = getUserId();
  const body = await req.json();
  // Finance logs are monthly — use first of current month as the date key
  const now = body.date ? new Date(body.date) : new Date();
  const date = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));

  const fields = [
    "salaryInr","freelanceInr","sideProjectInr","investmentReturnsInr",
    "netWorthInr","savingsInr","monthlySavingsInr","sipContributionsInr",
    "emergencyFundMonths","liquidCashInr",
    "equityPortfolioInr","goldInr","mutualFundsInr","cagrPct","passiveIncomeInr",
    "personalRunwayMonths","burnRateInr","startupCapitalInr","fiProgressPct",
  ];

  const data: Record<string, unknown> = {};
  for (const f of fields) {
    if (body[f] != null && body[f] !== "") data[f] = Number(body[f]);
  }
  if (body.notes != null) data.notes = body.notes;

  // Auto-calc runway only if both liquid cash AND burn rate are positive
  const liquid = data.liquidCashInr as number | undefined;
  const burn   = data.burnRateInr   as number | undefined;
  if (!data.personalRunwayMonths && liquid && burn && burn > 0) {
    data.personalRunwayMonths = Math.round((liquid / burn) * 10) / 10;
  }

  const log = await db.financeLog.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, ...data },
    update: data,
  });

  return NextResponse.json(log);
}

export async function GET(req: NextRequest) {
  const userId = getUserId();
  const { searchParams } = new URL(req.url);
  const months = Number(searchParams.get("months") ?? "12");
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const logs = await db.financeLog.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(logs);
}
