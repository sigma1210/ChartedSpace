import type { CombatScenario, Combatant, DoorSegment, GridPoint, PlannedMove, WallSegment } from "./types";
import { snapShotTarget } from "./combatResolution";

export const pointKey = (point: GridPoint) => `${point.x}:${point.y}`;
const samePoint = (a: GridPoint, b: GridPoint) => a.x === b.x && a.y === b.y;
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
    && !scenario.walls.some((wall) => wallBlocksStep(unit.position, candidate.position, wall))
    && !scenario.doors.some((door) => !door.open && wallBlocksStep(unit.position, candidate.position, door)));
};

export const adjacentObjectives = (scenario: CombatScenario, combatantId: string) => {
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId && !combatant.defeated);
  if (!unit) return [];
  const activeStageObjectiveId = scenario.victoryCondition === "staged-objectives" ? scenario.stageObjectiveIds?.find((id) => !scenario.objects.find((object) => object.id === id)?.completed) : null;
  return scenario.objects.filter((object) => object.kind !== "cover" && object.kind !== "control" && !object.completed
    && (!activeStageObjectiveId || object.id === activeStageObjectiveId)
    && (object.kind !== "extraction" || unit.id === scenario.captiveId)
    && (object.kind === "extraction"
      ? Math.abs(object.position.x - unit.position.x) + Math.abs(object.position.y - unit.position.y) <= 1
      : Math.abs(object.position.x - unit.position.x) + Math.abs(object.position.y - unit.position.y) === 1));
};

export const treatableAllies = (scenario: CombatScenario, combatantId: string) => {
  const medic = scenario.combatants.find((unit) => unit.id === combatantId && !unit.defeated);
  if (!medic) return [];
  return scenario.combatants.filter((patient) => patient.side === medic.side && patient.woundState !== "healthy" && patient.woundState !== "dead"
    && (patient.id === medic.id || Math.abs(patient.position.x - medic.position.x) + Math.abs(patient.position.y - medic.position.y) === 1));
};

const validStep = (scenario: CombatScenario, movingId: string, from: GridPoint, to: GridPoint) => {
  if (to.x < 0 || to.y < 0 || to.x >= scenario.width || to.y >= scenario.height) return false;
  if (Math.abs(to.x - from.x) + Math.abs(to.y - from.y) !== 1) return false;
  if (blockedCells(scenario, movingId).has(pointKey(to))) return false;
  if (scenario.walls.some((segment) => wallBlocksStep(from, to, segment))) return false;
  if (scenario.doors.some((door) => !door.open && wallBlocksStep(from, to, door))) return false;
  return true;
};

const pathfindingNeighbors = (point: GridPoint): GridPoint[] => [
  { x: point.x + 1, y: point.y },
  { x: point.x, y: point.y + 1 },
  { x: point.x - 1, y: point.y },
  { x: point.x, y: point.y - 1 },
];

