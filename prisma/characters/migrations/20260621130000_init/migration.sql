-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "strength" INTEGER NOT NULL,
    "dexterity" INTEGER NOT NULL,
    "endurance" INTEGER NOT NULL,
    "intelligence" INTEGER NOT NULL,
    "education" INTEGER NOT NULL,
    "socialStanding" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "sheet" JSONB,
    "currentLocation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterSkill" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,

    CONSTRAINT "CharacterSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationLog" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "arrivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Character_userId_idx" ON "Character"("userId");

-- CreateIndex
CREATE INDEX "Character_currentLocation_idx" ON "Character"("currentLocation");

-- CreateIndex
CREATE INDEX "CharacterSkill_characterId_idx" ON "CharacterSkill"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterSkill_characterId_name_key" ON "CharacterSkill"("characterId", "name");

-- CreateIndex
CREATE INDEX "LocationLog_characterId_idx" ON "LocationLog"("characterId");

-- CreateIndex
CREATE INDEX "LocationLog_location_idx" ON "LocationLog"("location");

-- AddForeignKey
ALTER TABLE "CharacterSkill" ADD CONSTRAINT "CharacterSkill_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationLog" ADD CONSTRAINT "LocationLog_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
