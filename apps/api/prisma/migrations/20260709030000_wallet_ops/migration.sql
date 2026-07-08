-- CreateEnum
CREATE TYPE "DepositMethod" AS ENUM ('INSTAPAY', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('REQUESTED', 'PENDING_REVIEW', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING_OTP', 'SENT', 'CANCELLED');

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "DepositRequest" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "method" "DepositMethod" NOT NULL,
    "referenceCode" TEXT NOT NULL,
    "userReference" TEXT,
    "status" "DepositStatus" NOT NULL DEFAULT 'REQUESTED',
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepositRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "holderName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "iban" TEXT,
    "routingNumber" TEXT,
    "swift" TEXT,
    "holderAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WithdrawalRequest" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING_OTP',
    "otpChallengeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FxRate" (
    "id" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "usdToEgp" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FxRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DepositRequest_referenceCode_key" ON "DepositRequest"("referenceCode");

-- CreateIndex
CREATE INDEX "DepositRequest_status_idx" ON "DepositRequest"("status");

-- CreateIndex
CREATE INDEX "DepositRequest_accountId_idx" ON "DepositRequest"("accountId");

-- CreateIndex
CREATE INDEX "BankAccount_accountId_idx" ON "BankAccount"("accountId");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_status_idx" ON "WithdrawalRequest"("status");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_accountId_idx" ON "WithdrawalRequest"("accountId");

-- CreateIndex
CREATE INDEX "Transfer_fromAccountId_createdAt_idx" ON "Transfer"("fromAccountId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FxRate_day_key" ON "FxRate"("day");

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

