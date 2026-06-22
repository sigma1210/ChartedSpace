-- Drop legacy main-database character tables after moving characters to the
-- separate character plugin database.
DROP TABLE "ShipPassenger";
DROP TABLE "CharacterSkill";
DROP TABLE "LocationLog";
DROP TABLE "Character";