/** Returns the shortest legal path to any goal, excluding the combatant's starting cell. */
export const shortestPathToAny = (scenario: CombatScenario, combatantId: string, goals: GridPoint[]) => {
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId && !combatant.defeated);
  if (!unit || goals.length === 0) return null;
  const goalKeys = new Set(goals.map(pointKey));
  if (goalKeys.has(pointKey(unit.position))) return [];

  const heuristic = (point: GridPoint) => Math.min(...goals.map((goal) => Math.abs(goal.x - point.x) + Math.abs(goal.y - point.y)));
  const open: { point: GridPoint; path: GridPoint[]; cost: number; estimate: number; order: number }[] = [
    { point: unit.position, path: [], cost: 0, estimate: heuristic(unit.position), order: 0 },
  ];
  const bestCost = new Map([[pointKey(unit.position), 0]]);
  let order = 1;

  while (open.length > 0) {
    open.sort((a, b) => a.estimate - b.estimate || a.cost - b.cost || a.order - b.order);
    const current = open.shift()!;
    if (current.cost !== bestCost.get(pointKey(current.point))) continue;
    if (goalKeys.has(pointKey(current.point))) return current.path;

    for (const destination of pathfindingNeighbors(current.point)) {
      if (!validStep(scenario, combatantId, current.point, destination)) continue;
      const cost = current.cost + 1;
      const key = pointKey(destination);
      if (cost >= (bestCost.get(key) ?? Number.POSITIVE_INFINITY)) continue;
      bestCost.set(key, cost);
      open.push({ point: destination, path: [...current.path, destination], cost, estimate: cost + heuristic(destination), order });
      order += 1;
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

const boundaryClear = (scenario: CombatScenario, from: GridPoint, to: GridPoint) => !scenario.walls.some((wall) => wallBlocksStep(from, to, wall))
  && !scenario.doors.some((door) => !door.open && wallBlocksStep(from, to, door));

export const depressurizedCells = (scenario: CombatScenario) => {
  const cells = new Map<string, GridPoint>();
  const queue = [...(scenario.vacuumSources ?? [])];
  queue.forEach((point) => cells.set(pointKey(point), point));
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of pathfindingNeighbors(current)) {
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

export const validGrenadeTargets = (scenario: CombatScenario, combatantId: string, range = 6) => {
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId && !combatant.defeated);
  if (!unit) return [];
  return Array.from({ length: scenario.width }, (_, x) => Array.from({ length: scenario.height }, (_, y) => ({ x, y }))).flat()
    .filter((point) => Math.abs(point.x - unit.position.x) + Math.abs(point.y - unit.position.y) <= range && hasLineOfSight(scenario, unit.position, point));
};

export const grenadeBlastCells = (scenario: CombatScenario, center: GridPoint) => [
  center,
  { x: center.x + 1, y: center.y },
  { x: center.x - 1, y: center.y },
  { x: center.x, y: center.y + 1 },
  { x: center.x, y: center.y - 1 },
].filter((point) => point.x >= 0 && point.y >= 0 && point.x < scenario.width && point.y < scenario.height
  && (samePoint(point, center) || boundaryClear(scenario, center, point)));

export const grenadeCoverProtection = (scenario: CombatScenario, center: GridPoint, target: GridPoint) => {
  const adjacent = Math.abs(center.x - target.x) + Math.abs(center.y - target.y) === 1;
  return adjacent && scenario.objects.some((object) => object.kind === "cover" && samePoint(object.position, center)) ? 2 : 0;
};

export const hasLineOfSight = (scenario: CombatScenario, from: GridPoint, to: GridPoint) => {
  const smoke = new Set((scenario.smokeCells ?? []).map(pointKey));
  if (smoke.has(pointKey(from)) || smoke.has(pointKey(to))) return false;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const samples = Math.max(Math.abs(dx), Math.abs(dy)) * 8;
  let cell = from;
  for (let index = 1; index <= samples; index += 1) {
    const next = { x: Math.floor(from.x + 0.5 + dx * index / samples), y: Math.floor(from.y + 0.5 + dy * index / samples) };
    if (next.x === cell.x && next.y === cell.y) continue;
    if (smoke.has(pointKey(next))) return false;
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

export const validCoveringFireTargets = (scenario: CombatScenario, combatantId: string) => {
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId && !combatant.defeated);
  if (!unit) return [];
  return Array.from({ length: scenario.width }, (_, x) => Array.from({ length: scenario.height }, (_, y) => ({ x, y }))).flat()
    .filter((point) => Math.ceil(Math.hypot(point.x - unit.position.x, point.y - unit.position.y)) <= unit.weapon.extremeRange && fireLaneCells(scenario, unit.position, point).length > 0);
};

export const coverProtection = (scenario: CombatScenario, attackerId: string, targetId: string) => {
  const attacker = scenario.combatants.find((unit) => unit.id === attackerId);
  const target = scenario.combatants.find((unit) => unit.id === targetId);
  if (!attacker || !target) return 0;
  const line = tracedCells(attacker.position, target.position);
  const protectedByCargo = scenario.objects.some((object) => object.kind === "cover"
    && line.has(pointKey(object.position))
    && Math.abs(object.position.x - target.position.x) + Math.abs(object.position.y - target.position.y) === 1);
  return protectedByCargo ? 2 : 0;
};

export const rangedEnemies = (scenario: CombatScenario, combatantId: string) => {
  const attacker = scenario.combatants.find((unit) => unit.id === combatantId && !unit.defeated);
  if (!attacker) return [];
  return scenario.combatants.filter((target) => target.side !== attacker.side && !target.defeated && snapShotTarget(attacker, target) && hasLineOfSight(scenario, attacker.position, target.position));
};

export const reachableMovement = (scenario: CombatScenario, combatantId: string, allowance = 4) => {
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId);
  if (!unit) return new Map<string, PlannedMove>();
  const results = new Map<string, PlannedMove>();
  const queue: { point: GridPoint; path: GridPoint[] }[] = [{ point: unit.position, path: [] }];
  const visited = new Set([pointKey(unit.position)]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.path.length >= allowance) continue;
    const candidates = pathfindingNeighbors(current.point);
    for (const destination of candidates) {
      const key = pointKey(destination);
      if (visited.has(key) || !validStep(scenario, combatantId, current.point, destination)) continue;
      visited.add(key);
      const path = [...current.path, destination];
      results.set(key, { combatantId, destination, path, cost: path.length });
      queue.push({ point: destination, path });
    }
  }
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
