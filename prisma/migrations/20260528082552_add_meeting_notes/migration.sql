-- CreateTable
CREATE TABLE "MeetingNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "attendees" TEXT,
    "summary" TEXT,
    "decisions" TEXT,
    "actionItems" TEXT,
    "rawTranscript" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeetingNote_userId_date_idx" ON "MeetingNote"("userId", "date");

-- AddForeignKey
ALTER TABLE "MeetingNote" ADD CONSTRAINT "MeetingNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
