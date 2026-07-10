-- CreateEnum
CREATE TYPE "PaymentGatewayProvider" AS ENUM ('KASHIER', 'OPAY');

-- AlterEnum
ALTER TYPE "DepositMethod" ADD VALUE 'CARD';

-- AlterTable
ALTER TABLE "DepositRequest" ADD COLUMN     "gateway" "PaymentGatewayProvider",
ADD COLUMN     "gatewayRef" TEXT;

