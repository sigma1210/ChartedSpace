import type { CombatScenario, Combatant, DoorSegment, GridPoint, MoraleState, PlannedMove, WallSegment } from "./types";
import { distanceInSquares, snapShotTarget } from "./combatResolution";
import { tacticalMovementEdgeKey } from "./tacticalTerrain";

export const pointKey = (point: GridPoint) => `${point.x}:${point.y}`;
export const activeOccupantCounts = (combatants: readonly Pick<Combatant, "id" | "position" | "defeated">[], excludedCombatantId?: string) => {
  const counts = new Map<string, number>();
  combatants.filter((unit) => unit.id !== excludedCombatantId && !unit.defeated).forEach((unit) => {
    const key = pointKey(unit.position);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return counts;
};
export const inFieldOfFire = (attacker: Pick<Combatant, "position" | "facing">, target: GridPoint) => {
  const dx = target.x - attacker.position.x;
  const dy = target.y - attacker.position.y;
  const forward = attacker.facing === "north" ? -dy : attacker.facing === "east" ? dx : attacker.facing === "south" ? dy : -dx;
  const lateral = attacker.facing === "north" || attacker.facing === "south" ? dx : dy;
  return forward > 0 && Math.abs(lateral) <= forward;
};
export const proneRotationForFacing = (facing: Combatant["facing"]): [number, number, number] => facing === "east"
  ? [0, 0, -Math.PI / 2]
  : facing === "west"
    ? [0, 0, Math.PI / 2]
    : facing === "south"
      ? [Math.PI / 2, 0, 0]
      : [-Math.PI / 2, 0, 0];
const samePoint = (a: GridPoint, b: GridPoint) => a.x === b.x && a.y === b.y;
export const remainingCriticalFireCells = (scenario: CombatScenario) => (scenario.criticalFireCells ?? []).filter((critical) => scenario.fireCells?.some((fire) => samePoint(fire, critical)));
const between = (value: number, a: number, b: number) => value >= Math.min(a, b) && value < Math.max(a, b);

const wallBlocksStep = (from: GridPoint, to: GridPoint, segment: WallSegment) => {
  if (from.x !== to.x) {
    const boundaryX = Math.max(from.x, to.x);
    return segment.from.x === segment.to.x && segment.from.x === boundaryX && between(from.y, segment.from.y, segment.to.y);
  }
  const boundaryY = Math.max(from.y, to.y);
  return segment.from.y === segment.to.y && segment.from.y === boundaryY && between(from.x, segment.from.x, segment.to.x);
};

const doorAdjacentCells = (door: DoorSegment): GridPoint[] => {
  if (door.from.x === door.to.x) {
    const y = Math.min(door.from.y, door.to.y);
    return [{ x: door.from.x - 1, y }, { x: door.from.x, y }];
  }
  const x = Math.min(door.from.x, door.to.x);
  return [{ x, y: door.from.y - 1 }, { x, y: door.from.y }];
};

export const breachableDoorsAdjacentTo = (scenario: CombatScenario, combatantId: string) => {
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId && !combatant.defeated);
  if (!unit) return [];
  return scenario.doors.filter((door) => !door.open && doorAdjacentCells(door).some((point) => samePoint(point, unit.position)));
};

export const doorBlastCells = (door: DoorSegment) => doorAdjacentCells(door);

export const closedDoorsAdjacentTo = (scenario: CombatScenario, combatantId: string) => {
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId);
  if (!unit) return [];
  return scenario.doors.filter((door) => !door.open && !door.locked && doorAdjacentCells(door).some((point) => samePoint(point, unit.position)));
};

export const openDoorsAdjacentTo = (scenario: CombatScenario, combatantId: string) => {
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId && !combatant.defeated);
  if (!unit) return [];
  return scenario.doors.filter((door) => door.open && doorAdjacentCells(door).some((point) => samePoint(point, unit.position)));
};

const blockedCells = (scenario: CombatScenario, movingId: string) => new Set([
  ...scenario.objects.filter((object) => object.kind === "cover").map((object) => pointKey(object.position)),
  ...scenario.combatants.filter((unit) => unit.id !== movingId && !unit.defeated).map((unit) => pointKey(unit.position)),
]);

export const adjacentEnemies = (scenario: CombatScenario, combatantId: string) => {
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId && !combatant.defeated);
  if (!unit) return [];
  return scenario.combatants.filter((candidate) => candidate.side !== unit.side && !candidate.defeated
    && Math.abs(candidate.position.x - unit.position.x) + Math.abs(candidate.position.y - unit.position.y) === 1
    && (terrainHeightAt(scenario, candidate.position) === terrainHeightAt(scenario, unit.position)
      || (scenario.elevationAccessCells ?? []).some((access) => samePoint(access, candidate.position) || samePoint(access, unit.position)))
    && !scenario.walls.some((wall) => wallBlocksStep(unit.position, candidate.position, wall))
    && !scenario.doors.some((door) => !door.open && wallBlocksStep(unit.position, candidate.position, door)));
};

export const meleeEnemies = (scenario: CombatScenario, combatantId: string) => {
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId && !combatant.defeated);
  if (!unit) return [];
  return scenario.combatants.filter((candidate) => candidate.side !== unit.side && !candidate.defeated
    && (samePoint(candidate.position, unit.position) || (Math.max(Math.abs(candidate.position.x - unit.position.x), Math.abs(candidate.position.y - unit.position.y)) === 1 && inFieldOfFire(unit, candidate.position)))
    && (terrainHeightAt(scenario, candidate.position) === terrainHeightAt(scenario, unit.position)
      || (scenario.elevationAccessCells ?? []).some((access) => samePoint(access, candidate.position) || samePoint(access, unit.position)))
    && (samePoint(candidate.position, unit.position) || (!scenario.walls.some((wall) => wallBlocksStep(unit.position, candidate.position, wall))
      && !scenario.doors.some((door) => !door.open && wallBlocksStep(unit.position, candidate.position, door)))));
};

export const adjacentObjectives = (scenario: CombatScenario, combatantId: string) => {
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId && !combatant.defeated);
  if (!unit) return [];
  const activeStageObjectiveId = scenario.victoryCondition === "staged-objectives" ? scenario.stageObjectiveIds?.find((id) => !scenario.objects.find((object) => object.id === id)?.completed) : null;
  return scenario.objects.filter((object) => object.kind !== "cover" && object.kind !== "control" && !object.completed
    && (scenario.id !== "damage-control" || remainingCriticalFireCells(scenario).length === 0)
    && (!activeStageObjectiveId || object.id === activeStageObjectiveId)
    && (object.kind !== "extraction" || unit.id === scenario.captiveId)
    && (object.kind === "extraction"
      ? Math.abs(object.position.x - unit.position.x) + Math.abs(object.position.y - unit.position.y) <= 1
      : Math.abs(object.position.x - unit.position.x) + Math.abs(object.position.y - unit.position.y) === 1));
};

