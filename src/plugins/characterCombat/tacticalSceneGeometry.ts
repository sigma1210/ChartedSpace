import { pointKey, terrainHeightAt } from "@/plugins/characterCombat/geometry";
import type {
  Combatant,
  CombatantMovementAnimation,
  CombatScenario,
  TacticalElevationTransition,
} from "@/plugins/characterCombat/types";

export const TACTICAL_WALL_HEIGHT = 1.26;
export const TACTICAL_WALL_CENTER_Y = TACTICAL_WALL_HEIGHT / 2;
export const TACTICAL_STAIR_PLATFORM_HEIGHT = TACTICAL_WALL_HEIGHT / 2;
export const TACTICAL_DOOR_HEIGHT = 1.23;
export const TACTICAL_DOOR_CENTER_Y = TACTICAL_DOOR_HEIGHT / 2;
export const TACTICAL_TERRAIN_GRID_LIFT = 0.008;
export const TACTICAL_RAMP_DECK_THICKNESS = 0.12;

export const tacticalBoundaryBaseHeight = (elevationLevel = 0) =>
  elevationLevel * TACTICAL_WALL_HEIGHT;

export const tacticalRaisedSurfaceHeightAt = (
  scenario: CombatScenario,
  point: { x: number; y: number },
) => terrainHeightAt(scenario, point) / 0.65 * TACTICAL_WALL_HEIGHT;

export const tacticalRampSurfaceHeightAt = (
  scenario: Pick<CombatScenario, "elevationTransitions">,
  point: { x: number; y: number },
  elevationLevel?: number,
) => {
  const key = pointKey(point);
  const ramp = scenario.elevationTransitions?.find((transition) =>
    transition.kind === "ramp"
    && transition.path.some((cell) => pointKey(cell) === key));
  if (!ramp) return null;
  if (ramp.lowerLevel === ramp.upperLevel
    && elevationLevel !== undefined
    && elevationLevel !== ramp.lowerLevel) {
    return null;
  }
  const index = ramp.path.findIndex((cell) => pointKey(cell) === key);
  const progress = ramp.path.length > 1 ? index / (ramp.path.length - 1) : 0;
  return (ramp.lowerLevel + (ramp.upperLevel - ramp.lowerLevel) * progress)
    * TACTICAL_WALL_HEIGHT;
};

export const tacticalVisualHeightAt = (
  scenario: CombatScenario,
  point: { x: number; y: number },
) => {
  const rampHeight = tacticalRampSurfaceHeightAt(scenario, point);
  if (rampHeight !== null) return rampHeight;
  const surfaceHeight = tacticalRaisedSurfaceHeightAt(scenario, point);
  const isStairCell = scenario.elevationAccessCells?.some(
    (cell) => pointKey(cell) === pointKey(point),
  ) || scenario.elevationTransitions?.some(
    (transition) => transition.kind === "stairs" && pointKey(transition.lower) === pointKey(point),
  );
  return isStairCell
    ? surfaceHeight + TACTICAL_WALL_HEIGHT / 2
    : surfaceHeight;
};

export const tacticalMovementVisualHeightAt = (
  scenario: CombatScenario,
  point: { x: number; y: number },
  elevationLevel?: number,
) =>
  tacticalRampSurfaceHeightAt(scenario, point, elevationLevel)
    ?? (scenario.elevationAccessCells?.some(
    (cell) => pointKey(cell) === pointKey(point),
  ) || scenario.elevationTransitions?.some(
    (transition) => transition.kind === "stairs" && pointKey(transition.lower) === pointKey(point),
  )
    ? tacticalVisualHeightAt(scenario, point)
    : elevationLevel !== undefined
      ? elevationLevel * TACTICAL_WALL_HEIGHT
      : tacticalVisualHeightAt(scenario, point));

export const tacticalRampCellAtWorldPoint = (
  scenario: Pick<CombatScenario, "width" | "height">,
  transition: TacticalElevationTransition,
  worldPoint: { x: number; z: number },
) => {
  const mapPoint = {
    x: worldPoint.x + scenario.width / 2,
    y: worldPoint.z + scenario.height / 2,
  };
  return transition.path.reduce((nearest, cell) => {
    const nearestDistance = Math.hypot(
      nearest.x + 0.5 - mapPoint.x,
      nearest.y + 0.5 - mapPoint.y,
    );
    const cellDistance = Math.hypot(
      cell.x + 0.5 - mapPoint.x,
      cell.y + 0.5 - mapPoint.y,
    );
    return cellDistance < nearestDistance ? cell : nearest;
  }, transition.path[0] ?? transition.lower);
};

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

export type TacticalElevationTransitionVisualPlacement =
  | {
    kind: "stairs";
    position: [number, number, number];
    height: number;
  }
  | {
    kind: "ladder";
    position: [number, number, number];
    height: number;
    rotation: [number, number, number];
  }
  | {
    kind: "ramp";
    position: [number, number, number];
    length: number;
    rotation: [number, number, number];
    longAxis: "x" | "z";
  };

