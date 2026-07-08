-- CreateEnum
CREATE TYPE "AttachmentContext" AS ENUM ('ITEM_PHOTO', 'TRIP_VERIFICATION', 'CHAT', 'KYC', 'REVIEW');

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "ownerAccountId" TEXT NOT NULL,
    "context" "AttachmentContext" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Attachment_context_subjectId_idx" ON "Attachment"("context", "subjectId");

-- CreateIndex
CREATE INDEX "Attachment_ownerAccountId_idx" ON "Attachment"("ownerAccountId");