export const stagedObjectiveStatus = (scenario: CombatScenario, objectiveId: string): "active" | "locked" | "completed" | null => {
  if (scenario.victoryCondition !== "staged-objectives" || !scenario.stageObjectiveIds?.includes(objectiveId)) return null;
  const objective = scenario.objects.find((object) => object.id === objectiveId);
  if (objective?.completed) return "completed";
  const activeId = scenario.stageObjectiveIds.find((id) => !scenario.objects.find((object) => object.id === id)?.completed);
  return objectiveId === activeId ? "active" : "locked";
};

export const objectiveContesters = (scenario: CombatScenario, objectiveId: string, moraleStateByCombatantId: Record<string, MoraleState> = {}, turn = 1) => {
  if (!scenario.contestedObjectiveIds?.includes(objectiveId)) return [];
  const objective = scenario.objects.find((object) => object.id === objectiveId);
  if (!objective) return [];
  return scenario.combatants.filter((unit) => unit.side === "enemy"
    && !unit.defeated
    && !unit.surrendered
    && (unit.stunnedUntilTurn ?? 0) < turn
    && moraleStateByCombatantId[unit.id] !== "panicked"
    && moraleStateByCombatantId[unit.id] !== "surrendered"
    && Math.abs(unit.position.x - objective.position.x) + Math.abs(unit.position.y - objective.position.y) === 1);
};

export const vaultOptions = (scenario: CombatScenario, combatantId: string) => {
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId && !combatant.defeated);
  if (!unit || unit.posture === "prone") return [];
  return scenario.objects.filter((object) => object.kind === "cover" && object.label === "Low Vault Barrier").flatMap((barrier) => {
    const dx = barrier.position.x - unit.position.x;
    const dy = barrier.position.y - unit.position.y;
    if (Math.abs(dx) + Math.abs(dy) !== 1) return [];
    const landing = { x: barrier.position.x + dx, y: barrier.position.y + dy };
    if (landing.x < 0 || landing.y < 0 || landing.x >= scenario.width || landing.y >= scenario.height) return [];
    if (terrainHeightAt(scenario, unit.position) !== terrainHeightAt(scenario, barrier.position) || terrainHeightAt(scenario, barrier.position) !== terrainHeightAt(scenario, landing)) return [];
    if (scenario.objects.some((object) => object.kind === "cover" && samePoint(object.position, landing))) return [];
    if (scenario.combatants.some((combatant) => combatant.id !== unit.id && !combatant.defeated && samePoint(combatant.position, landing))) return [];
    const boundaries = [[unit.position, barrier.position], [barrier.position, landing]] as const;
    if (boundaries.some(([from, to]) => scenario.walls.some((wall) => wallBlocksStep(from, to, wall)) || scenario.doors.some((door) => !door.open && wallBlocksStep(from, to, door)))) return [];
    return [{ barrier, landing }];
  });
};

export const dropDownOptions = (scenario: CombatScenario, combatantId: string) => {
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId && !combatant.defeated);
  if (!unit || unit.posture === "prone" || terrainHeightAt(scenario, unit.position) <= 0) return [];
  return orthogonalNeighbors(unit.position).filter((destination) => {
    if (destination.x < 0 || destination.y < 0 || destination.x >= scenario.width || destination.y >= scenario.height) return false;
    if (terrainHeightAt(scenario, destination) >= terrainHeightAt(scenario, unit.position)) return false;
    if ((scenario.elevationAccessCells ?? []).some((access) => samePoint(access, unit.position) || samePoint(access, destination))) return false;
    if (blockedCells(scenario, unit.id).has(pointKey(destination))) return false;
    if (scenario.walls.some((wall) => wallBlocksStep(unit.position, destination, wall))) return false;
    if (scenario.doors.some((door) => !door.open && wallBlocksStep(unit.position, destination, door))) return false;
    return true;
  });
};

export const climbUpOptions = (scenario: CombatScenario, combatantId: string) => {
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId && !combatant.defeated);
  if (!unit || unit.posture === "prone") return [];
  return orthogonalNeighbors(unit.position).filter((destination) => {
    if (destination.x < 0 || destination.y < 0 || destination.x >= scenario.width || destination.y >= scenario.height) return false;
    if (terrainHeightAt(scenario, destination) <= terrainHeightAt(scenario, unit.position)) return false;
    if ((scenario.elevationAccessCells ?? []).some((access) => samePoint(access, unit.position) || samePoint(access, destination))) return false;
    if (blockedCells(scenario, unit.id).has(pointKey(destination))) return false;
    if (scenario.walls.some((wall) => wallBlocksStep(unit.position, destination, wall))) return false;
    if (scenario.doors.some((door) => !door.open && wallBlocksStep(unit.position, destination, door))) return false;
    return true;
  });
};

export const treatableAllies = (scenario: CombatScenario, combatantId: string) => {
  const medic = scenario.combatants.find((unit) => unit.id === combatantId && !unit.defeated);
  if (!medic) return [];
  return scenario.combatants.filter((patient) => patient.side === medic.side && patient.woundState !== "healthy" && patient.woundState !== "dead"
    && (patient.id === medic.id || Math.abs(patient.position.x - medic.position.x) + Math.abs(patient.position.y - medic.position.y) === 1));
};

const validStep = (scenario: CombatScenario, movingId: string, from: GridPoint, to: GridPoint, allowOccupiedDestination = false) => {
  if (to.x < 0 || to.y < 0 || to.x >= scenario.width || to.y >= scenario.height) return false;
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  if (dx > 1 || dy > 1 || dx + dy === 0) return false;
  const diagonal = dx === 1 && dy === 1;
  if (diagonal) {
    if (terrainHeightAt(scenario, from) !== terrainHeightAt(scenario, to)) return false;
    const corners = [{ x: to.x, y: from.y }, { x: from.x, y: to.y }];
    if (corners.some((corner) => blockedCells(scenario, movingId).has(pointKey(corner)) || terrainHeightAt(scenario, corner) !== terrainHeightAt(scenario, from))) return false;
    const edges = [[from, corners[0]], [from, corners[1]], [corners[0], to], [corners[1], to]] as const;
    if (edges.some(([start, end]) => scenario.walls.some((wall) => wallBlocksStep(start, end, wall)) || scenario.doors.some((door) => wallBlocksStep(start, end, door)))) return false;
  }
  const changesElevation = terrainHeightAt(scenario, from) !== terrainHeightAt(scenario, to);
  if (changesElevation && !(scenario.elevationAccessCells ?? []).some((point) => samePoint(point, from) || samePoint(point, to))) return false;
  if (!allowOccupiedDestination && blockedCells(scenario, movingId).has(pointKey(to))) return false;
  if (!diagonal && scenario.walls.some((segment) => wallBlocksStep(from, to, segment))) return false;
  if (!diagonal && scenario.doors.some((door) => !door.open && wallBlocksStep(from, to, door))) return false;
  return true;
};

const orthogonalNeighbors = (point: GridPoint): GridPoint[] => [
  { x: point.x + 1, y: point.y },
  { x: point.x, y: point.y + 1 },
  { x: point.x - 1, y: point.y },
  { x: point.x, y: point.y - 1 },
];

