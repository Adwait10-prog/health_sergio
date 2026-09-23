-- CreateTable
CREATE TABLE "OsChecklistItem" (
    "id" TEXT NOT NULL,
    "listKey" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OsChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OsNote" (
    "key" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OsNote_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "OsChecklistItem_listKey_itemId_key" ON "OsChecklistItem"("listKey", "itemId");
