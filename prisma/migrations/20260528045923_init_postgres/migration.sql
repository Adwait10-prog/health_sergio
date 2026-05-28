-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "sleepMin" INTEGER,
    "rhrBpm" INTEGER,
    "energyLevel" INTEGER,
    "stressLevel" INTEGER,
    "moodScore" INTEGER,
    "anxietyLevel" INTEGER,
    "didWorkout" BOOLEAN NOT NULL DEFAULT false,
    "didRead" BOOLEAN NOT NULL DEFAULT false,
    "didCode" BOOLEAN NOT NULL DEFAULT false,
    "didJournal" BOOLEAN NOT NULL DEFAULT false,
    "didMeditate" BOOLEAN NOT NULL DEFAULT false,
    "didNetwork" BOOLEAN NOT NULL DEFAULT false,
    "didLearn" BOOLEAN NOT NULL DEFAULT false,
    "deepWorkMin" INTEGER,
    "distractionCount" INTEGER,
    "tasksPlanned" INTEGER,
    "tasksCompleted" INTEGER,
    "kcal" INTEGER,
    "proteinG" INTEGER,
    "waterL" DOUBLE PRECISION,
    "alcoholUnits" INTEGER,
    "disciplineScore" DOUBLE PRECISION,
    "momentumScore" DOUBLE PRECISION,
    "vo2MaxMlKgMin" DOUBLE PRECISION,
    "hrvMs" INTEGER,
    "notes" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicalLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hoursCodedMin" INTEGER,
    "featuresShipped" INTEGER,
    "bugsFixed" INTEGER,
    "apisIntegrated" INTEGER,
    "codeReviewsDone" INTEGER,
    "prsOpened" INTEGER,
    "prsMerged" INTEGER,
    "aiAgentsBuilt" INTEGER,
    "modelsExperimented" INTEGER,
    "promptsEngineered" INTEGER,
    "automationsCreated" INTEGER,
    "mvpsBuilt" INTEGER,
    "pocsCreated" INTEGER,
    "userFeedbackItems" INTEGER,
    "systemDesignsDone" INTEGER,
    "archDecisionsMade" INTEGER,
    "notes" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TechnicalLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FounderLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "newPeopleMet" INTEGER,
    "highValueConnections" INTEGER,
    "followUpsDone" INTEGER,
    "coffeeChats" INTEGER,
    "eventsAttended" INTEGER,
    "linkedinFollowers" INTEGER,
    "linkedinImpressions" INTEGER,
    "linkedinPosts" INTEGER,
    "ideasResearched" INTEGER,
    "validationCalls" INTEGER,
    "competitorAnalyses" INTEGER,
    "pitchesPrepared" INTEGER,
    "investorOutreach" INTEGER,
    "cofoundersMet" INTEGER,
    "advisorsAdded" INTEGER,
    "partnershipsExplored" INTEGER,
    "notes" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FounderLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "salaryInr" DOUBLE PRECISION,
    "freelanceInr" DOUBLE PRECISION,
    "sideProjectInr" DOUBLE PRECISION,
    "investmentReturnsInr" DOUBLE PRECISION,
    "netWorthInr" DOUBLE PRECISION,
    "savingsInr" DOUBLE PRECISION,
    "monthlySavingsInr" DOUBLE PRECISION,
    "sipContributionsInr" DOUBLE PRECISION,
    "emergencyFundMonths" DOUBLE PRECISION,
    "liquidCashInr" DOUBLE PRECISION,
    "equityPortfolioInr" DOUBLE PRECISION,
    "goldInr" DOUBLE PRECISION,
    "mutualFundsInr" DOUBLE PRECISION,
    "cagrPct" DOUBLE PRECISION,
    "passiveIncomeInr" DOUBLE PRECISION,
    "personalRunwayMonths" DOUBLE PRECISION,
    "burnRateInr" DOUBLE PRECISION,
    "startupCapitalInr" DOUBLE PRECISION,
    "fiProgressPct" DOUBLE PRECISION,
    "notes" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reflection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "journalText" TEXT,
    "lessonsLearned" TEXT,
    "gratitudeItems" TEXT,
    "weeklyWins" TEXT,
    "weeklyMisses" TEXT,
    "nextWeekFocus" TEXT,
    "weeklyScore" INTEGER,
    "amProudScore" INTEGER,
    "goalAlignPct" INTEGER,
    "identityActions" INTEGER,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reflection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "leadershipScore" INTEGER,
    "confidenceScore" INTEGER,
    "communicationScore" INTEGER,
    "technicalDepthScore" INTEGER,
    "decisionMakingScore" INTEGER,
    "disciplineScore" INTEGER,
    "ctoScore" DOUBLE PRECISION,
    "founderScore" DOUBLE PRECISION,
    "overallScore" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "section" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'todo',
    "dueDate" TIMESTAMP(3),
    "doneAt" TIMESTAMP(3),
    "isToday" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaudeAdjustment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "briefSent" TEXT NOT NULL,
    "responseRaw" TEXT NOT NULL,
    "responseJson" TEXT,
    "appliedChanges" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaudeAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StravaToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StravaToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StravaActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stravaId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "distanceM" DOUBLE PRECISION,
    "movingTimeSec" INTEGER,
    "elapsedTimeSec" INTEGER,
    "totalElevationM" DOUBLE PRECISION,
    "avgSpeedMps" DOUBLE PRECISION,
    "avgHeartRate" INTEGER,
    "maxHeartRate" INTEGER,
    "calories" INTEGER,
    "kudosCount" INTEGER,
    "sufferScore" INTEGER,
    "rawJson" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StravaActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DailyLog_userId_date_key" ON "DailyLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TechnicalLog_userId_date_key" ON "TechnicalLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "FounderLog_userId_date_key" ON "FounderLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceLog_userId_date_key" ON "FinanceLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Reflection_userId_date_type_key" ON "Reflection"("userId", "date", "type");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyReview_userId_month_key" ON "MonthlyReview"("userId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "StravaToken_userId_key" ON "StravaToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StravaActivity_stravaId_key" ON "StravaActivity"("stravaId");

-- CreateIndex
CREATE INDEX "StravaActivity_userId_date_idx" ON "StravaActivity"("userId", "date");

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalLog" ADD CONSTRAINT "TechnicalLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FounderLog" ADD CONSTRAINT "FounderLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceLog" ADD CONSTRAINT "FinanceLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reflection" ADD CONSTRAINT "Reflection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyReview" ADD CONSTRAINT "MonthlyReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaudeAdjustment" ADD CONSTRAINT "ClaudeAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StravaToken" ADD CONSTRAINT "StravaToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StravaActivity" ADD CONSTRAINT "StravaActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
