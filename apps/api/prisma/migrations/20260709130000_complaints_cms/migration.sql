-- CreateEnum
CREATE TYPE "ComplaintTarget" AS ENUM ('REQUEST', 'DEAL', 'CHAT', 'REVIEW');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('NEW', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ModerationKind" AS ENUM ('DEDUCT_CREDIBILITY', 'HOLD_MEMBERSHIP', 'BLOCK');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "holdUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "raisedByAccountId" TEXT NOT NULL,
    "targetType" "ComplaintTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'NEW',
    "decision" TEXT,
    "assignedUserId" TEXT,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationAction" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT,
    "accountId" TEXT NOT NULL,
    "kind" "ModerationKind" NOT NULL,
    "points" INTEGER,
    "holdUntil" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "byUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaticPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "bodyAr" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "systemPage" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaticPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Complaint_status_idx" ON "Complaint"("status");

-- CreateIndex
CREATE INDEX "Complaint_raisedByAccountId_idx" ON "Complaint"("raisedByAccountId");

-- CreateIndex
CREATE INDEX "ModerationAction_accountId_idx" ON "ModerationAction"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "StaticPage_slug_key" ON "StaticPage"("slug");

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

