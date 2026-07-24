import { characterCombatWeapons } from "./equipment";
import { assertValidCombatScenario } from "./scenarioValidator";
import { defaultTacticalScenarioDefinition, resolveTacticalScenarioTerrain, tacticalPlacementSupportsConsoleOperations, type TacticalScenarioDefinitionFile } from "./tacticalScenarioDefinitions";
import type { CombatScenario, TacticalLightingPreset } from "./types";
import { defaultTacticalConsoleVictoryDefinition, validateTacticalConsoleVictoryDefinition, type TacticalConsoleVictoryDefinitionFile } from "./tacticalConsoleVictory";
import { buildTacticalEnemyCombatant } from "./tacticalEnemyDefinitions";
import { defaultTacticalInteractiveHumanCombatProfile, validateTacticalInteractiveHumanCombatProfile } from "./tacticalInteractiveHuman";

export const defaultTacticalLighting = (preset: TacticalLightingPreset) => {
  return {
    exteriorLighting: preset === "exterior-lit" ? "illuminated" as const : "dark" as const,
  };
};

export const buildDefaultTacticalScenario = (lightingPreset?: TacticalLightingPreset, definition: TacticalScenarioDefinitionFile = defaultTacticalScenarioDefinition, consoleVictory?: TacticalConsoleVictoryDefinitionFile): CombatScenario => {
  const terrain = resolveTacticalScenarioTerrain(definition);
  terrain.terrainObjects.filter((object) => object.kind === "terminal" && object.visualKind === "human").forEach((human) => validateTacticalInteractiveHumanCombatProfile(human.kind === "terminal" ? human.combatProfile ?? defaultTacticalInteractiveHumanCombatProfile : defaultTacticalInteractiveHumanCombatProfile));
  const consolePlacementIds = definition.terrainPlacements.filter(tacticalPlacementSupportsConsoleOperations).map((placement) => placement.id);
  const resolvedConsoleVictory = consoleVictory ?? (consolePlacementIds.includes("control-room-alpha") ? defaultTacticalConsoleVictoryDefinition : undefined);
  if (resolvedConsoleVictory) validateTacticalConsoleVictoryDefinition(resolvedConsoleVictory, consolePlacementIds, definition.terrainPlacements.filter((placement) => placement.terrainDefinitionId === "interactive-human").map((placement) => placement.id));
  const enemies = (definition.enemyPlacements ?? []).map(buildTacticalEnemyCombatant);
  const unavailableDeploymentCells = new Set([
    ...terrain.objects.map((object) => `${object.position.x}:${object.position.y}`),
    ...terrain.closeMachineryCells.map((cell) => `${cell.x}:${cell.y}`),
    ...enemies.map((enemy) => `${enemy.position.x}:${enemy.position.y}`),
    ...definition.fireCells.map((cell) => `${cell.x}:${cell.y}`),
  ]);
  const crewStarts = terrain.deploymentCells.filter((cell) => !unavailableDeploymentCells.has(`${cell.x}:${cell.y}`));
  if (crewStarts.length < 2) throw new Error(`Scenario ${definition.id} requires at least two open crew deployment squares.`);

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
    deploymentCells: terrain.deploymentCells,
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
        id: "player-1", name: "Boarding Lead", side: "player", position: { ...crewStarts[0] }, facing: "south", posture: "standing",
        health: 1, defeated: false, surrendered: false, weapon: { ...characterCombatWeapons.noRangedWeapon }, weaponSkill: 1, skills: [{ name: "Security", level: 1 }],
        meleeWeapon: { name: "Unarmed", penetration: 0 }, meleeRating: 2, moraleFactor: 7, leadershipRating: 1,
        armor: 0, armorName: "No Armor",
        grenades: 1, smokeGrenades: 1, medkits: 1, breachingCharges: 1, woundState: "healthy",
      },
      {
        id: "player-2", name: "Boarding Support", side: "player", position: { ...crewStarts[1] }, facing: "south", posture: "standing",
        health: 1, defeated: false, surrendered: false, weapon: { ...characterCombatWeapons.noRangedWeapon }, weaponSkill: 0, skills: [],
        meleeWeapon: { name: "Unarmed", penetration: 0 }, meleeRating: 1, moraleFactor: 7, leadershipRating: 0,
        armor: 0, armorName: "No Armor",
        grenades: 1, smokeGrenades: 1, medkits: 1, woundState: "healthy",
      },
      ...enemies,
    ],
  });
};