export const tacticalRaisedGridLinePositions = (
  scenario: Pick<CombatScenario, "width" | "height" | "elevationLevelByCell">,
  excludedLevelsByCell?: ReadonlyMap<string, ReadonlySet<number>>,
) => {
  const positions: number[] = [];
  const edges = new Set<string>();
  Object.entries(scenario.elevationLevelByCell ?? {}).forEach(([key, level]) => {
    if (level <= 0) return;
    if (excludedLevelsByCell?.get(key)?.has(level)) return;
    const [x, y] = key.split(":").map(Number);
    const height = level * TACTICAL_WALL_HEIGHT + TACTICAL_TERRAIN_GRID_LIFT;
    const corners = [
      [x, y, x + 1, y],
      [x + 1, y, x + 1, y + 1],
      [x + 1, y + 1, x, y + 1],
      [x, y + 1, x, y],
    ] as const;
    corners.forEach(([fromX, fromY, toX, toY]) => {
      const edgeKey = [
        `${fromX}:${fromY}`,
        `${toX}:${toY}`,
      ].sort().join("|") + `@${level}`;
      if (edges.has(edgeKey)) return;
      edges.add(edgeKey);
      positions.push(
        fromX - scenario.width / 2,
        height,
        fromY - scenario.height / 2,
        toX - scenario.width / 2,
        height,
        toY - scenario.height / 2,
      );
    });
  });
  return new Float32Array(positions);
};

export const tacticalRampGridLinePositions = (
  placement: Extract<TacticalElevationTransitionVisualPlacement, { kind: "ramp" }>,
  sections: number,
) => {
  const positions: number[] = [];
  const halfLength = placement.length / 2;
  const halfWidth = 0.45;
  const surface = TACTICAL_RAMP_DECK_THICKNESS / 2 + TACTICAL_TERRAIN_GRID_LIFT;
  const point = (along: number, across: number): [number, number, number] =>
    placement.longAxis === "x"
      ? [along, surface, across]
      : [across, surface, along];
  [-halfWidth, halfWidth].forEach((across) => {
    positions.push(...point(-halfLength, across), ...point(halfLength, across));
  });
  for (let index = 0; index <= Math.max(1, sections); index += 1) {
    const along = -halfLength + placement.length * index / Math.max(1, sections);
    positions.push(...point(along, -halfWidth), ...point(along, halfWidth));
  }
  return new Float32Array(positions);
};

export const tacticalElevationTransitionVisualPlacement = (
  scenario: Pick<CombatScenario, "width" | "height">,
  transition: TacticalElevationTransition,
): TacticalElevationTransitionVisualPlacement => {
  const lower = {
    x: transition.lower.x + 0.5 - scenario.width / 2,
    y: transition.lowerLevel * TACTICAL_WALL_HEIGHT,
    z: transition.lower.y + 0.5 - scenario.height / 2,
  };
  const upper = {
    x: transition.upper.x + 0.5 - scenario.width / 2,
    y: transition.upperLevel * TACTICAL_WALL_HEIGHT,
    z: transition.upper.y + 0.5 - scenario.height / 2,
  };
  if (transition.kind === "stairs") {
    return {
      kind: "stairs",
      position: [lower.x, lower.y, lower.z],
      height: TACTICAL_STAIR_PLATFORM_HEIGHT,
    };
  }
  if (transition.kind === "ladder") {
    if (transition.ladderMount) {
      return {
        kind: "ladder",
        position: [
          transition.ladderMount.position.x - scenario.width / 2,
          (lower.y + upper.y) / 2,
          transition.ladderMount.position.y - scenario.height / 2,
        ],
        height: upper.y - lower.y,
        rotation: [
          0,
          Math.atan2(
            -transition.ladderMount.tangent.y,
            transition.ladderMount.tangent.x,
          ),
          0,
        ],
      };
    }
    const dx = upper.x - lower.x;
    const dz = upper.z - lower.z;
    const horizontalDistance = Math.hypot(dx, dz);
    const faceOffset = 0.035;
    return {
      kind: "ladder",
      position: [
        (lower.x + upper.x) / 2 - dx / horizontalDistance * faceOffset,
        (lower.y + upper.y) / 2,
        (lower.z + upper.z) / 2 - dz / horizontalDistance * faceOffset,
      ],
      height: upper.y - lower.y,
      rotation: [0, Math.atan2(dx, dz), 0],
    };
  }
  const dx = upper.x - lower.x;
  const dz = upper.z - lower.z;
  const rise = upper.y - lower.y;
  const longAxis = dx !== 0 ? "x" : "z";
  return {
    kind: "ramp",
    position: [(lower.x + upper.x) / 2, (lower.y + upper.y) / 2, (lower.z + upper.z) / 2],
    length: Math.hypot(dx || dz, rise),
    rotation: longAxis === "x"
      ? [0, 0, Math.atan2(rise, dx)]
      : [-Math.atan2(rise, dz), 0, 0],
    longAxis,
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
    : tacticalMovementVisualHeightAt(
      scenario,
      combatant.position,
      combatant.elevationLevel,
    );
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
