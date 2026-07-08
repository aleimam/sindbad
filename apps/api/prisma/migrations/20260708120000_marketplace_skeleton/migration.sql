-- CreateEnum
CREATE TYPE "MissionKind" AS ENUM ('TRIP', 'SHIPMENT');

-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'EXPIRED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ShipmentKind" AS ENUM ('BOX', 'BASKET');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('REQUESTED', 'NEGOTIATING', 'ONGOING', 'ARRIVED_DESTINATION', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OngoingStep" AS ENUM ('ORDERED', 'SHIPPED', 'DELIVERED_TO_TRAVELER', 'RECEIVED_BY_TRAVELER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'IN_APP');

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "priceParam" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "groupEn" TEXT,
    "groupAr" TEXT,
    "typeMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "kind" "MissionKind" NOT NULL,
    "status" "MissionStatus" NOT NULL DEFAULT 'ACTIVE',
    "isCyclic" BOOLEAN NOT NULL DEFAULT false,
    "originCountryId" TEXT NOT NULL,
    "destinationCountryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "missionId" TEXT NOT NULL,
    "receivingStart" TIMESTAMP(3),
    "receivingEnd" TIMESTAMP(3) NOT NULL,
    "tripDate" TIMESTAMP(3) NOT NULL,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "deliveryLocation" TEXT NOT NULL,
    "receivingAddress" TEXT NOT NULL,
    "travelerCount" INTEGER NOT NULL DEFAULT 1,
    "availableWeightKg" DOUBLE PRECISION NOT NULL,
    "feeUsd" INTEGER,
    "notes" TEXT,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("missionId")
);

-- CreateTable
CREATE TABLE "TripCategory" (
    "missionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "TripCategory_pkey" PRIMARY KEY ("missionId","categoryId")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "missionId" TEXT NOT NULL,
    "type" "ShipmentKind" NOT NULL,
    "feeUsd" INTEGER,
    "notes" TEXT,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("missionId")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "url" TEXT,
    "volumetricWeightKg" DOUBLE PRECISION NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "categoryId" TEXT NOT NULL,
    "declaredValueUsd" INTEGER,
    "notes" TEXT,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "tripMissionId" TEXT NOT NULL,
    "shipmentMissionId" TEXT NOT NULL,
    "travelerAccountId" TEXT NOT NULL,
    "shopperAccountId" TEXT NOT NULL,
    "requestedByAccountId" TEXT NOT NULL,
    "lastOfferByAccountId" TEXT NOT NULL,
    "status" "DealStatus" NOT NULL DEFAULT 'REQUESTED',
    "ongoingStep" "OngoingStep",
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "feeUsd" INTEGER NOT NULL,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealEvent" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "type" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE INDEX "Mission_kind_status_originCountryId_destinationCountryId_idx" ON "Mission"("kind", "status", "originCountryId", "destinationCountryId");

-- CreateIndex
CREATE INDEX "Mission_accountId_idx" ON "Mission"("accountId");

-- CreateIndex
CREATE INDEX "Item_shipmentId_idx" ON "Item"("shipmentId");

-- CreateIndex
CREATE INDEX "Deal_travelerAccountId_idx" ON "Deal"("travelerAccountId");

-- CreateIndex
CREATE INDEX "Deal_shopperAccountId_idx" ON "Deal"("shopperAccountId");

-- CreateIndex
CREATE INDEX "Deal_status_idx" ON "Deal"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_tripMissionId_shipmentMissionId_key" ON "Deal"("tripMissionId", "shipmentMissionId");

-- CreateIndex
CREATE INDEX "DealEvent_dealId_idx" ON "DealEvent"("dealId");

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_originCountryId_fkey" FOREIGN KEY ("originCountryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_destinationCountryId_fkey" FOREIGN KEY ("destinationCountryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripCategory" ADD CONSTRAINT "TripCategory_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Trip"("missionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripCategory" ADD CONSTRAINT "TripCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("missionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_tripMissionId_fkey" FOREIGN KEY ("tripMissionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_shipmentMissionId_fkey" FOREIGN KEY ("shipmentMissionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_travelerAccountId_fkey" FOREIGN KEY ("travelerAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_shopperAccountId_fkey" FOREIGN KEY ("shopperAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealEvent" ADD CONSTRAINT "DealEvent_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

