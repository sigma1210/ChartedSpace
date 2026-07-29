import type { CombatScenario } from "@/plugins/characterCombat/types";

export const tacticalDeploymentAreaScenarioEqual = (
  previous: CombatScenario,
  next: CombatScenario,
) =>
  previous.width === next.width
  && previous.height === next.height
  && previous.deploymentCells === next.deploymentCells
  && previous.elevationLevelByCell === next.elevationLevelByCell
  && previous.terrainByCell === next.terrainByCell
  && previous.elevationAccessCells === next.elevationAccessCells;

export const tacticalLightingScenarioEqual = (
  previous: CombatScenario,
  next: CombatScenario,
) =>
  previous.width === next.width
  && previous.height === next.height
  && previous.walls === next.walls
  && previous.doors === next.doors
  && previous.objects === next.objects
  && previous.lightSources === next.lightSources
  && previous.fireCells === next.fireCells
  && previous.smokeCells === next.smokeCells
  && previous.interiorCells === next.interiorCells
  && previous.closeMachineryCells === next.closeMachineryCells
  && previous.terrainByCell === next.terrainByCell
  && previous.elevationLevelByCell === next.elevationLevelByCell
  && previous.exteriorLighting === next.exteriorLighting
  && previous.defaultLighting === next.defaultLighting
  && previous.lightingByCell === next.lightingByCell;
