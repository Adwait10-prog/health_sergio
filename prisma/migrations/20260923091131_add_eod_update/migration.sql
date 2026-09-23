-- CreateTable
CREATE TABLE "EodUpdate" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "outcome" TEXT NOT NULL,
    "draft" TEXT NOT NULL,
    "final" TEXT,
    "streams" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EodUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EodUpdate_date_key" ON "EodUpdate"("date");
