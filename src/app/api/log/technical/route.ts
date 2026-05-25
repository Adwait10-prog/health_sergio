import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { startOfDay } from "date-fns";

export async function POST(req: NextRequest) {
  const userId = getUserId();
  const body = await req.json();
  const date = startOfDay(body.date ? new Date(body.date) : new Date());

  const data = {
    hoursCodedMin:      body.hoursCodedMin      != null ? Number(body.hoursCodedMin)      : undefined,
    featuresShipped:    body.featuresShipped     != null ? Number(body.featuresShipped)    : undefined,
    bugsFixed:          body.bugsFixed           != null ? Number(body.bugsFixed)          : undefined,
    apisIntegrated:     body.apisIntegrated      != null ? Number(body.apisIntegrated)     : undefined,
    codeReviewsDone:    body.codeReviewsDone     != null ? Number(body.codeReviewsDone)    : undefined,
    prsOpened:          body.prsOpened           != null ? Number(body.prsOpened)          : undefined,
    prsMerged:          body.prsMerged           != null ? Number(body.prsMerged)          : undefined,
    aiAgentsBuilt:      body.aiAgentsBuilt       != null ? Number(body.aiAgentsBuilt)      : undefined,
    modelsExperimented: body.modelsExperimented  != null ? Number(body.modelsExperimented) : undefined,
    promptsEngineered:  body.promptsEngineered   != null ? Number(body.promptsEngineered)  : undefined,
    automationsCreated: body.automationsCreated  != null ? Number(body.automationsCreated) : undefined,
    mvpsBuilt:          body.mvpsBuilt           != null ? Number(body.mvpsBuilt)          : undefined,
    pocsCreated:        body.pocsCreated         != null ? Number(body.pocsCreated)        : undefined,
    systemDesignsDone:  body.systemDesignsDone   != null ? Number(body.systemDesignsDone)  : undefined,
    archDecisionsMade:  body.archDecisionsMade   != null ? Number(body.archDecisionsMade)  : undefined,
    notes:              body.notes               ?? undefined,
  };

  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));

  const log = await db.technicalLog.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, ...clean },
    update: clean,
  });

  return NextResponse.json(log);
}

export async function GET(req: NextRequest) {
  const userId = getUserId();
  const { searchParams } = new URL(req.url);
  const days = Number(searchParams.get("days") ?? "30");

  const since = startOfDay(new Date());
  since.setDate(since.getDate() - days);

  const logs = await db.technicalLog.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(logs);
}
