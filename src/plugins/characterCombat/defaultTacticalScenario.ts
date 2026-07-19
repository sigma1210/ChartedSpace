import { characterCombatArmor, characterCombatWeapons } from "./equipment";
import { assertValidCombatScenario } from "./scenarioValidator";
import { defaultTacticalScenarioDefinition, resolveTacticalScenarioTerrain, tacticalPlacementSupportsConsoleOperations, type TacticalScenarioDefinitionFile } from "./tacticalScenarioDefinitions";
import type { CombatScenario, TacticalLightingPreset } from "./types";
import { defaultTacticalConsoleVictoryDefinition, validateTacticalConsoleVictoryDefinition, type TacticalConsoleVictoryDefinitionFile } from "./tacticalConsoleVictory";
import { buildTacticalEnemyCombatant } from "./tacticalEnemyDefinitions";

export const defaultTacticalLighting = (preset: TacticalLightingPreset) => {
  return {
    exteriorLighting: preset === "exterior-lit" ? "illuminated" as const : "dark" as const,
  };
};

export const buildDefaultTacticalScenario = (lightingPreset?: TacticalLightingPreset, definition: TacticalScenarioDefinitionFile = defaultTacticalScenarioDefinition, consoleVictory?: TacticalConsoleVictoryDefinitionFile): CombatScenario => {
  const terrain = resolveTacticalScenarioTerrain(definition);
  const consolePlacementIds = definition.terrainPlacements.filter(tacticalPlacementSupportsConsoleOperations).map((placement) => placement.id);
  const resolvedConsoleVictory = consoleVictory ?? (consolePlacementIds.includes("control-room-alpha") ? defaultTacticalConsoleVictoryDefinition : undefined);
  if (resolvedConsoleVictory) validateTacticalConsoleVictoryDefinition(resolvedConsoleVictory, consolePlacementIds);

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
    ...(resolvedConsoleVictory ? { consoleVictory: resolvedConsoleVictory } : {}),
    terrainObjects: terrain.terrainObjects,
    bridges: terrain.bridges,
    liquidHydrogenAreas: terrain.liquidHydrogenAreas,
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
        health: 1, defeated: false, surrendered: false, weapon: { ...characterCombatWeapons.laserRifle }, weaponSkill: 1, skills: [{ name: "Security", level: 1 }],
        meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 2, moraleFactor: 7, leadershipRating: 1,
        armor: characterCombatArmor.flakVest.value, armorName: characterCombatArmor.flakVest.name,
        grenades: 1, smokeGrenades: 1, medkits: 1, breachingCharges: 1, woundState: "healthy",
      },
      {
        id: "player-2", name: "Boarding Support", side: "player", position: { x: 51, y: 34 }, facing: "south", posture: "standing",
        health: 1, defeated: false, surrendered: false, weapon: { ...characterCombatWeapons.shotgun }, weaponSkill: 0, skills: [],
        meleeWeapon: { name: "Blade", penetration: 1 }, meleeRating: 1, moraleFactor: 7, leadershipRating: 0,
        armor: characterCombatArmor.combatArmor.value, armorName: characterCombatArmor.combatArmor.name,
        grenades: 1, smokeGrenades: 1, medkits: 1, woundState: "healthy",
      },
      ...(definition.enemyPlacements ?? []).map(buildTacticalEnemyCombatant),
    ],
  });
};
