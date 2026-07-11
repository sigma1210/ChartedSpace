import type { CombatScenario, DoorSegment, GridPoint, PlannedMove, WallSegment } from "./types";
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

export const closedDoorsAdjacentTo = (scenario: CombatScenario, combatantId: string) => {
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId);
  if (!unit) return [];
  return scenario.doors.filter((door) => !door.open && doorAdjacentCells(door).some((point) => samePoint(point, unit.position)));
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
  return scenario.objects.filter((object) => object.kind === "console"
    && Math.abs(object.position.x - unit.position.x) + Math.abs(object.position.y - unit.position.y) === 1);
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

const boundaryClear = (scenario: CombatScenario, from: GridPoint, to: GridPoint) => !scenario.walls.some((wall) => wallBlocksStep(from, to, wall))
  && !scenario.doors.some((door) => !door.open && wallBlocksStep(from, to, door));

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
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const samples = Math.max(Math.abs(dx), Math.abs(dy)) * 8;
  let cell = from;
  for (let index = 1; index <= samples; index += 1) {
    const next = { x: Math.floor(from.x + 0.5 + dx * index / samples), y: Math.floor(from.y + 0.5 + dy * index / samples) };
    if (next.x === cell.x && next.y === cell.y) continue;
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
    const candidates = [
      { x: current.point.x + 1, y: current.point.y }, { x: current.point.x - 1, y: current.point.y },
      { x: current.point.x, y: current.point.y + 1 }, { x: current.point.x, y: current.point.y - 1 },
    ];
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

export const proposedMoveFor = (scenario: CombatScenario, combatantId: string, destination: GridPoint, allowance = 4) =>
  reachableMovement(scenario, combatantId, allowance).get(pointKey(destination)) ?? null;

export const pathContains = (path: GridPoint[], point: GridPoint) => path.some((entry) => samePoint(entry, point));
