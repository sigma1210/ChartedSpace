-- Add nullable location-string columns. These are intentionally nullable for
-- the first pass so existing deployments with partial or inconsistent world
-- references can migrate safely.
ALTER TABLE "Character" ADD COLUMN "currentLocation" TEXT;
ALTER TABLE "LocationLog" ADD COLUMN "location" TEXT;
ALTER TABLE "Ship" ADD COLUMN "currentLocation" TEXT;
ALTER TABLE "Ship" ADD COLUMN "destinationLocation" TEXT;
ALTER TABLE "CargoLot" ADD COLUMN "originLocation" TEXT;

-- Backfill character current locations from the current world relation.
UPDATE "Character" c
SET "currentLocation" = s."abbreviation" || ':' || w."hex"
FROM "World" w
JOIN "Sector" s ON s."id" = w."sectorId"
WHERE c."currentWorldId" = w."id";

-- Backfill location logs from their logged world relation.
UPDATE "LocationLog" l
SET "location" = s."abbreviation" || ':' || w."hex"
FROM "World" w
JOIN "Sector" s ON s."id" = w."sectorId"
WHERE l."worldId" = w."id";

-- Backfill ship current locations from the current world relation.
UPDATE "Ship" sh
SET "currentLocation" = s."abbreviation" || ':' || w."hex"
FROM "World" w
JOIN "Sector" s ON s."id" = w."sectorId"
WHERE sh."currentWorldId" = w."id";

-- Backfill ship destination locations from the destination world relation.
UPDATE "Ship" sh
SET "destinationLocation" = s."abbreviation" || ':' || w."hex"
FROM "World" w
JOIN "Sector" s ON s."id" = w."sectorId"
WHERE sh."destinationWorldId" = w."id";

-- Backfill cargo origins from the origin world relation.
UPDATE "CargoLot" c
SET "originLocation" = s."abbreviation" || ':' || w."hex"
FROM "World" w
JOIN "Sector" s ON s."id" = w."sectorId"
WHERE c."originWorldId" = w."id";
