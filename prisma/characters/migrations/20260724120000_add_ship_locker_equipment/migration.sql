CREATE TABLE "ShipLockerItem" (
    "id" TEXT NOT NULL,
    "shipId" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "purchasePrice" INTEGER NOT NULL,
    "purchasedAtTurn" INTEGER NOT NULL,
    "purchasedAtLocation" TEXT NOT NULL,
    "purchaserCrewId" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipLockerItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EquipmentAvailabilityAttempt" (
    "id" TEXT NOT NULL,
    "shipId" TEXT NOT NULL,
    "purchaserCrewId" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "worldLocation" TEXT NOT NULL,
    "attemptedTurn" INTEGER NOT NULL,
    "succeeded" BOOLEAN NOT NULL,
    "priceMultiplier" INTEGER NOT NULL,
    "rawRoll" INTEGER NOT NULL,
    "totalModifier" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentAvailabilityAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShipLockerItem_shipId_idx" ON "ShipLockerItem"("shipId");
CREATE INDEX "ShipLockerItem_shipId_catalogItemId_idx" ON "ShipLockerItem"("shipId", "catalogItemId");
CREATE INDEX "EquipmentAvailabilityAttempt_shipId_purchaserCrewId_catalogItemId_worldLocation_attemptedTurn_idx"
ON "EquipmentAvailabilityAttempt"("shipId", "purchaserCrewId", "catalogItemId", "worldLocation", "attemptedTurn");
