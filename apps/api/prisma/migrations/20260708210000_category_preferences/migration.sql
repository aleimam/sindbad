-- CreateEnum
CREATE TYPE "CategoryStance" AS ENUM ('ACCEPT', 'REJECT', 'ASK');

-- AlterTable
ALTER TABLE "TripCategory" ADD COLUMN     "stance" "CategoryStance" NOT NULL DEFAULT 'ACCEPT';

-- CreateTable
CREATE TABLE "CategoryPreference" (
    "accountId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "stance" "CategoryStance" NOT NULL,

    CONSTRAINT "CategoryPreference_pkey" PRIMARY KEY ("accountId","categoryId")
);

-- AddForeignKey
ALTER TABLE "CategoryPreference" ADD CONSTRAINT "CategoryPreference_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryPreference" ADD CONSTRAINT "CategoryPreference_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

