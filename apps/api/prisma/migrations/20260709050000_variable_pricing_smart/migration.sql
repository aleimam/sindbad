-- CreateEnum
CREATE TYPE "PricingMode" AS ENUM ('FIXED', 'VARIABLE');

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "actualPriceUsd" INTEGER,
ADD COLUMN     "pricingMode" "PricingMode";

-- CreateTable
CREATE TABLE "FeeConfigProposal" (
    "id" TEXT NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "ratio" DOUBLE PRECISION NOT NULL,
    "proposed" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeConfigProposal_pkey" PRIMARY KEY ("id")
);

