import { characterCombatArmor, characterCombatWeapons } from "./equipment";
import { assertValidCombatScenario } from "./scenarioValidator";
import { defaultTacticalScenarioDefinition, resolveTacticalScenarioTerrain, type TacticalScenarioDefinitionFile } from "./tacticalScenarioDefinitions";
import type { CombatScenario, TacticalLightingPreset } from "./types";

export const defaultTacticalLighting = (preset: TacticalLightingPreset) => {
  return {
    exteriorLighting: preset === "exterior-lit" ? "illuminated" as const : "dark" as const,
  };
};

export const buildDefaultTacticalScenario = (lightingPreset?: TacticalLightingPreset, definition: TacticalScenarioDefinitionFile = defaultTacticalScenarioDefinition): CombatScenario => {
  const terrain = resolveTacticalScenarioTerrain(definition);

  return assertValidCombatScenario({
    id: definition.id,
    title: definition.title,
    briefing: definition.briefing,
    objective: definition.objective,
    width: definition.map.width,
    height: definition.map.height,
    walls: terrain.walls,
    doors: terrain.doors,
    objects: terrain.objects,
    terrainObjects: terrain.terrainObjects,
    interiorCells: terrain.interiorCells,
    lightSources: terrain.lightSources,
    terrainByCell: terrain.terrainByCell,
    elevationLevelByCell: terrain.elevationLevelByCell,
    closeMachineryCells: terrain.closeMachineryCells,
    elevationAccessCells: terrain.elevationAccessCells,
    fireCells: definition.fireCells.map((point) => ({ ...point })),
    smokeCells: definition.smokeCells.map((point) => ({ ...point })),
    ...(lightingPreset ? defaultTacticalLighting(lightingPreset) : {}),
    combatants: [
      {
        id: "player-1", name: "Boarding Lead", side: "player", position: { x: 48, y: 34 }, facing: "south", posture: "standing",
        health: 1, defeated: false, surrendered: false, weapon: { ...characterCombatWeapons.laserRifle }, weaponSkill: 1,
        meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 2, moraleFactor: 7, leadershipRating: 1,
        armor: characterCombatArmor.flakVest.value, armorName: characterCombatArmor.flakVest.name,
        grenades: 1, smokeGrenades: 1, medkits: 1, breachingCharges: 1, woundState: "healthy",
      },
      {
        id: "player-2", name: "Boarding Support", side: "player", position: { x: 51, y: 34 }, facing: "south", posture: "standing",
        health: 1, defeated: false, surrendered: false, weapon: { ...characterCombatWeapons.shotgun }, weaponSkill: 0,
        meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 1, moraleFactor: 7, leadershipRating: 0,
        armor: characterCombatArmor.combatArmor.value, armorName: characterCombatArmor.combatArmor.name,
        grenades: 1, smokeGrenades: 1, medkits: 1, woundState: "healthy",
      },
      {
        id: "enemy-1", name: "Security Guard", side: "enemy", position: { x: 47, y: 41 }, facing: "north", posture: "standing",
        health: 1, defeated: false, surrendered: false, weapon: { ...characterCombatWeapons.smg }, weaponSkill: 1,
        meleeWeapon: { name: "Baton", penetration: 0 }, meleeRating: 1, moraleFactor: 7, leadershipRating: 0,
        armor: characterCombatArmor.flakVest.value, armorName: characterCombatArmor.flakVest.name,
        grenades: 0, medkits: 0, woundState: "healthy",
      },
      {
        id: "enemy-2", name: "Control Room Officer", side: "enemy", position: { x: 50, y: 43 }, facing: "north", posture: "standing",
        health: 1, defeated: false, surrendered: false, weapon: { ...characterCombatWeapons.autopistol }, weaponSkill: 0,
        meleeWeapon: { name: "Knife", penetration: 1 }, meleeRating: 0, moraleFactor: 7, leadershipRating: 1,
        armor: characterCombatArmor.clothing.value, armorName: characterCombatArmor.clothing.name,
        grenades: 0, medkits: 0, woundState: "healthy",
      },
    ],
  });
};