const movementNeighbors = (point: GridPoint): GridPoint[] => [
  ...orthogonalNeighbors(point),
  { x: point.x + 1, y: point.y + 1 },
  { x: point.x - 1, y: point.y + 1 },
  { x: point.x - 1, y: point.y - 1 },
  { x: point.x + 1, y: point.y - 1 },
];

export const diveOptions = (scenario: CombatScenario, combatantId: string) => {
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId && !combatant.defeated);
  const options = new Map<string, PlannedMove>();
  if (!unit || unit.posture === "prone" || scenario.gravityMode === "zero-g") return options;
  movementNeighbors(unit.position).forEach((destination) => {
    if (!validStep(scenario, combatantId, unit.position, destination)) return;
    options.set(pointKey(destination), { combatantId, destination, path: [destination], cost: 3, kind: "dive" });
  });
  return options;
};

const facingVectors: Record<Combatant["facing"], GridPoint> = { north: { x: 0, y: -1 }, east: { x: 1, y: 0 }, south: { x: 0, y: 1 }, west: { x: -1, y: 0 } };
const facings = ["north", "east", "south", "west"] as const;
const turnDistance = (from: Combatant["facing"], to: Combatant["facing"]) => {
  const difference = Math.abs(facings.indexOf(from) - facings.indexOf(to));
  return Math.min(difference, facings.length - difference);
};
const movementTurnCost = (from: Combatant["facing"], to: Combatant["facing"], trotting: boolean) => turnDistance(from, to) * (trotting ? 2 : 1);
const forwardStep = (facing: Combatant["facing"], origin: GridPoint, destination: GridPoint) => {
  const vector = facingVectors[facing];
  const dx = destination.x - origin.x;
  const dy = destination.y - origin.y;
  const forward = dx * vector.x + dy * vector.y;
  const lateral = dx * -vector.y + dy * vector.x;
  return forward === 1 && Math.abs(lateral) <= 1;
};
const movementFacingChoices = (facing: Combatant["facing"], origin: GridPoint, destination: GridPoint, trotting: boolean) => facings.filter((candidate) => forwardStep(candidate, origin, destination) || (!trotting && candidate === facing));

export const movementStepCost = (scenario: Pick<CombatScenario, "terrainByCell">, origin: GridPoint, destination: GridPoint, facing?: Combatant["facing"], trotting = false) => {
  const diagonal = origin.x !== destination.x && origin.y !== destination.y;
  const terrain = scenario.terrainByCell?.[pointKey(destination)] === "difficult" ? 1 : 0;
  if (!facing) return (diagonal ? 2 : 1) + terrain;
  if (!forwardStep(facing, origin, destination)) return trotting ? Number.POSITIVE_INFINITY : 6 + terrain;
  return (trotting ? diagonal ? 1.5 : 1 : diagonal ? 3 : 2) + terrain;
};

export const movementPathCost = (scenario: Pick<CombatScenario, "terrainByCell">, origin: GridPoint, path: GridPoint[], initialFacing?: Combatant["facing"], trotting = false) => {
  let facing = initialFacing;
  return path.reduce((total, destination, index) => {
    const from = index === 0 ? origin : path[index - 1];
    if (!facing) return total + movementStepCost(scenario, from, destination);
    const choices = movementFacingChoices(facing, from, destination, trotting).map((candidate) => ({ facing: candidate, cost: movementTurnCost(facing!, candidate, trotting) + movementStepCost(scenario, from, destination, candidate, trotting) }));
    const choice = choices.sort((a, b) => a.cost - b.cost || facings.indexOf(a.facing) - facings.indexOf(b.facing))[0];
    if (!choice) return Number.POSITIVE_INFINITY;
    facing = choice.facing;
    return total + choice.cost;
  }, 0);
};

export const crawlStepCost = (scenario: Pick<CombatScenario, "terrainByCell">, destination: GridPoint) => 2 + (scenario.terrainByCell?.[pointKey(destination)] === "difficult" ? 1 : 0);

export const reachableCrawling = (scenario: CombatScenario, combatantId: string, availableActionPoints: number) => {
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId && !combatant.defeated && combatant.posture === "prone");
  const results = new Map<string, PlannedMove>();
  if (!unit || scenario.gravityMode === "zero-g") return results;
  const queue: { point: GridPoint; path: GridPoint[]; cost: number }[] = [{ point: unit.position, path: [], cost: 0 }];
  const bestCost = new Map([[pointKey(unit.position), 0]]);
  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost || a.path.length - b.path.length);
    const current = queue.shift()!;
    if (current.cost !== bestCost.get(pointKey(current.point)) || current.path.length >= 2) continue;
    for (const destination of movementNeighbors(current.point)) {
      if (!validStep(scenario, combatantId, current.point, destination)) continue;
      const cost = current.cost + crawlStepCost(scenario, destination);
      const key = pointKey(destination);
      if (cost > availableActionPoints || cost >= (bestCost.get(key) ?? Number.POSITIVE_INFINITY)) continue;
      const path = [...current.path, destination];
      bestCost.set(key, cost);
      results.set(key, { combatantId, destination, path, cost, kind: "crawl" });
      queue.push({ point: destination, path, cost });
    }
  }
  return results;
};

export const pathWithinMovementAllowance = (scenario: Pick<CombatScenario, "terrainByCell">, origin: GridPoint, path: GridPoint[], allowance: number, initialFacing?: Combatant["facing"], trotting = false) => {
  let cost = 0;
  let facing = initialFacing;
  const result: GridPoint[] = [];
  for (let index = 0; index < path.length; index += 1) {
    const destination = path[index];
    const from = index === 0 ? origin : path[index - 1];
    if (!facing) cost += movementStepCost(scenario, from, destination);
    else {
      const choice = movementFacingChoices(facing, from, destination, trotting).map((candidate) => ({ facing: candidate, cost: movementTurnCost(facing!, candidate, trotting) + movementStepCost(scenario, from, destination, candidate, trotting) })).sort((a, b) => a.cost - b.cost)[0];
      if (!choice) break;
      facing = choice.facing;
      cost += choice.cost;
    }
    if (cost > allowance) break;
    result.push(destination);
  }
  return result;
};

