ALTER TABLE "Character"
ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'player';

CREATE INDEX "Character_kind_idx" ON "Character"("kind");
