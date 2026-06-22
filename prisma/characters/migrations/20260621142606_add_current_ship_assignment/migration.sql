-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "currentShipId" TEXT,
ADD COLUMN     "currentShipRole" TEXT;

-- CreateIndex
CREATE INDEX "Character_currentShipId_idx" ON "Character"("currentShipId");
