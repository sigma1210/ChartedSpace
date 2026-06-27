CREATE TABLE "CharacterPosting" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "characterId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "role" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterPosting_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CharacterPosting_userId_idx" ON "CharacterPosting"("userId");
CREATE INDEX "CharacterPosting_characterId_idx" ON "CharacterPosting"("characterId");
CREATE INDEX "CharacterPosting_type_idx" ON "CharacterPosting"("type");
CREATE INDEX "CharacterPosting_status_idx" ON "CharacterPosting"("status");
CREATE INDEX "CharacterPosting_location_idx" ON "CharacterPosting"("location");

ALTER TABLE "CharacterPosting" ADD CONSTRAINT "CharacterPosting_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