/** Returns the shortest legal path to any goal, excluding the combatant's starting cell. */
export const shortestPathToAny = (scenario: CombatScenario, combatantId: string, goals: GridPoint[]) => {
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId && !combatant.defeated);
  if (!unit || goals.length === 0) return null;
  const goalKeys = new Set(goals.map(pointKey));
  if (goalKeys.has(pointKey(unit.position))) return [];

  const heuristic = (point: GridPoint) => Math.min(...goals.map((goal) => Math.abs(goal.x - point.x) + Math.abs(goal.y - point.y)));
  const stateKey = (point: GridPoint, facing: Combatant["facing"]) => `${pointKey(point)}:${facing}`;
  const open: { point: GridPoint; path: GridPoint[]; cost: number; estimate: number; order: number; facing: Combatant["facing"] }[] = [
    { point: unit.position, path: [], cost: 0, estimate: heuristic(unit.position), order: 0, facing: unit.facing },
  ];
  const bestCost = new Map([[stateKey(unit.position, unit.facing), 0]]);
  let order = 1;

  while (open.length > 0) {
    open.sort((a, b) => a.estimate - b.estimate || a.cost - b.cost || a.order - b.order);
    const current = open.shift()!;
    if (current.cost !== bestCost.get(stateKey(current.point, current.facing))) continue;
    if (goalKeys.has(pointKey(current.point))) return current.path;

    for (const destination of movementNeighbors(current.point)) {
      if (!validStep(scenario, combatantId, current.point, destination)) continue;
      for (const nextFacing of movementFacingChoices(current.facing, current.point, destination, false)) {
        const cost = current.cost + turnDistance(current.facing, nextFacing) + movementStepCost(scenario, current.point, destination, nextFacing);
        const key = stateKey(destination, nextFacing);
        if (cost >= (bestCost.get(key) ?? Number.POSITIVE_INFINITY)) continue;
        bestCost.set(key, cost);
        open.push({ point: destination, path: [...current.path, destination], cost, estimate: cost + heuristic(destination), order, facing: nextFacing });
        order += 1;
      }
    }
  }
  return null;
};

export const routeAllowingClosedDoors = (scenario: CombatScenario, combatantId: string, goals: GridPoint[]) => {
  const openDoorScenario: CombatScenario = { ...scenario, doors: scenario.doors.map((door) => ({ ...door, open: door.locked ? door.open : true })) };
  const path = shortestPathToAny(openDoorScenario, combatantId, goals);
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId);
  if (!path || !unit) return null;
  let from = unit.position;
  for (let index = 0; index < path.length; index += 1) {
    const destination = path[index];
    const door = scenario.doors.find((candidate) => !candidate.open && !candidate.locked && wallBlocksStep(from, destination, candidate));
    if (door) return { path, door, doorStepIndex: index };
    from = destination;
  }
  return { path, door: null, doorStepIndex: -1 };
};

export const scenarioAvoidingFireForPathfinding = (scenario: CombatScenario): CombatScenario => ({
  ...scenario,
  objects: [
    ...scenario.objects,
    ...(scenario.fireCells ?? []).filter((fire) => !scenario.objects.some((object) => object.kind === "cover" && samePoint(object.position, fire)))
      .map((position, index) => ({ id: `pathfinding-fire-${index}`, kind: "cover" as const, position, label: "Fire" })),
  ],
});

const boundaryClear = (scenario: CombatScenario, from: GridPoint, to: GridPoint) => !scenario.walls.some((wall) => wallBlocksStep(from, to, wall))
  && !scenario.doors.some((door) => !door.open && wallBlocksStep(from, to, door));

export const depressurizedCells = (scenario: CombatScenario) => {
  const cells = new Map<string, GridPoint>();
  const queue = [...(scenario.vacuumSources ?? [])];
  queue.forEach((point) => cells.set(pointKey(point), point));
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of orthogonalNeighbors(current)) {
      const key = pointKey(next);
      if (cells.has(key) || next.x < 0 || next.y < 0 || next.x >= scenario.width || next.y >= scenario.height || !boundaryClear(scenario, current, next)) continue;
      cells.set(key, next);
      queue.push(next);
    }
  }
  return cells;
};

export const decompressionMovesForDoor = (scenario: CombatScenario, doorId: string) => {
  const door = scenario.doors.find((candidate) => candidate.id === doorId && !candidate.open);
  if (!door) return new Map<string, GridPoint[]>();
  const beforeVacuum = depressurizedCells(scenario);
  const openedScenario: CombatScenario = { ...scenario, doors: scenario.doors.map((candidate) => candidate.id === doorId ? { ...candidate, open: true } : candidate) };
  const afterVacuum = depressurizedCells(openedScenario);
  const adjacent = doorAdjacentCells(door);
  const vacuumSide = adjacent.find((point) => beforeVacuum.has(pointKey(point)));
  const pressureSide = adjacent.find((point) => !beforeVacuum.has(pointKey(point)) && afterVacuum.has(pointKey(point)));
  if (!vacuumSide || !pressureSide) return new Map<string, GridPoint[]>();
  const direction = { x: vacuumSide.x - pressureSide.x, y: vacuumSide.y - pressureSide.y };
  const handholds = new Set((scenario.handholds ?? []).map(pointKey));
  const moves = new Map<string, GridPoint[]>();
  for (const unit of scenario.combatants.filter((combatant) => !combatant.defeated && afterVacuum.has(pointKey(combatant.position)) && !beforeVacuum.has(pointKey(combatant.position)))) {
    if (handholds.has(pointKey(unit.position))) continue;
    const path: GridPoint[] = [];
    let current = unit.position;
    while (true) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      if (!validStep(openedScenario, unit.id, current, next)) break;
      path.push(next);
      current = next;
      if (handholds.has(pointKey(current))) break;
    }
    if (path.length > 0) moves.set(unit.id, path);
  }
  return moves;
};

export const validGrenadeTargets = (scenario: CombatScenario, combatantId: string) => {
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId && !combatant.defeated);
  if (!unit) return [];
  return Array.from({ length: scenario.width }, (_, x) => Array.from({ length: scenario.height }, (_, y) => ({ x, y }))).flat()
    .filter((point) => !samePoint(point, unit.position));
};

export const grenadeBlastCells = (scenario: CombatScenario, center: GridPoint) => [
  center,
  { x: center.x + 1, y: center.y },
  { x: center.x - 1, y: center.y },
  { x: center.x, y: center.y + 1 },
  { x: center.x, y: center.y - 1 },
].filter((point) => point.x >= 0 && point.y >= 0 && point.x < scenario.width && point.y < scenario.height
  && (samePoint(point, center) || (boundaryClear(scenario, center, point)
    && (terrainHeightAt(scenario, center) === terrainHeightAt(scenario, point)
      || (scenario.elevationAccessCells ?? []).some((access) => samePoint(access, center) || samePoint(access, point))))));

export const collateralBlastCells = (scenario: CombatScenario, center: GridPoint) =>
  Array.from({ length: 5 }, (_, x) => Array.from({ length: 5 }, (_, y) => ({
    x: center.x + x - 2,
    y: center.y + y - 2,
  }))).flat().filter((point) => point.x >= 0 && point.y >= 0 && point.x < scenario.width && point.y < scenario.height);

const directScatterOffset = (total: number): GridPoint => total === 5 ? { x: -1, y: 0 }
  : total === 6 ? { x: -1, y: -1 }
    : total === 7 ? { x: 0, y: -1 }
      : total === 8 ? { x: 1, y: -1 }
        : total === 9 ? { x: 1, y: 0 }
          : total === 3 || total === 11 ? { x: 0, y: 1 }
            : total === 4 || total === 12 ? { x: 1, y: 1 } : { x: -1, y: 1 };

const diagonalScatterOffset = (total: number): GridPoint => total === 5 ? { x: -1, y: 1 }
  : total === 6 ? { x: -1, y: 0 }
    : total === 7 ? { x: -1, y: -1 }
      : total === 8 ? { x: 0, y: -1 }
        : total === 9 ? { x: 1, y: -1 }
          : total === 4 || total === 12 ? { x: 1, y: 0 }
            : total === 3 || total === 10 ? { x: 1, y: 1 } : { x: 0, y: 1 };

