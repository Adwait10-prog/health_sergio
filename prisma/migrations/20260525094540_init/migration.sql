-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DailyLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "weightKg" REAL,
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
    "waterL" REAL,
    "alcoholUnits" INTEGER,
    "disciplineScore" REAL,
    "momentumScore" REAL,
    "notes" TEXT,
    "loggedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TechnicalLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
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
    "loggedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TechnicalLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FounderLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
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
    "loggedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FounderLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinanceLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "salaryInr" REAL,
    "freelanceInr" REAL,
    "sideProjectInr" REAL,
    "investmentReturnsInr" REAL,
    "netWorthInr" REAL,
    "savingsInr" REAL,
    "monthlySavingsInr" REAL,
    "sipContributionsInr" REAL,
    "emergencyFundMonths" REAL,
    "liquidCashInr" REAL,
    "equityPortfolioInr" REAL,
    "goldInr" REAL,
    "mutualFundsInr" REAL,
    "cagrPct" REAL,
    "passiveIncomeInr" REAL,
    "personalRunwayMonths" REAL,
    "burnRateInr" REAL,
    "startupCapitalInr" REAL,
    "fiProgressPct" REAL,
    "notes" TEXT,
    "loggedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reflection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
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
    "loggedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reflection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonthlyReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "leadershipScore" INTEGER,
    "confidenceScore" INTEGER,
    "communicationScore" INTEGER,
    "technicalDepthScore" INTEGER,
    "decisionMakingScore" INTEGER,
    "disciplineScore" INTEGER,
    "ctoScore" REAL,
    "founderScore" REAL,
    "overallScore" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MonthlyReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "section" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'todo',
    "dueDate" DATETIME,
    "doneAt" DATETIME,
    "isToday" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClaudeAdjustment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "briefSent" TEXT NOT NULL,
    "responseRaw" TEXT NOT NULL,
    "responseJson" TEXT,
    "appliedChanges" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClaudeAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
