-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'EGP');

-- CreateEnum
CREATE TYPE "SystemAccount" AS ENUM ('ESCROW', 'GATEWAY_CLEARING', 'COMPANY_BANK', 'WITHDRAWALS_PAYABLE', 'PLATFORM_REVENUE', 'FX');

-- CreateEnum
CREATE TYPE "LedgerTxType" AS ENUM ('DEPOSIT', 'WITHDRAWAL_HOLD', 'WITHDRAWAL_EXECUTE', 'WITHDRAWAL_RELEASE', 'TRANSFER', 'ESCROW_FUND', 'ESCROW_RELEASE', 'ESCROW_REFUND', 'ESCROW_TOPUP', 'ADMIN_ADJUSTMENT', 'FX_CONVERT');

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "escrowedUsd" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletBalance" (
    "walletId" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "balanceMinor" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WalletBalance_pkey" PRIMARY KEY ("walletId","currency")
);

-- CreateTable
CREATE TABLE "LedgerTransaction" (
    "id" TEXT NOT NULL,
    "type" "LedgerTxType" NOT NULL,
    "dealId" TEXT,
    "actorUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "walletId" TEXT,
    "systemAccount" "SystemAccount",
    "currency" "Currency" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeConfig" (
    "id" TEXT NOT NULL DEFAULT 'GLOBAL',
    "basketMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.3,
    "weightUsdPerKg" INTEGER NOT NULL DEFAULT 300,
    "floorFeeUsd" INTEGER NOT NULL DEFAULT 500,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_accountId_key" ON "Wallet"("accountId");

-- CreateIndex
CREATE INDEX "LedgerTransaction_dealId_idx" ON "LedgerTransaction"("dealId");

-- CreateIndex
CREATE INDEX "LedgerTransaction_type_createdAt_idx" ON "LedgerTransaction"("type", "createdAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_walletId_createdAt_idx" ON "LedgerEntry"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_systemAccount_currency_idx" ON "LedgerEntry"("systemAccount", "currency");

-- AddForeignKey
ALTER TABLE "WalletBalance" ADD CONSTRAINT "WalletBalance_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "LedgerTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