const orientScatterOffset = (thrower: GridPoint, target: GridPoint, offset: GridPoint) => {
  const dx = target.x - thrower.x;
  const dy = target.y - thrower.y;
  const diagonal = Math.abs(dx) === Math.abs(dy);
  if (diagonal) return { x: offset.x * -Math.sign(dx), y: offset.y * -Math.sign(dy) };
  const forward = Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
  const right = { x: -forward.y, y: forward.x };
  return { x: right.x * offset.x - forward.x * offset.y, y: right.y * offset.x - forward.y * offset.y };
};

export const grenadeThrowRangeModifier = (thrower: GridPoint, target: GridPoint) => {
  const penalty = Math.floor(Math.max(0, Math.max(Math.abs(target.x - thrower.x), Math.abs(target.y - thrower.y)) - 1) / 10);
  return penalty === 0 ? 0 : -penalty;
};

export const grenadeLandingPoint = (scenario: CombatScenario, thrower: GridPoint, target: GridPoint, throwDice: { first: number; second: number }, scatterDice: { first: number; second: number }, throwModifier = 0, occupiedSquareRolls: Record<string, number> = {}) => {
  if (throwDice.first + throwDice.second + throwModifier >= 8) return { landing: target, hit: true };
  const scatterTotal = scatterDice.first + scatterDice.second;
  const diagonal = Math.abs(target.x - thrower.x) === Math.abs(target.y - thrower.y);
  const step = orientScatterOffset(thrower, target, diagonal ? diagonalScatterOffset(scatterTotal) : directScatterOffset(scatterTotal));
  const distance = Math.floor(scatterTotal / 2);
  let landing = { ...target };
  for (let index = 0; index < distance; index += 1) {
    const next = { x: landing.x + step.x, y: landing.y + step.y };
    if (next.x < 0 || next.y < 0 || next.x >= scenario.width || next.y >= scenario.height || !boundaryClear(scenario, landing, next)) break;
    landing = next;
    const occupants = scenario.combatants.filter((unit) => !unit.defeated && samePoint(unit.position, landing)).length;
    if (occupants > 0 && (occupiedSquareRolls[pointKey(landing)] ?? 7) <= occupants) break;
  }
  return { landing, hit: false };
};

export const hasLineOfSight = (scenario: CombatScenario, from: GridPoint, to: GridPoint) => {
  const smoke = new Set((scenario.smokeCells ?? []).map(pointKey));
  if (smoke.has(pointKey(from)) || smoke.has(pointKey(to))) return false;
  const groundToGround = terrainHeightAt(scenario, from) === 0 && terrainHeightAt(scenario, to) === 0;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const samples = Math.max(Math.abs(dx), Math.abs(dy)) * 8;
  let cell = from;
  for (let index = 1; index <= samples; index += 1) {
    const next = { x: Math.floor(from.x + 0.5 + dx * index / samples), y: Math.floor(from.y + 0.5 + dy * index / samples) };
    if (next.x === cell.x && next.y === cell.y) continue;
    if (smoke.has(pointKey(next))) return false;
    if (groundToGround && !samePoint(next, to) && terrainHeightAt(scenario, next) > 0) return false;
    const closeMachinery = scenario.objects.find((object) => object.position.x === next.x && object.position.y === next.y && (object.coverType === "close-machinery" || (object.kind === "cover" && /machin|manifold/i.test(object.label))));
    if (closeMachinery && !samePoint(next, from) && !samePoint(next, to)) {
      const fromAdjacent = Math.max(Math.abs(from.x - next.x), Math.abs(from.y - next.y)) === 1;
      const toAdjacent = Math.max(Math.abs(to.x - next.x), Math.abs(to.y - next.y)) === 1;
      if (!fromAdjacent && !toAdjacent) return false;
    }
    if (next.x !== cell.x && next.y !== cell.y) {
      const horizontal = { x: next.x, y: cell.y };
      const vertical = { x: cell.x, y: next.y };
      const horizontalRoute = boundaryClear(scenario, cell, horizontal) && boundaryClear(scenario, horizontal, next);
      const verticalRoute = boundaryClear(scenario, cell, vertical) && boundaryClear(scenario, vertical, next);
      if (!horizontalRoute && !verticalRoute) return false;
    } else if (!boundaryClear(scenario, cell, next)) return false;
    cell = next;
  }
  return true;
};

export const lightingLevelAt = (scenario: CombatScenario, point: GridPoint) => scenario.flareCells?.some((cell) => samePoint(cell, point)) ? "illuminated" : scenario.lightingByCell?.[pointKey(point)] ?? scenario.defaultLighting ?? "illuminated";

export const visibilityAssessment = (scenario: CombatScenario, attacker: Combatant, target: Combatant) => {
  if (target.concealed) return { visible: false, modifier: 0, level: lightingLevelAt(scenario, target.position), reason: "concealed" as const };
  if (!hasLineOfSight(scenario, attacker.position, target.position)) return { visible: false, modifier: 0, level: lightingLevelAt(scenario, target.position), reason: "blocked" as const };
  const level = lightingLevelAt(scenario, target.position);
  const range = Math.ceil(Math.hypot(target.position.x - attacker.position.x, target.position.y - attacker.position.y));
  if (level === "illuminated" || target.lampOn) return { visible: true, modifier: 0, level, reason: target.lampOn && level === "dark" ? "lamp-revealed" as const : "lit" as const };
  if (attacker.lampOn && attacker.hasLamp) {
    const facing = attacker.facing === "north" ? { x: 0, y: -1 } : attacker.facing === "east" ? { x: 1, y: 0 } : attacker.facing === "south" ? { x: 0, y: 1 } : { x: -1, y: 0 };
    const offset = { x: target.position.x - attacker.position.x, y: target.position.y - attacker.position.y };
    if (range <= 6 && offset.x * facing.x + offset.y * facing.y > 0) return { visible: true, modifier: 0, level, reason: "lamp" as const };
  }
  const enhancedVision = attacker.visionMode === "enhanced" || attacker.weapon.enhancedVision;
  if (level === "emergency") return { visible: true, modifier: enhancedVision ? 0 : -2, level, reason: "emergency" as const };
  if (enhancedVision && range <= 6) return { visible: true, modifier: -2, level, reason: "enhanced" as const };
  return { visible: false, modifier: 0, level, reason: "dark" as const };
};

const tracedCells = (from: GridPoint, to: GridPoint) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const samples = Math.max(Math.abs(dx), Math.abs(dy)) * 8;
  const cells = new Map<string, GridPoint>();
  for (let index = 1; index < samples; index += 1) {
    const point = { x: Math.floor(from.x + 0.5 + dx * index / samples), y: Math.floor(from.y + 0.5 + dy * index / samples) };
    cells.set(pointKey(point), point);
  }
  return cells;
};

export const fireLaneCells = (scenario: CombatScenario, from: GridPoint, to: GridPoint) => {
  if (!hasLineOfSight(scenario, from, to)) return [];
  const cells = [...tracedCells(from, to).values()];
  if (!cells.some((cell) => samePoint(cell, to))) cells.push(to);
  return cells.filter((cell) => !samePoint(cell, from));
};

