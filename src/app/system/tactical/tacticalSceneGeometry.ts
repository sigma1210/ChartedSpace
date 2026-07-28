import { pointKey, terrainHeightAt } from "@/plugins/characterCombat/geometry";
import type {
  Combatant,
  CombatantMovementAnimation,
  CombatScenario,
} from "@/plugins/characterCombat/types";

export const TACTICAL_WALL_HEIGHT = 1.26;
export const TACTICAL_WALL_CENTER_Y = TACTICAL_WALL_HEIGHT / 2;
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
    (
      animation.elevationLevels?.[index] !== undefined
        ? animation.elevationLevels[index] * TACTICAL_WALL_HEIGHT
        : tacticalVisualHeightAt(scenario, point)
    ) + 0.02,
    point.y + 0.5 - scenario.height / 2,
  ]),
});
