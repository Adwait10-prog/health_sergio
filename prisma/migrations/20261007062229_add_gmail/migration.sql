-- CreateTable
CREATE TABLE "GoogleToken" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "refreshToken" TEXT NOT NULL,
    "scope" TEXT,
    "email" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "fromName" TEXT,
    "fromEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "body" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "unread" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT,
    "summary" TEXT,
    "digestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailMessage_receivedAt_idx" ON "EmailMessage"("receivedAt");

-- CreateIndex
CREATE INDEX "EmailMessage_digestedAt_idx" ON "EmailMessage"("digestedAt");