export const coveringFireDangerSpaceCells = (scenario: CombatScenario, from: GridPoint, directionTarget: GridPoint, maximumRange: number) => {
  const dx = directionTarget.x - from.x;
  const dy = directionTarget.y - from.y;
  const magnitude = Math.hypot(dx, dy);
  if (magnitude === 0 || !hasLineOfSight(scenario, from, directionTarget)) return [];
  const cells = new Map<string, GridPoint>();
  const samples = Math.max(1, Math.ceil(maximumRange * 16));
  for (let index = 1; index <= samples; index += 1) {
    const distance = index / 16;
    const point = { x: Math.floor(from.x + 0.5 + dx / magnitude * distance), y: Math.floor(from.y + 0.5 + dy / magnitude * distance) };
    if (point.x < 0 || point.y < 0 || point.x >= scenario.width || point.y >= scenario.height) break;
    if (samePoint(point, from) || cells.has(pointKey(point))) continue;
    if (!hasLineOfSight(scenario, from, point)) break;
    cells.set(pointKey(point), point);
  }
  return [...cells.values()];
};

export const automaticFireSecondaryTargets = (scenario: CombatScenario, attackerId: string, primaryTargetId: string) => {
  const attacker = scenario.combatants.find((unit) => unit.id === attackerId && !unit.defeated);
  const primary = scenario.combatants.find((unit) => unit.id === primaryTargetId && !unit.defeated);
  if (!attacker || !primary) return [];
  const laneToPrimary = fireLaneCells(scenario, attacker.position, primary.position);
  return scenario.combatants
    .filter((unit) => unit.id !== attacker.id && unit.id !== primary.id && !unit.defeated)
    .filter((unit) => {
      if (!snapShotTarget(attacker, unit)) return false;
      if (samePoint(unit.position, primary.position)) return true;
      const unitIsBeforePrimary = laneToPrimary.some((cell) => samePoint(cell, unit.position));
      const unitIsBeyondPrimary = fireLaneCells(scenario, attacker.position, unit.position).some((cell) => samePoint(cell, primary.position));
      return unitIsBeforePrimary || unitIsBeyondPrimary;
    })
    .sort((a, b) => distanceInSquares(attacker, a) - distanceInSquares(attacker, b) || scenario.combatants.indexOf(a) - scenario.combatants.indexOf(b));
};

export const validCoveringFireTargets = (scenario: CombatScenario, combatantId: string) => {
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId && !combatant.defeated);
  if (!unit) return [];
  return Array.from({ length: scenario.width }, (_, x) => Array.from({ length: scenario.height }, (_, y) => ({ x, y }))).flat()
    .filter((point) => inFieldOfFire(unit, point) && Math.ceil(Math.hypot(point.x - unit.position.x, point.y - unit.position.y)) <= unit.weapon.extremeRange && fireLaneCells(scenario, unit.position, point).length > 0);
};

const protectedByStructuralCorner = (attacker: GridPoint, target: GridPoint, segment: WallSegment) => {
  const targetCenter = { x: target.x + 0.5, y: target.y + 0.5 };
  const attackerCenter = { x: attacker.x + 0.5, y: attacker.y + 0.5 };
  return [segment.from, segment.to].some((endpoint) => {
    const touchesTargetCorner = (endpoint.x === target.x || endpoint.x === target.x + 1)
      && (endpoint.y === target.y || endpoint.y === target.y + 1);
    if (!touchesTargetCorner) return false;
    if (segment.from.y === segment.to.y) {
      const oppositeSides = (targetCenter.y - endpoint.y) * (attackerCenter.y - endpoint.y) < 0;
      const endpointIsStart = endpoint.x === Math.min(segment.from.x, segment.to.x);
      const attackerBeyondEndpoint = endpointIsStart ? attackerCenter.x < endpoint.x : attackerCenter.x > endpoint.x;
      return oppositeSides && attackerBeyondEndpoint;
    }
    const oppositeSides = (targetCenter.x - endpoint.x) * (attackerCenter.x - endpoint.x) < 0;
    const endpointIsStart = endpoint.y === Math.min(segment.from.y, segment.to.y);
    const attackerBeyondEndpoint = endpointIsStart ? attackerCenter.y < endpoint.y : attackerCenter.y > endpoint.y;
    return oppositeSides && attackerBeyondEndpoint;
  });
};

export const coverAssessment = (scenario: CombatScenario, attackerId: string, targetId: string): { value: number; source: "low-cover" | "console" | "close-machinery" | "platform-edge" | "corner-cover" | null } => {
  const attacker = scenario.combatants.find((unit) => unit.id === attackerId);
  const target = scenario.combatants.find((unit) => unit.id === targetId);
  if (!attacker || !target) return { value: 0, source: null };
  const attackerHeight = terrainHeightAt(scenario, attacker.position);
  const targetHeight = terrainHeightAt(scenario, target.position);
  const line = tracedCells(attacker.position, target.position);
  const crossesElevationAccess = (scenario.elevationAccessCells ?? []).some((cell) => samePoint(cell, attacker.position) || samePoint(cell, target.position) || line.has(pointKey(cell)));
  const protectedByPlatformEdge = attackerHeight < targetHeight && !crossesElevationAccess;
  const adjacentToTarget = (position: GridPoint) => Math.max(Math.abs(position.x - target.position.x), Math.abs(position.y - target.position.y)) === 1;
  const protectedByCargo = scenario.objects.some((object) => object.kind === "cover" && object.coverType !== "close-machinery" && !/machin|manifold/i.test(object.label)
    && line.has(pointKey(object.position))
    && terrainHeightAt(scenario, object.position) === targetHeight
    && adjacentToTarget(object.position));
  const protectedByConsole = scenario.objects.some((object) => (object.kind === "console" || object.coverType === "console") && line.has(pointKey(object.position)) && adjacentToTarget(object.position));
  const protectedByMachinery = scenario.objects.some((object) => (object.coverType === "close-machinery" || (object.kind === "cover" && /machin|manifold/i.test(object.label))) && line.has(pointKey(object.position)) && adjacentToTarget(object.position));
  const cornerClaimant = scenario.combatants.find((unit) => !unit.defeated && samePoint(unit.position, target.position));
  const protectedByCorner = cornerClaimant?.id === target.id && [...scenario.walls, ...scenario.doors]
    .some((segment) => protectedByStructuralCorner(attacker.position, target.position, segment));
  if (protectedByPlatformEdge) return { value: 2, source: "platform-edge" };
  if (attackerHeight <= targetHeight && protectedByCargo) return { value: 2, source: "low-cover" };
  if (protectedByConsole) return { value: 2, source: "console" };
  if (protectedByMachinery) return { value: 2, source: "close-machinery" };
  if (protectedByCorner) return { value: 2, source: "corner-cover" };
  return { value: 0, source: null };
};

export const coverProtection = (scenario: CombatScenario, attackerId: string, targetId: string) => coverAssessment(scenario, attackerId, targetId).value;

