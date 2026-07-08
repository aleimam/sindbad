-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NEW', 'STUDYING', 'VERIFIED', 'NEEDS_REVIEW', 'REJECTED');

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "credibilityScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "credibilityTier" TEXT NOT NULL DEFAULT 'NEW',
ADD COLUMN     "flaggedForBlock" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "VerificationType" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "priceUsd" INTEGER NOT NULL DEFAULT 0,
    "credibilityPoints" INTEGER NOT NULL DEFAULT 5,
    "durationDays" INTEGER NOT NULL DEFAULT 3,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "details" TEXT,
    "socialCode" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'NEW',
    "points" INTEGER NOT NULL DEFAULT 0,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CredibilityEvent" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "timeWeighted" BOOLEAN NOT NULL DEFAULT true,
    "refId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CredibilityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationType_key_key" ON "VerificationType"("key");

-- CreateIndex
CREATE INDEX "Verification_accountId_idx" ON "Verification"("accountId");

-- CreateIndex
CREATE INDEX "Verification_status_idx" ON "Verification"("status");

-- CreateIndex
CREATE INDEX "CredibilityEvent_accountId_createdAt_idx" ON "CredibilityEvent"("accountId", "createdAt");

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "VerificationType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredibilityEvent" ADD CONSTRAINT "CredibilityEvent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

