import "dotenv/config";
import Database from "better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import path from "path";

neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const neon = new PrismaClient({ adapter } as any);

const sqlite = new Database(path.resolve("dev.db"));

const OLD_USER_ID = "cmpl0wwzj0000m6udvmzhtye8";
const NEW_USER_ID = "cmpp0y8w5000079ud7xk10bzn";

function remap(row: Record<string, unknown>) {
  const r = { ...row };
  if (r.userId === OLD_USER_ID) r.userId = NEW_USER_ID;
  return r;
}

async function main() {
  console.log("Starting migration from SQLite → Neon...\n");

  // DailyLog
  const dailyLogs = sqlite.prepare("SELECT * FROM DailyLog").all() as Record<string, unknown>[];
  for (const row of dailyLogs) {
    const r = remap(row);
    await neon.dailyLog.upsert({
      where: { userId_date: { userId: r.userId as string, date: new Date(r.date as string) } },
      create: {
        id: r.id as string,
        userId: r.userId as string,
        date: new Date(r.date as string),
        weightKg: r.weightKg as number | null,
        sleepMin: r.sleepMin as number | null,
        rhrBpm: r.rhrBpm as number | null,
        energyLevel: r.energyLevel as number | null,
        stressLevel: r.stressLevel as number | null,
        moodScore: r.moodScore as number | null,
        anxietyLevel: r.anxietyLevel as number | null,
        didWorkout: Boolean(r.didWorkout),
        didRead: Boolean(r.didRead),
        didCode: Boolean(r.didCode),
        didJournal: Boolean(r.didJournal),
        didMeditate: Boolean(r.didMeditate),
        didNetwork: Boolean(r.didNetwork),
        didLearn: Boolean(r.didLearn),
        deepWorkMin: r.deepWorkMin as number | null,
        distractionCount: r.distractionCount as number | null,
        tasksPlanned: r.tasksPlanned as number | null,
        tasksCompleted: r.tasksCompleted as number | null,
        kcal: r.kcal as number | null,
        proteinG: r.proteinG as number | null,
        waterL: r.waterL as number | null,
        alcoholUnits: r.alcoholUnits as number | null,
        disciplineScore: r.disciplineScore as number | null,
        momentumScore: r.momentumScore as number | null,
        vo2MaxMlKgMin: r.vo2MaxMlKgMin as number | null,
        hrvMs: r.hrvMs as number | null,
        notes: r.notes as string | null,
        loggedAt: new Date(r.loggedAt as string),
      },
      update: {},
    });
  }
  console.log(`✓ DailyLog: ${dailyLogs.length} rows`);

  // Reflection
  const reflections = sqlite.prepare("SELECT * FROM Reflection").all() as Record<string, unknown>[];
  for (const row of reflections) {
    const r = remap(row);
    await neon.reflection.upsert({
      where: { userId_date_type: { userId: r.userId as string, date: new Date(r.date as string), type: r.type as string } },
      create: {
        id: r.id as string,
        userId: r.userId as string,
        date: new Date(r.date as string),
        type: r.type as string,
        journalText: r.journalText as string | null,
        lessonsLearned: r.lessonsLearned as string | null,
        gratitudeItems: r.gratitudeItems as string | null,
        weeklyWins: r.weeklyWins as string | null,
        weeklyMisses: r.weeklyMisses as string | null,
        nextWeekFocus: r.nextWeekFocus as string | null,
        weeklyScore: r.weeklyScore as number | null,
        amProudScore: r.amProudScore as number | null,
        goalAlignPct: r.goalAlignPct as number | null,
        identityActions: r.identityActions as number | null,
        loggedAt: new Date(r.loggedAt as string),
      },
      update: {},
    });
  }
  console.log(`✓ Reflection: ${reflections.length} rows`);

  // TechnicalLog
  const techLogs = sqlite.prepare("SELECT * FROM TechnicalLog").all() as Record<string, unknown>[];
  for (const row of techLogs) {
    const r = remap(row);
    await neon.technicalLog.upsert({
      where: { userId_date: { userId: r.userId as string, date: new Date(r.date as string) } },
      create: {
        id: r.id as string,
        userId: r.userId as string,
        date: new Date(r.date as string),
        hoursCodedMin: r.hoursCodedMin as number | null,
        featuresShipped: r.featuresShipped as number | null,
        bugsFixed: r.bugsFixed as number | null,
        apisIntegrated: r.apisIntegrated as number | null,
        codeReviewsDone: r.codeReviewsDone as number | null,
        prsOpened: r.prsOpened as number | null,
        prsMerged: r.prsMerged as number | null,
        aiAgentsBuilt: r.aiAgentsBuilt as number | null,
        modelsExperimented: r.modelsExperimented as number | null,
        promptsEngineered: r.promptsEngineered as number | null,
        automationsCreated: r.automationsCreated as number | null,
        mvpsBuilt: r.mvpsBuilt as number | null,
        pocsCreated: r.pocsCreated as number | null,
        userFeedbackItems: r.userFeedbackItems as number | null,
        systemDesignsDone: r.systemDesignsDone as number | null,
        archDecisionsMade: r.archDecisionsMade as number | null,
        notes: r.notes as string | null,
        loggedAt: new Date(r.loggedAt as string),
      },
      update: {},
    });
  }
  console.log(`✓ TechnicalLog: ${techLogs.length} rows`);

  // FounderLog
  const founderLogs = sqlite.prepare("SELECT * FROM FounderLog").all() as Record<string, unknown>[];
  for (const row of founderLogs) {
    const r = remap(row);
    await neon.founderLog.upsert({
      where: { userId_date: { userId: r.userId as string, date: new Date(r.date as string) } },
      create: {
        id: r.id as string,
        userId: r.userId as string,
        date: new Date(r.date as string),
        newPeopleMet: r.newPeopleMet as number | null,
        highValueConnections: r.highValueConnections as number | null,
        followUpsDone: r.followUpsDone as number | null,
        coffeeChats: r.coffeeChats as number | null,
        eventsAttended: r.eventsAttended as number | null,
        linkedinFollowers: r.linkedinFollowers as number | null,
        linkedinImpressions: r.linkedinImpressions as number | null,
        linkedinPosts: r.linkedinPosts as number | null,
        ideasResearched: r.ideasResearched as number | null,
        validationCalls: r.validationCalls as number | null,
        competitorAnalyses: r.competitorAnalyses as number | null,
        pitchesPrepared: r.pitchesPrepared as number | null,
        investorOutreach: r.investorOutreach as number | null,
        cofoundersMet: r.cofoundersMet as number | null,
        advisorsAdded: r.advisorsAdded as number | null,
        partnershipsExplored: r.partnershipsExplored as number | null,
        notes: r.notes as string | null,
        loggedAt: new Date(r.loggedAt as string),
      },
      update: {},
    });
  }
  console.log(`✓ FounderLog: ${founderLogs.length} rows`);

  // FinanceLog
  const financeLogs = sqlite.prepare("SELECT * FROM FinanceLog").all() as Record<string, unknown>[];
  for (const row of financeLogs) {
    const r = remap(row);
    await neon.financeLog.upsert({
      where: { userId_date: { userId: r.userId as string, date: new Date(r.date as string) } },
      create: {
        id: r.id as string,
        userId: r.userId as string,
        date: new Date(r.date as string),
        salaryInr: r.salaryInr as number | null,
        freelanceInr: r.freelanceInr as number | null,
        sideProjectInr: r.sideProjectInr as number | null,
        investmentReturnsInr: r.investmentReturnsInr as number | null,
        netWorthInr: r.netWorthInr as number | null,
        savingsInr: r.savingsInr as number | null,
        monthlySavingsInr: r.monthlySavingsInr as number | null,
        sipContributionsInr: r.sipContributionsInr as number | null,
        emergencyFundMonths: r.emergencyFundMonths as number | null,
        liquidCashInr: r.liquidCashInr as number | null,
        equityPortfolioInr: r.equityPortfolioInr as number | null,
        goldInr: r.goldInr as number | null,
        mutualFundsInr: r.mutualFundsInr as number | null,
        cagrPct: r.cagrPct as number | null,
        passiveIncomeInr: r.passiveIncomeInr as number | null,
        personalRunwayMonths: r.personalRunwayMonths as number | null,
        burnRateInr: r.burnRateInr as number | null,
        startupCapitalInr: r.startupCapitalInr as number | null,
        fiProgressPct: r.fiProgressPct as number | null,
        notes: r.notes as string | null,
        loggedAt: new Date(r.loggedAt as string),
      },
      update: {},
    });
  }
  console.log(`✓ FinanceLog: ${financeLogs.length} rows`);

  // Task
  const tasks = sqlite.prepare("SELECT * FROM Task").all() as Record<string, unknown>[];
  for (const row of tasks) {
    const r = remap(row);
    await neon.task.upsert({
      where: { id: r.id as string },
      create: {
        id: r.id as string,
        userId: r.userId as string,
        title: r.title as string,
        description: r.description as string | null,
        section: r.section as string,
        priority: r.priority as string,
        status: r.status as string,
        dueDate: r.dueDate ? new Date(r.dueDate as string) : null,
        doneAt: r.doneAt ? new Date(r.doneAt as string) : null,
        isToday: Boolean(r.isToday),
        createdAt: new Date(r.createdAt as string),
        updatedAt: new Date(r.updatedAt as string),
      },
      update: {},
    });
  }
  console.log(`✓ Task: ${tasks.length} rows`);

  // StravaToken
  const stravaTokens = sqlite.prepare("SELECT * FROM StravaToken").all() as Record<string, unknown>[];
  for (const row of stravaTokens) {
    const r = remap(row);
    await neon.stravaToken.upsert({
      where: { userId: r.userId as string },
      create: {
        id: r.id as string,
        userId: r.userId as string,
        accessToken: r.accessToken as string,
        refreshToken: r.refreshToken as string,
        expiresAt: r.expiresAt as number,
        updatedAt: new Date(r.updatedAt as string),
      },
      update: {
        accessToken: r.accessToken as string,
        refreshToken: r.refreshToken as string,
        expiresAt: r.expiresAt as number,
      },
    });
  }
  console.log(`✓ StravaToken: ${stravaTokens.length} rows`);

  // StravaActivity
  const stravaActivities = sqlite.prepare("SELECT * FROM StravaActivity").all() as Record<string, unknown>[];
  for (const row of stravaActivities) {
    const r = remap(row);
    await neon.stravaActivity.upsert({
      where: { stravaId: r.stravaId as string },
      create: {
        id: r.id as string,
        userId: r.userId as string,
        stravaId: r.stravaId as string,
        date: new Date(r.date as string),
        name: r.name as string,
        type: r.type as string,
        distanceM: r.distanceM as number | null,
        movingTimeSec: r.movingTimeSec as number | null,
        elapsedTimeSec: r.elapsedTimeSec as number | null,
        totalElevationM: r.totalElevationM as number | null,
        avgSpeedMps: r.avgSpeedMps as number | null,
        avgHeartRate: r.avgHeartRate as number | null,
        maxHeartRate: r.maxHeartRate as number | null,
        calories: r.calories as number | null,
        kudosCount: r.kudosCount as number | null,
        sufferScore: r.sufferScore as number | null,
        rawJson: r.rawJson as string,
        syncedAt: new Date(r.syncedAt as string),
      },
      update: {},
    });
  }
  console.log(`✓ StravaActivity: ${stravaActivities.length} rows`);

  console.log("\n✅ Migration complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => { neon.$disconnect(); sqlite.close(); });
