/*
  Warnings:

  - You are about to drop the column `originWorldId` on the `CargoLot` table. All the data in the column will be lost.
  - You are about to drop the column `currentWorldId` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `worldId` on the `LocationLog` table. All the data in the column will be lost.
  - You are about to drop the column `currentWorldId` on the `Ship` table. All the data in the column will be lost.
  - You are about to drop the column `destinationWorldId` on the `Ship` table. All the data in the column will be lost.
  - Made the column `location` on table `LocationLog` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "CargoLot" DROP CONSTRAINT "CargoLot_originWorldId_fkey";

-- DropForeignKey
ALTER TABLE "Character" DROP CONSTRAINT "Character_currentWorldId_fkey";

-- DropForeignKey
ALTER TABLE "LocationLog" DROP CONSTRAINT "LocationLog_worldId_fkey";

-- DropForeignKey
ALTER TABLE "Ship" DROP CONSTRAINT "Ship_currentWorldId_fkey";

-- DropForeignKey
ALTER TABLE "Ship" DROP CONSTRAINT "Ship_destinationWorldId_fkey";

-- AlterTable
ALTER TABLE "CargoLot" DROP COLUMN "originWorldId";

-- AlterTable
ALTER TABLE "Character" DROP COLUMN "currentWorldId";

-- AlterTable
ALTER TABLE "LocationLog" DROP COLUMN "worldId",
ALTER COLUMN "location" SET NOT NULL;

-- AlterTable
ALTER TABLE "Ship" DROP COLUMN "currentWorldId",
DROP COLUMN "destinationWorldId";
