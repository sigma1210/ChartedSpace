-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currentTurn" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "Ship" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "jumpRating" INTEGER NOT NULL,
    "isMortgaged" BOOLEAN NOT NULL DEFAULT true,
    "mortgagePaid" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'docked',
    "sheet" JSONB,
    "currentWorldId" TEXT,
    "destinationWorldId" TEXT,
    "jumpArrivesTurn" INTEGER,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipCrew" (
    "id" TEXT NOT NULL,
    "shipId" TEXT NOT NULL,
    "characterId" TEXT,
    "npcName" TEXT,
    "role" TEXT NOT NULL,
    "isOwnerOperator" BOOLEAN NOT NULL DEFAULT false,
    "monthlySalary" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShipCrew_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipPassenger" (
    "id" TEXT NOT NULL,
    "shipId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "passage" TEXT NOT NULL,

    CONSTRAINT "ShipPassenger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CargoLot" (
    "id" TEXT NOT NULL,
    "shipId" TEXT NOT NULL,
    "commodity" TEXT NOT NULL,
    "tons" INTEGER NOT NULL,
    "purchasePrice" INTEGER NOT NULL,
    "originWorldId" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CargoLot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ship_userId_key" ON "Ship"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ShipCrew_characterId_key" ON "ShipCrew"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "ShipPassenger_characterId_key" ON "ShipPassenger"("characterId");

-- AddForeignKey
ALTER TABLE "Ship" ADD CONSTRAINT "Ship_currentWorldId_fkey" FOREIGN KEY ("currentWorldId") REFERENCES "World"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ship" ADD CONSTRAINT "Ship_destinationWorldId_fkey" FOREIGN KEY ("destinationWorldId") REFERENCES "World"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ship" ADD CONSTRAINT "Ship_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipCrew" ADD CONSTRAINT "ShipCrew_shipId_fkey" FOREIGN KEY ("shipId") REFERENCES "Ship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipCrew" ADD CONSTRAINT "ShipCrew_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipPassenger" ADD CONSTRAINT "ShipPassenger_shipId_fkey" FOREIGN KEY ("shipId") REFERENCES "Ship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipPassenger" ADD CONSTRAINT "ShipPassenger_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargoLot" ADD CONSTRAINT "CargoLot_shipId_fkey" FOREIGN KEY ("shipId") REFERENCES "Ship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargoLot" ADD CONSTRAINT "CargoLot_originWorldId_fkey" FOREIGN KEY ("originWorldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