export const grenadeThrowCoverModifier = (scenario: CombatScenario, throwerId: string, target: GridPoint) => {
  const thrower = scenario.combatants.find((unit) => unit.id === throwerId);
  if (!thrower) return 0;
  const sightSource = { ...thrower, id: `grenade-aim:${throwerId}`, position: target };
  const aimedScenario = { ...scenario, combatants: [...scenario.combatants, sightSource] };
  return coverProtection(aimedScenario, sightSource.id, throwerId) > 0 ? -2 : 0;
};

export const rangedEnemies = (scenario: CombatScenario, combatantId: string) => {
  const attacker = scenario.combatants.find((unit) => unit.id === combatantId && !unit.defeated);
  if (!attacker) return [];
  return scenario.combatants.filter((target) => target.side !== attacker.side && !target.defeated
    && inFieldOfFire(attacker, target.position) && snapShotTarget(attacker, target) && visibilityAssessment(scenario, attacker, target).visible);
};

export const reachableMovement = (scenario: CombatScenario, combatantId: string, allowance = 4, trotting = false, maxSteps = Number.POSITIVE_INFINITY) => {
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId);
  if (!unit) return new Map<string, PlannedMove>();
  const results = new Map<string, PlannedMove>();
  const queue: { point: GridPoint; path: GridPoint[]; cost: number; facing: Combatant["facing"]; breakdown: string[] }[] = [{ point: unit.position, path: [], cost: 0, facing: unit.facing, breakdown: [] }];
  const stateKey = (point: GridPoint, facing: Combatant["facing"]) => `${pointKey(point)}:${facing}`;
  const bestCost = new Map([[stateKey(unit.position, unit.facing), 0]]);
  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;
    if (current.cost !== bestCost.get(stateKey(current.point, current.facing)) || current.cost >= allowance || current.path.length >= maxSteps) continue;
    const candidates = movementNeighbors(current.point);
    for (const destination of candidates) {
      const activeOccupants = scenario.combatants.filter((candidate) => candidate.id !== combatantId && !candidate.defeated && samePoint(candidate.position, destination));
      const enemyEntry = !trotting && activeOccupants.some((candidate) => candidate.side !== unit.side && !candidate.surrendered) && activeOccupants.length < 4;
      if (!validStep(scenario, combatantId, current.point, destination, enemyEntry)) continue;
      for (const nextFacing of movementFacingChoices(current.facing, current.point, destination, trotting)) {
        const turns = turnDistance(current.facing, nextFacing);
        const stepCost = movementStepCost(scenario, current.point, destination, nextFacing, trotting);
        const turnCost = turns * (trotting ? 2 : 1);
        const cost = current.cost + turnCost + stepCost;
        const key = stateKey(destination, nextFacing);
        if (cost > allowance || cost >= (bestCost.get(key) ?? Number.POSITIVE_INFINITY)) continue;
        bestCost.set(key, cost);
        const path = [...current.path, destination];
        const breakdown = [...current.breakdown, ...(turns ? [`turn ${turnCost}`] : []), `${current.point.x !== destination.x && current.point.y !== destination.y ? "forward diagonal" : "forward"} ${stepCost}`];
        const existing = results.get(pointKey(destination));
        if (!existing || cost < existing.cost) results.set(pointKey(destination), { combatantId, destination, path, cost, kind: enemyEntry ? "enemy-entry" : undefined, finalFacing: nextFacing, costBreakdown: breakdown });
        if (!enemyEntry) queue.push({ point: destination, path, cost, facing: nextFacing, breakdown });
      }
    }
  }
  return results;
};

export const reachableOpenMapMovement = ({ width, height, origin, facing, allowance, trotting, blockedCells = new Set<string>(), blockedEdges = new Set<string>(), activeOccupantsByCell = new Map<string, number>() }: { width: number; height: number; origin: GridPoint; facing: Combatant["facing"]; allowance: number; trotting: boolean; blockedCells?: ReadonlySet<string>; blockedEdges?: ReadonlySet<string>; activeOccupantsByCell?: ReadonlyMap<string, number> }) => {
  const results = new Map<string, PlannedMove>();
  const queue: { point: GridPoint; path: GridPoint[]; cost: number; facing: Combatant["facing"]; costBreakdown: string[] }[] = [{ point: origin, path: [], cost: 0, facing, costBreakdown: [] }];
  const stateKey = (point: GridPoint, direction: Combatant["facing"]) => `${pointKey(point)}:${direction}`;
  const bestCost = new Map([[stateKey(origin, facing), 0]]);
  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;
    if (current.cost !== bestCost.get(stateKey(current.point, current.facing)) || current.cost >= allowance) continue;
    for (const destination of movementNeighbors(current.point)) {
      if (destination.x < 0 || destination.y < 0 || destination.x >= width || destination.y >= height) continue;
      if (blockedCells.has(pointKey(destination))) continue;
      const activeOccupants = activeOccupantsByCell.get(pointKey(destination)) ?? 0;
      if (activeOccupants >= 4) continue;
      const diagonal = current.point.x !== destination.x && current.point.y !== destination.y;
      const crossingEdges = diagonal ? [
        tacticalMovementEdgeKey(current.point, { x: destination.x, y: current.point.y }),
        tacticalMovementEdgeKey(current.point, { x: current.point.x, y: destination.y }),
        tacticalMovementEdgeKey({ x: destination.x, y: current.point.y }, destination),
        tacticalMovementEdgeKey({ x: current.point.x, y: destination.y }, destination),
      ] : [tacticalMovementEdgeKey(current.point, destination)];
      if (crossingEdges.some((edge) => blockedEdges.has(edge))) continue;
      for (const nextFacing of movementFacingChoices(current.facing, current.point, destination, trotting)) {
        const cost = current.cost + movementTurnCost(current.facing, nextFacing, trotting) + movementStepCost({}, current.point, destination, nextFacing, trotting) + activeOccupants;
        const key = stateKey(destination, nextFacing);
        if (cost > allowance || cost >= (bestCost.get(key) ?? Number.POSITIVE_INFINITY)) continue;
        bestCost.set(key, cost);
        const path = [...current.path, destination];
        const costBreakdown = activeOccupants > 0 ? [...current.costBreakdown, `congestion +${activeOccupants}`] : current.costBreakdown;
        const existing = results.get(pointKey(destination));
        if (!existing || cost < existing.cost) results.set(pointKey(destination), { combatantId: "tactical-map", destination, path, cost, finalFacing: nextFacing, costBreakdown });
        queue.push({ point: destination, path, cost, facing: nextFacing, costBreakdown });
      }
    }
  }
  return results;
};

