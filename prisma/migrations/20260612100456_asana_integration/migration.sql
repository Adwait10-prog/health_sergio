-- CreateTable
CREATE TABLE "AsanaProject" (
    "id" TEXT NOT NULL,
    "asanaGid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "isTracked" BOOLEAN NOT NULL DEFAULT true,
    "workspaceGid" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AsanaProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsanaTask" (
    "id" TEXT NOT NULL,
    "asanaGid" TEXT NOT NULL,
    "projectGid" TEXT,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "assigneeGid" TEXT,
    "assigneeName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'incomplete',
    "completedAt" TIMESTAMP(3),
    "dueOn" TEXT,
    "sectionName" TEXT,
    "parentGid" TEXT,
    "permalink" TEXT,
    "isModifiedByBot" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AsanaTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsanaMember" (
    "id" TEXT NOT NULL,
    "asanaGid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "inStandup" BOOLEAN NOT NULL DEFAULT false,
    "workspaceGid" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AsanaMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsanaWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "resourceGid" TEXT NOT NULL,
    "projectGid" TEXT,
    "rawPayload" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AsanaWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AsanaProject_asanaGid_key" ON "AsanaProject"("asanaGid");

-- CreateIndex
CREATE UNIQUE INDEX "AsanaTask_asanaGid_key" ON "AsanaTask"("asanaGid");

-- CreateIndex
CREATE INDEX "AsanaTask_projectGid_idx" ON "AsanaTask"("projectGid");

-- CreateIndex
CREATE INDEX "AsanaTask_assigneeGid_idx" ON "AsanaTask"("assigneeGid");

-- CreateIndex
CREATE INDEX "AsanaTask_status_idx" ON "AsanaTask"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AsanaMember_asanaGid_key" ON "AsanaMember"("asanaGid");

-- CreateIndex
CREATE INDEX "AsanaWebhookEvent_processed_idx" ON "AsanaWebhookEvent"("processed");

-- CreateIndex
CREATE INDEX "AsanaWebhookEvent_resourceGid_idx" ON "AsanaWebhookEvent"("resourceGid");

-- AddForeignKey
ALTER TABLE "AsanaTask" ADD CONSTRAINT "AsanaTask_projectGid_fkey" FOREIGN KEY ("projectGid") REFERENCES "AsanaProject"("asanaGid") ON DELETE SET NULL ON UPDATE CASCADE;
