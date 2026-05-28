-- CreateTable
CREATE TABLE "HMSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weekNum" INTEGER NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetKm" DOUBLE PRECISION,
    "targetMin" INTEGER,
    "notes" TEXT,
    "isCutback" BOOLEAN NOT NULL DEFAULT false,
    "isModified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "HMSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HMSessionLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "actualKm" DOUBLE PRECISION,
    "actualMin" INTEGER,
    "avgHr" INTEGER,
    "effort" INTEGER,
    "notes" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HMSessionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HMSession_userId_date_idx" ON "HMSession"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "HMSession_userId_date_key" ON "HMSession"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "HMSessionLog_sessionId_key" ON "HMSessionLog"("sessionId");

-- AddForeignKey
ALTER TABLE "HMSession" ADD CONSTRAINT "HMSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HMSessionLog" ADD CONSTRAINT "HMSessionLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "HMSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HMSessionLog" ADD CONSTRAINT "HMSessionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