export const sidestepAndBackstepMoves = ({ width, height, origin, facing, allowance, blockedCells = new Set<string>(), blockedEdges = new Set<string>(), activeOccupantsByCell = new Map<string, number>() }: { width: number; height: number; origin: GridPoint; facing: Combatant["facing"]; allowance: number; blockedCells?: ReadonlySet<string>; blockedEdges?: ReadonlySet<string>; activeOccupantsByCell?: ReadonlyMap<string, number> }) => {
  const results = new Map<string, PlannedMove>();
  if (allowance < 4) return results;
  for (const destination of movementNeighbors(origin)) {
    if (forwardStep(facing, origin, destination)) continue;
    if (destination.x < 0 || destination.y < 0 || destination.x >= width || destination.y >= height) continue;
    if (blockedCells.has(pointKey(destination))) continue;
    const activeOccupants = activeOccupantsByCell.get(pointKey(destination)) ?? 0;
    const cost = 4 + activeOccupants;
    if (activeOccupants >= 4 || cost > allowance) continue;
    const diagonal = origin.x !== destination.x && origin.y !== destination.y;
    const crossingEdges = diagonal ? [
      tacticalMovementEdgeKey(origin, { x: destination.x, y: origin.y }),
      tacticalMovementEdgeKey(origin, { x: origin.x, y: destination.y }),
      tacticalMovementEdgeKey({ x: destination.x, y: origin.y }, destination),
      tacticalMovementEdgeKey({ x: origin.x, y: destination.y }, destination),
    ] : [tacticalMovementEdgeKey(origin, destination)];
    if (crossingEdges.some((edge) => blockedEdges.has(edge))) continue;
    results.set(pointKey(destination), { combatantId: "tactical-map", destination, path: [destination], cost, finalFacing: facing, costBreakdown: activeOccupants > 0 ? [`congestion +${activeOccupants}`] : [] });
  }
  return results;
};

export const ahlMeleeDiveMoves = (scenario: CombatScenario, combatantId: string) => {
  const attacker = scenario.combatants.find((unit) => unit.id === combatantId && !unit.defeated && unit.posture !== "prone");
  const results = new Map<string, PlannedMove>();
  if (!attacker || scenario.gravityMode === "zero-g") return results;
  const approaches = reachableMovement(scenario, combatantId, 6, true, 5);
  scenario.combatants.filter((target) => target.side !== attacker.side && !target.defeated && !target.surrendered).forEach((target) => {
    const candidates = [{ combatantId, destination: attacker.position, path: [], cost: 0, finalFacing: attacker.facing } as PlannedMove, ...approaches.values()]
      .filter((move) => Math.max(Math.abs(move.destination.x - target.position.x), Math.abs(move.destination.y - target.position.y)) === 1)
      .filter((move) => terrainHeightAt(scenario, move.destination) === terrainHeightAt(scenario, target.position)
        || (scenario.elevationAccessCells ?? []).some((access) => samePoint(access, move.destination) || samePoint(access, target.position)))
      .filter((move) => !scenario.walls.some((wall) => wallBlocksStep(move.destination, target.position, wall))
        && !scenario.doors.some((door) => !door.open && wallBlocksStep(move.destination, target.position, door)))
      .sort((first, second) => first.cost - second.cost || first.path.length - second.path.length);
    const approach = candidates[0];
    if (!approach) return;
    results.set(target.id, {
      combatantId,
      destination: { ...target.position },
      path: [...approach.path, { ...target.position }],
      cost: approach.cost,
      kind: "melee-dive",
      finalFacing: approach.finalFacing,
      costBreakdown: [...(approach.costBreakdown ?? []), "AHL dive 0"],
      meleeTargetId: target.id,
    });
  });
  return results;
};

export const zeroGravityPushes = (scenario: CombatScenario, combatantId: string) => {
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId && !combatant.defeated);
  if (!unit) return new Map<string, PlannedMove>();
  const results = new Map<string, PlannedMove>();
  const handholds = new Set((scenario.handholds ?? []).map(pointKey));
  const directions = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
  for (const direction of directions) {
    const path: GridPoint[] = [];
    let current = unit.position;
    while (true) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      if (!validStep(scenario, combatantId, current, next)) break;
      path.push(next);
      current = next;
      if (handholds.has(pointKey(current))) break;
    }
    if (path.length > 0) {
      const destination = path[path.length - 1];
      results.set(pointKey(destination), { combatantId, destination, path, cost: 3 });
    }
  }
  return results;
};

export const weaponRecoilDistance = (combatant: Combatant) => {
  const name = combatant.weapon.name.toLowerCase();
  const category = combatant.weapon.visualCategory;
  if (category === "laser-rifle" || name.includes("laser")) return 0;
  if (category === "gauss-rifle" || name.includes("gauss")) return 3;
  if (category === "pistol" || name.includes("pistol")) return 1;
  return 2;
};

export const zeroGravityRecoilPath = (scenario: CombatScenario, combatantId: string) => {
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId && !combatant.defeated);
  if (!unit || scenario.gravityMode !== "zero-g" || (scenario.handholds ?? []).some((point) => samePoint(point, unit.position))) return [];
  const distance = weaponRecoilDistance(unit);
  const forward = unit.facing === "north" ? { x: 0, y: -1 } : unit.facing === "east" ? { x: 1, y: 0 } : unit.facing === "south" ? { x: 0, y: 1 } : { x: -1, y: 0 };
  const path: GridPoint[] = [];
  let current = unit.position;
  for (let step = 0; step < distance; step += 1) {
    const next = { x: current.x - forward.x, y: current.y - forward.y };
    if (!validStep(scenario, combatantId, current, next)) break;
    path.push(next);
    current = next;
  }
  return path;
};

export const proposedMoveFor = (scenario: CombatScenario, combatantId: string, destination: GridPoint, allowance = 4) =>
  reachableMovement(scenario, combatantId, allowance).get(pointKey(destination)) ?? null;

export const pathContains = (path: GridPoint[], point: GridPoint) => path.some((entry) => samePoint(entry, point));
export const terrainHeightAt = (scenario: Pick<CombatScenario, "terrainByCell">, point: GridPoint) => scenario.terrainByCell?.[pointKey(point)] === "elevated" ? 0.65 : 0;

const reactionAdjacent = (scenario: CombatScenario, reactor: GridPoint, mover: GridPoint) => {
  const dx = Math.abs(reactor.x - mover.x);
  const dy = Math.abs(reactor.y - mover.y);
  return Math.max(dx, dy) === 1
    && terrainHeightAt(scenario, reactor) === terrainHeightAt(scenario, mover)
    && hasLineOfSight(scenario, reactor, mover);
};

export const adjacencyEntryStepIndex = (scenario: CombatScenario, reactor: GridPoint, moverOrigin: GridPoint, path: GridPoint[]) => path.findIndex((step, index) => {
  const previous = index === 0 ? moverOrigin : path[index - 1];
  return !reactionAdjacent(scenario, reactor, previous) && reactionAdjacent(scenario, reactor, step);
});
export const elevationAttackModifier = (scenario: Pick<CombatScenario, "terrainByCell">, attacker: Pick<Combatant, "position" | "posture">, target: Pick<Combatant, "position">) => attacker.posture !== "prone" && terrainHeightAt(scenario, attacker.position) > terrainHeightAt(scenario, target.position) ? 1 : 0;
export const structuralVerticalSpan = (baseHeight: number, aboveSurfaceHeight: number) => ({ height: baseHeight + aboveSurfaceHeight, centerY: (baseHeight + aboveSurfaceHeight) / 2 });
