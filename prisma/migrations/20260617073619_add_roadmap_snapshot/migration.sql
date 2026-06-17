-- CreateTable
CREATE TABLE "RoadmapSnapshot" (
    "id" TEXT NOT NULL,
    "themeId" INTEGER NOT NULL,
    "completedPct" INTEGER NOT NULL,
    "totalTickets" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoadmapSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoadmapSnapshot_themeId_capturedAt_idx" ON "RoadmapSnapshot"("themeId", "capturedAt");
