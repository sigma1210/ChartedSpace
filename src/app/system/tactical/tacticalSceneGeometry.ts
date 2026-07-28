import { pointKey, terrainHeightAt } from "@/plugins/characterCombat/geometry";
import type {
  Combatant,
  CombatantMovementAnimation,
  CombatScenario,
} from "@/plugins/characterCombat/types";

export const TACTICAL_WALL_HEIGHT = 1.26;
export const TACTICAL_WALL_CENTER_Y = TACTICAL_WALL_HEIGHT / 2;
export const TACTICAL_STAIR_PLATFORM_HEIGHT = TACTICAL_WALL_HEIGHT / 2;
export const TACTICAL_DOOR_HEIGHT = 1.23;
export const TACTICAL_DOOR_CENTER_Y = TACTICAL_DOOR_HEIGHT / 2;

export const tacticalRaisedSurfaceHeightAt = (
  scenario: CombatScenario,
  point: { x: number; y: number },
) => terrainHeightAt(scenario, point) / 0.65 * TACTICAL_WALL_HEIGHT;

export const tacticalVisualHeightAt = (
  scenario: CombatScenario,
  point: { x: number; y: number },
) => {
  const surfaceHeight = tacticalRaisedSurfaceHeightAt(scenario, point);
  return scenario.elevationAccessCells?.some(
    (cell) => pointKey(cell) === pointKey(point),
  )
    ? surfaceHeight + TACTICAL_WALL_HEIGHT / 2
    : surfaceHeight;
};

export const tacticalMovementVisualHeightAt = (
  scenario: CombatScenario,
  point: { x: number; y: number },
  elevationLevel?: number,
) =>
  scenario.elevationAccessCells?.some(
    (cell) => pointKey(cell) === pointKey(point),
  )
    ? tacticalVisualHeightAt(scenario, point)
    : elevationLevel !== undefined
      ? elevationLevel * TACTICAL_WALL_HEIGHT
      : tacticalVisualHeightAt(scenario, point);

export const tacticalStairPlatformPlacement = (
  scenario: CombatScenario,
  point: { x: number; y: number },
) => {
  const baseHeight = tacticalRaisedSurfaceHeightAt(scenario, point);
  const hasElevatedNeighbor = [
    { x: point.x + 1, y: point.y },
    { x: point.x - 1, y: point.y },
    { x: point.x, y: point.y + 1 },
    { x: point.x, y: point.y - 1 },
  ].some(
    (candidate) =>
      tacticalRaisedSurfaceHeightAt(scenario, candidate) > baseHeight,
  );
  if (!hasElevatedNeighbor) return null;

  return {
    baseHeight,
    height: TACTICAL_STAIR_PLATFORM_HEIGHT,
    centerHeight: baseHeight + TACTICAL_STAIR_PLATFORM_HEIGHT / 2,
    topHeight: baseHeight + TACTICAL_STAIR_PLATFORM_HEIGHT,
  };
};

export const tacticalCombatantHeight = (
  scenario: CombatScenario,
  combatant: Combatant,
) => {
  const bridgeLevel = scenario.bridges?.find(
    (bridge) => bridge.cells.some(
      (cell) => pointKey(cell) === pointKey(combatant.position),
    ),
  )?.elevationLevel;
  return bridgeLevel !== undefined && combatant.elevationLevel === bridgeLevel
    ? bridgeLevel * TACTICAL_WALL_HEIGHT
    : tacticalVisualHeightAt(scenario, combatant.position);
};

export const tacticalWorldMovement = (
  animation: CombatantMovementAnimation,
  scenario: CombatScenario,
): {
  sequence: number;
  path: [number, number, number][];
  mode: "walk" | "run";
} => ({
  ...animation,
  path: animation.path.map((point, index) => [
    point.x + 0.5 - scenario.width / 2,
    tacticalMovementVisualHeightAt(
      scenario,
      point,
      animation.elevationLevels?.[index],
    ) + 0.02,
    point.y + 0.5 - scenario.height / 2,
  ]),
});
