import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { startOfDay } from "date-fns";

export async function POST(req: NextRequest) {
  const userId = getUserId();
  const body = await req.json();
  const date = startOfDay(body.date ? new Date(body.date) : new Date());

  const fields = [
    "newPeopleMet","highValueConnections","followUpsDone","coffeeChats","eventsAttended",
    "linkedinFollowers","linkedinImpressions","linkedinPosts",
    "ideasResearched","validationCalls","competitorAnalyses","pitchesPrepared","investorOutreach",
    "cofoundersMet","advisorsAdded","partnershipsExplored",
  ];

  const data: Record<string, unknown> = {};
  for (const f of fields) {
    if (body[f] != null) data[f] = Number(body[f]);
  }
  if (body.notes != null) data.notes = body.notes;

  const log = await db.founderLog.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, ...data },
    update: data,
  });

  return NextResponse.json(log);
}

export async function GET(req: NextRequest) {
  const userId = getUserId();
  const { searchParams } = new URL(req.url);
  const days = Number(searchParams.get("days") ?? "30");
  const since = new Date();
  since.setDate(since.getDate() - days);

  const logs = await db.founderLog.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(logs);
}
