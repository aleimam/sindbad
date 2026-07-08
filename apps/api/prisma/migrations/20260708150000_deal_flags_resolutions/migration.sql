-- CreateEnum
CREATE TYPE "DealFlagType" AS ENUM ('DELAYED', 'CUSTOMS', 'PARTIALLY');

-- CreateEnum
CREATE TYPE "PartialProblem" AS ENUM ('LOST_DAMAGED', 'DELAYED');

-- CreateEnum
CREATE TYPE "ResolutionStatus" AS ENUM ('PROPOSED', 'APPROVED');

-- CreateEnum
CREATE TYPE "CancellationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "travelerPaysAllCustoms" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "DealFlag" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "type" "DealFlagType" NOT NULL,
    "problem" "PartialProblem",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedAt" TIMESTAMP(3),

    CONSTRAINT "DealFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealResolution" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "proposedByAccountId" TEXT NOT NULL,
    "status" "ResolutionStatus" NOT NULL DEFAULT 'PROPOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealResolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CancellationRequest" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "requestedByAccountId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "CancellationStatus" NOT NULL DEFAULT 'PENDING',
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CancellationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DealFlag_dealId_type_key" ON "DealFlag"("dealId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "DealResolution_dealId_key" ON "DealResolution"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "CancellationRequest_dealId_key" ON "CancellationRequest"("dealId");

-- CreateIndex
CREATE INDEX "CancellationRequest_status_idx" ON "CancellationRequest"("status");

-- AddForeignKey
ALTER TABLE "DealFlag" ADD CONSTRAINT "DealFlag_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealResolution" ADD CONSTRAINT "DealResolution_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancellationRequest" ADD CONSTRAINT "CancellationRequest_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

