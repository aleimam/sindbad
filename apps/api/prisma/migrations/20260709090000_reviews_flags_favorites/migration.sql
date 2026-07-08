-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'REVEALED');

-- CreateEnum
CREATE TYPE "UserFlagKind" AS ENUM ('OUTSTANDING', 'FOLLOW', 'BLOCK');

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "authorAccountId" TEXT NOT NULL,
    "targetAccountId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFlag" (
    "ownerAccountId" TEXT NOT NULL,
    "targetAccountId" TEXT NOT NULL,
    "kind" "UserFlagKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFlag_pkey" PRIMARY KEY ("ownerAccountId","targetAccountId")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "ownerAccountId" TEXT NOT NULL,
    "targetAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("ownerAccountId","targetAccountId")
);

-- CreateIndex
CREATE INDEX "Review_targetAccountId_status_idx" ON "Review"("targetAccountId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Review_dealId_authorAccountId_key" ON "Review"("dealId", "authorAccountId");

-- CreateIndex
CREATE INDEX "UserFlag_targetAccountId_kind_idx" ON "UserFlag"("targetAccountId", "kind");

