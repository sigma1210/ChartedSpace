-- CreateTable
CREATE TABLE "WorldSystemCache" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "generatorVersion" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldSystemCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorldSystemCache_generatorVersion_idx" ON "WorldSystemCache"("generatorVersion");

-- CreateIndex
CREATE UNIQUE INDEX "WorldSystemCache_worldId_generatorVersion_key" ON "WorldSystemCache"("worldId", "generatorVersion");

-- AddForeignKey
ALTER TABLE "WorldSystemCache" ADD CONSTRAINT "WorldSystemCache_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;
