import type { CombatScenario, Combatant, DoorSegment, GridPoint, PlannedMove, TacticalLightSource, WallSegment } from "./types";
import { distanceInSquares, snapShotTarget } from "./combatResolution";
import { tacticalMovementEdgeKey } from "./tacticalTerrain";
import { tacticalCellsAlongWall, tacticalCellsSeparatedBySegment, tacticalMovementStepCrossesWall, tacticalWallBlockedMovementEdgeKeys } from "./tacticalSegmentGeometry";

export const pointKey = (point: GridPoint) => `${point.x}:${point.y}`;
export const activeOccupantCounts = (combatants: readonly Pick<Combatant, "id" | "position" | "defeated">[], excludedCombatantId?: string) => {
  const counts = new Map<string, number>();
  combatants.filter((unit) => unit.id !== excludedCombatantId && !unit.defeated).forEach((unit) => {
    const key = pointKey(unit.position);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return counts;
};
export const tacticalOccupantCounts = (scenario: Pick<CombatScenario, "combatants" | "elevationLevelByCell">, excludedCombatantId?: string) => {
  const counts = new Map<string, number>();
  scenario.combatants.filter((unit) => unit.id !== excludedCombatantId && !unit.defeated).forEach((unit) => {
    const level = unit.elevationLevel ?? scenario.elevationLevelByCell?.[pointKey(unit.position)] ?? 0;
    const key = `${pointKey(unit.position)}@${level}`;
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
const samePoint = (a: GridPoint, b: GridPoint) => a.x === b.x && a.y === b.y;
const combatantElevationLevel = (scenario: Pick<CombatScenario, "elevationLevelByCell" | "terrainByCell">, unit: Pick<Combatant, "position" | "elevationLevel">) => unit.elevationLevel
  ?? scenario.elevationLevelByCell?.[pointKey(unit.position)]
  ?? (scenario.terrainByCell?.[pointKey(unit.position)] === "elevated" ? 1 : 0);
const closeMachineryCellKeys = (scenario: Pick<CombatScenario, "terrainByCell" | "closeMachineryCells" | "objects">) => new Set([
  ...(scenario.closeMachineryCells ?? []).map(pointKey),
  ...Object.entries(scenario.terrainByCell ?? {}).filter(([, terrain]) => terrain === "close-machinery").map(([key]) => key),
  ...scenario.objects.filter((object) => object.coverType === "close-machinery" || (object.kind === "cover" && /machin|manifold/i.test(object.label))).map((object) => pointKey(object.position)),
]);
const isCloseMachineryCell = (scenario: Pick<CombatScenario, "terrainByCell" | "closeMachineryCells">, point: GridPoint) => scenario.terrainByCell?.[pointKey(point)] === "close-machinery"
  || (scenario.closeMachineryCells ?? []).some((cell) => samePoint(cell, point));
const wallBlocksStep = tacticalMovementStepCrossesWall;

const doorAdjacentCells = (door: DoorSegment): GridPoint[] => {
  const separated = tacticalCellsSeparatedBySegment(door);
  return [separated.first, separated.second];
};

export type TacticalPathfindingContext = {
  blockedTerrainCells: ReadonlySet<string>;
  blockedEdges: ReadonlySet<string>;
};

export const prepareTacticalPathfindingContext = (scenario: CombatScenario): TacticalPathfindingContext => ({
  blockedTerrainCells: new Set([
    ...scenario.objects.filter((object) => object.kind === "cover").map((object) => pointKey(object.position)),
    ...(scenario.treeTrunkCells ?? []).map(pointKey),
  ]),
  blockedEdges: new Set(
    [...scenario.walls, ...scenario.doors.filter((door) => !door.open)]
      .flatMap((segment) => [...tacticalWallBlockedMovementEdgeKeys(segment)]),
  ),
});

export const meleeEnemies = (scenario: CombatScenario, combatantId: string) => {
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId && !combatant.defeated);
  if (!unit) return [];
  return scenario.combatants.filter((candidate) => candidate.side !== unit.side && !candidate.defeated
    && (samePoint(candidate.position, unit.position) || (Math.max(Math.abs(candidate.position.x - unit.position.x), Math.abs(candidate.position.y - unit.position.y)) === 1 && inFieldOfFire(unit, candidate.position)))
    && (combatantElevationLevel(scenario, candidate) === combatantElevationLevel(scenario, unit)
      || (scenario.elevationAccessCells ?? []).some((access) => samePoint(access, candidate.position) || samePoint(access, unit.position)))
    && (samePoint(candidate.position, unit.position) || (!scenario.walls.some((wall) => wallBlocksStep(unit.position, candidate.position, wall))
      && !scenario.doors.some((door) => !door.open && wallBlocksStep(unit.position, candidate.position, door)))));
};

export const treatableAllies = (scenario: CombatScenario, combatantId: string) => {
  const medic = scenario.combatants.find((unit) => unit.id === combatantId && !unit.defeated);
  if (!medic) return [];
  return scenario.combatants.filter((patient) => patient.side === medic.side && patient.woundState !== "healthy" && patient.woundState !== "dead"
    && (patient.id === medic.id || Math.abs(patient.position.x - medic.position.x) + Math.abs(patient.position.y - medic.position.y) === 1));
};

const validStep = (
  scenario: CombatScenario,
  movingId: string,
  from: GridPoint,
  to: GridPoint,
  allowOccupiedDestination = false,
  pathfinding = prepareTacticalPathfindingContext(scenario),
  occupiedCells = new Set(scenario.combatants
    .filter((unit) => unit.id !== movingId && !unit.defeated)
    .map((unit) => pointKey(unit.position))),
) => {
  if (to.x < 0 || to.y < 0 || to.x >= scenario.width || to.y >= scenario.height) return false;
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  if (dx > 1 || dy > 1 || dx + dy === 0) return false;
  const diagonal = dx === 1 && dy === 1;
  if (diagonal) {
    if (terrainHeightAt(scenario, from) !== terrainHeightAt(scenario, to)) return false;
    const corners = [{ x: to.x, y: from.y }, { x: from.x, y: to.y }];
    if (corners.some((corner) => pathfinding.blockedTerrainCells.has(pointKey(corner))
      || occupiedCells.has(pointKey(corner))
      || terrainHeightAt(scenario, corner) !== terrainHeightAt(scenario, from))) return false;
    const edges = [[from, corners[0]], [from, corners[1]], [corners[0], to], [corners[1], to]] as const;
    if (edges.some(([start, end]) => pathfinding.blockedEdges.has(tacticalMovementEdgeKey(start, end)))) return false;
  }
  const changesElevation = terrainHeightAt(scenario, from) !== terrainHeightAt(scenario, to);
  if (changesElevation && !(scenario.elevationAccessCells ?? []).some((point) => samePoint(point, from) || samePoint(point, to))) return false;
  if (!allowOccupiedDestination && (pathfinding.blockedTerrainCells.has(pointKey(to)) || occupiedCells.has(pointKey(to)))) return false;
  if (pathfinding.blockedEdges.has(tacticalMovementEdgeKey(from, to))) return false;
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

const movementStepCost = (scenario: Pick<CombatScenario, "terrainByCell" | "closeMachineryCells">, origin: GridPoint, destination: GridPoint, facing?: Combatant["facing"], trotting = false) => {
  if (isCloseMachineryCell(scenario, destination)) return 6;
  const diagonal = origin.x !== destination.x && origin.y !== destination.y;
  const terrain = scenario.terrainByCell?.[pointKey(destination)];
  const difficultSurcharge = terrain === "difficult" ? 1 : 0;
  const terrainMinimum = terrain === "water" || terrain === "rock" ? 3 : terrain === "bush" ? 2 : 0;
  if (!facing) return Math.max((diagonal ? 2 : 1) + difficultSurcharge, terrainMinimum);
  if (!forwardStep(facing, origin, destination)) return trotting ? Number.POSITIVE_INFINITY : Math.max(6 + difficultSurcharge, terrainMinimum);
  return Math.max(
    (trotting ? diagonal ? 1.5 : 1 : diagonal ? 3 : 2) + difficultSurcharge,
    terrainMinimum,
  );
};

export const movementPathCost = (scenario: Pick<CombatScenario, "terrainByCell" | "closeMachineryCells">, origin: GridPoint, path: GridPoint[], initialFacing?: Combatant["facing"], trotting = false) => {
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

export const pathWithinMovementAllowance = (scenario: Pick<CombatScenario, "terrainByCell" | "closeMachineryCells">, origin: GridPoint, path: GridPoint[], allowance: number, initialFacing?: Combatant["facing"], trotting = false) => {
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

type TacticalPathNode = {
  point: GridPoint;
  cost: number;
  estimate: number;
  order: number;
  facing: Combatant["facing"];
  parent: TacticalPathNode | null;
};

const compareTacticalPathNodes = (first: TacticalPathNode, second: TacticalPathNode) =>
  first.estimate - second.estimate || first.cost - second.cost || first.order - second.order;

class TacticalPathPriorityQueue {
  private readonly nodes: TacticalPathNode[] = [];

  get size() {
    return this.nodes.length;
  }

  push(node: TacticalPathNode) {
    this.nodes.push(node);
    let index = this.nodes.length - 1;
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (compareTacticalPathNodes(this.nodes[parentIndex], node) <= 0) break;
      this.nodes[index] = this.nodes[parentIndex];
      index = parentIndex;
    }
    this.nodes[index] = node;
  }

  pop() {
    const first = this.nodes[0];
    const last = this.nodes.pop();
    if (!first || !last || this.nodes.length === 0) return first;
    let index = 0;
    while (true) {
      const leftIndex = index * 2 + 1;
      const rightIndex = leftIndex + 1;
      if (leftIndex >= this.nodes.length) break;
      const childIndex = rightIndex < this.nodes.length
        && compareTacticalPathNodes(this.nodes[rightIndex], this.nodes[leftIndex]) < 0
        ? rightIndex
        : leftIndex;
      if (compareTacticalPathNodes(this.nodes[childIndex], last) >= 0) break;
      this.nodes[index] = this.nodes[childIndex];
      index = childIndex;
    }
    this.nodes[index] = last;
    return first;
  }
}

const tacticalPathForNode = (node: TacticalPathNode) => {
  const path: GridPoint[] = [];
  let current: TacticalPathNode | null = node;
  while (current?.parent) {
    path.push(current.point);
    current = current.parent;
  }
  return path.reverse();
};

/** Returns the shortest legal path to any goal, excluding the combatant's starting cell. */
export const shortestPathToAny = (
  scenario: CombatScenario,
  combatantId: string,
  goals: GridPoint[],
  pathfinding = prepareTacticalPathfindingContext(scenario),
) => {
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId && !combatant.defeated);
  if (!unit || goals.length === 0) return null;
  const goalKeys = new Set(goals.map(pointKey));
  if (goalKeys.has(pointKey(unit.position))) return [];

  const heuristic = (point: GridPoint) => Math.min(...goals.map((goal) => Math.abs(goal.x - point.x) + Math.abs(goal.y - point.y)));
  const stateKey = (point: GridPoint, facing: Combatant["facing"]) => `${pointKey(point)}:${facing}`;
  const open = new TacticalPathPriorityQueue();
  open.push({ point: unit.position, cost: 0, estimate: heuristic(unit.position), order: 0, facing: unit.facing, parent: null });
  const bestCost = new Map([[stateKey(unit.position, unit.facing), 0]]);
  const occupiedCells = new Set(scenario.combatants
    .filter((combatant) => combatant.id !== combatantId && !combatant.defeated)
    .map((combatant) => pointKey(combatant.position)));
  let order = 1;

  while (open.size > 0) {
    const current = open.pop()!;
    if (current.cost !== bestCost.get(stateKey(current.point, current.facing))) continue;
    if (goalKeys.has(pointKey(current.point))) return tacticalPathForNode(current);

    for (const destination of movementNeighbors(current.point)) {
      if (!validStep(scenario, combatantId, current.point, destination, false, pathfinding, occupiedCells)) continue;
      for (const nextFacing of movementFacingChoices(current.facing, current.point, destination, false)) {
        const cost = current.cost + turnDistance(current.facing, nextFacing) + movementStepCost(scenario, current.point, destination, nextFacing);
        const key = stateKey(destination, nextFacing);
        if (cost >= (bestCost.get(key) ?? Number.POSITIVE_INFINITY)) continue;
        bestCost.set(key, cost);
        open.push({ point: destination, cost, estimate: cost + heuristic(destination), order, facing: nextFacing, parent: current });
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

export const filledLiquidHydrogenCellKeys = (scenario: Pick<CombatScenario, "liquidHydrogenAreas">) => new Set((scenario.liquidHydrogenAreas ?? [])
  .filter((area) => area.filled)
  .flatMap((area) => area.cells.map(pointKey)));

export const scenarioAvoidingLiquidHydrogenForPathfinding = (scenario: CombatScenario): CombatScenario => {
  const hazardousCells = filledLiquidHydrogenCellKeys(scenario);
  return {
    ...scenario,
    objects: [
      ...scenario.objects,
      ...[...hazardousCells].filter((key) => !scenario.objects.some((object) => pointKey(object.position) === key)).map((key, index) => {
        const [x, y] = key.split(":").map(Number);
        return { id: `pathfinding-liquid-hydrogen-${index}`, kind: "cover" as const, position: { x, y }, label: "Liquid Hydrogen" };
      }),
    ],
  };
};

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
  const treeTrunks = new Set((scenario.treeTrunkCells ?? []).map(pointKey));
  const closeMachinery = closeMachineryCellKeys(scenario);
  if (smoke.has(pointKey(from)) || smoke.has(pointKey(to))) return false;
  if (scenario.walls.some((wall) => wallBlocksStep(from, to, wall))
    || scenario.doors.some((door) => !door.open && wallBlocksStep(from, to, door))) return false;
  const highestEndpoint = Math.max(terrainHeightAt(scenario, from), terrainHeightAt(scenario, to));
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const samples = Math.max(Math.abs(dx), Math.abs(dy)) * 8;
  let cell = from;
  for (let index = 1; index <= samples; index += 1) {
    const next = { x: Math.floor(from.x + 0.5 + dx * index / samples), y: Math.floor(from.y + 0.5 + dy * index / samples) };
    if (next.x === cell.x && next.y === cell.y) continue;
    if (smoke.has(pointKey(next))) return false;
    if (treeTrunks.has(pointKey(next)) && !samePoint(next, from) && !samePoint(next, to)) return false;
    if (!samePoint(next, to) && terrainHeightAt(scenario, next) > highestEndpoint) return false;
    if (closeMachinery.has(pointKey(next)) && !samePoint(next, from) && !samePoint(next, to)) {
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

const lightingLevelAt = (scenario: CombatScenario, point: GridPoint) => scenario.flareCells?.some((cell) => samePoint(cell, point)) ? "illuminated" : scenario.lightingByCell?.[pointKey(point)] ?? scenario.defaultLighting ?? "illuminated";

export const tacticalLightSources = (scenario: CombatScenario) => [
  ...(scenario.lightSources ?? []).filter((source) => source.on !== false),
  ...(scenario.fireCells ?? []).map((position) => ({ id: `fire:${pointKey(position)}`, position, range: 1 })),
];

export const tacticalLightReaches = (scenario: CombatScenario, source: TacticalLightSource, point: GridPoint) => {
  if (Math.max(Math.abs(source.position.x - point.x), Math.abs(source.position.y - point.y)) > source.range || !hasLineOfSight(scenario, source.position, point)) return false;
  const interior = new Set((scenario.interiorCells ?? []).map(pointKey));
  const sourceInside = interior.has(pointKey(source.position));
  const pointInside = interior.has(pointKey(point));
  if (sourceInside === pointInside) return true;
  return scenario.doors.some((door) => {
    if (!door.open) return false;
    const [first, second] = doorAdjacentCells(door);
    const firstInside = interior.has(pointKey(first));
    const secondInside = interior.has(pointKey(second));
    if (firstInside === secondInside) return false;
    const insideCell = firstInside ? first : second;
    const outsideCell = firstInside ? second : first;
    return samePoint(point, sourceInside ? outsideCell : insideCell);
  });
};

export const tacticalBaseLightingLevelAt = (scenario: CombatScenario, point: GridPoint) => {
  const interior = new Set((scenario.interiorCells ?? []).map(pointKey));
  if (!interior.has(pointKey(point))) return scenario.exteriorLighting ?? lightingLevelAt(scenario, point);
  if (scenario.exteriorLighting === "illuminated" && scenario.doors.some((door) => {
    if (!door.open) return false;
    const [first, second] = doorAdjacentCells(door);
    const firstInside = interior.has(pointKey(first));
    const secondInside = interior.has(pointKey(second));
    if (firstInside === secondInside) return false;
    return samePoint(point, firstInside ? first : second);
  })) return "illuminated" as const;
  return "dark" as const;
};

export const tacticalLightPatchVisibleAt = (scenario: CombatScenario, source: TacticalLightSource, point: GridPoint) => tacticalLightReaches(scenario, source, point) && tacticalBaseLightingLevelAt(scenario, point) !== "illuminated";

export const tacticalLightingLevelAt = (scenario: CombatScenario, point: GridPoint) => {
  const illuminatedBySource = tacticalLightSources(scenario).some((source) => tacticalLightReaches(scenario, source, point));
  if (illuminatedBySource || scenario.flareCells?.some((cell) => samePoint(cell, point))) return "illuminated" as const;
  return tacticalBaseLightingLevelAt(scenario, point);
};

const preparedTacticalLineOfSight = (scenario: CombatScenario) => {
  const smoke = new Set((scenario.smokeCells ?? []).map(pointKey));
  const treeTrunks = new Set((scenario.treeTrunkCells ?? []).map(pointKey));
  const closeMachinery = closeMachineryCellKeys(scenario);
  const blockingSegments: WallSegment[] = [
    ...scenario.walls,
    ...scenario.doors.filter((door) => !door.open),
  ];
  const blockedEdges = new Set(blockingSegments.flatMap((segment) => [...tacticalWallBlockedMovementEdgeKeys(segment)]));
  const blockingSegmentsByCell = new Map<string, WallSegment[]>();
  blockingSegments.forEach((segment) => {
    tacticalCellsAlongWall(segment).forEach((cell) => {
      const key = pointKey(cell);
      blockingSegmentsByCell.set(key, [...blockingSegmentsByCell.get(key) ?? [], segment]);
    });
  });
  const candidateSegments = (from: GridPoint, to: GridPoint) => {
    const candidates = new Set<WallSegment>();
    const samples = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)) * 8;
    for (let index = 0; index <= samples; index += 1) {
      const point = samples === 0 ? from : {
        x: Math.floor(from.x + 0.5 + (to.x - from.x) * index / samples),
        y: Math.floor(from.y + 0.5 + (to.y - from.y) * index / samples),
      };
      for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
        for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
          blockingSegmentsByCell.get(pointKey({ x: point.x + xOffset, y: point.y + yOffset }))
            ?.forEach((segment) => candidates.add(segment));
        }
      }
    }
    return candidates;
  };
  const edgeClear = (from: GridPoint, to: GridPoint) => !blockedEdges.has(tacticalMovementEdgeKey(from, to));

  return (from: GridPoint, to: GridPoint) => {
    if (smoke.has(pointKey(from)) || smoke.has(pointKey(to))) return false;
    if ([...candidateSegments(from, to)].some((segment) => wallBlocksStep(from, to, segment))) return false;
    const highestEndpoint = Math.max(terrainHeightAt(scenario, from), terrainHeightAt(scenario, to));
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const samples = Math.max(Math.abs(dx), Math.abs(dy)) * 8;
    let cell = from;
    for (let index = 1; index <= samples; index += 1) {
      const next = { x: Math.floor(from.x + 0.5 + dx * index / samples), y: Math.floor(from.y + 0.5 + dy * index / samples) };
      if (samePoint(next, cell)) continue;
      const nextKey = pointKey(next);
      if (smoke.has(nextKey)) return false;
      if (treeTrunks.has(nextKey) && !samePoint(next, from) && !samePoint(next, to)) return false;
      if (!samePoint(next, to) && terrainHeightAt(scenario, next) > highestEndpoint) return false;
      if (closeMachinery.has(nextKey) && !samePoint(next, from) && !samePoint(next, to)) {
        const fromAdjacent = Math.max(Math.abs(from.x - next.x), Math.abs(from.y - next.y)) === 1;
        const toAdjacent = Math.max(Math.abs(to.x - next.x), Math.abs(to.y - next.y)) === 1;
        if (!fromAdjacent && !toAdjacent) return false;
      }
      if (next.x !== cell.x && next.y !== cell.y) {
        const horizontal = { x: next.x, y: cell.y };
        const vertical = { x: cell.x, y: next.y };
        const horizontalRoute = edgeClear(cell, horizontal) && edgeClear(horizontal, next);
        const verticalRoute = edgeClear(cell, vertical) && edgeClear(vertical, next);
        if (!horizontalRoute && !verticalRoute) return false;
      } else if (!edgeClear(cell, next)) return false;
      cell = next;
    }
    return true;
  };
};

export const tacticalCrewVisiblePointKeys = (
  scenario: CombatScenario,
  points: readonly GridPoint[],
) => {
  const visible = new Set<string>();
  const observers = scenario.combatants.filter(
    (unit) => unit.side === "player" && !unit.defeated && !unit.surrendered,
  );
  if (observers.length === 0 || points.length === 0) return visible;

  const lineOfSight = preparedTacticalLineOfSight(scenario);
  const uniquePoints = new Map(points.map((point) => [pointKey(point), point]));
  uniquePoints.forEach((point, key) => {
    if (
      observers.some(
        (observer) =>
          samePoint(observer.position, point) ||
          lineOfSight(observer.position, point),
      )
    ) {
      visible.add(key);
    }
  });

  return visible;
};

export type TacticalVisibilityContext = {
  lightingLevelAt: (point: GridPoint) => ReturnType<typeof tacticalLightingLevelAt>;
  lineOfSight: (from: GridPoint, to: GridPoint) => boolean;
};

export const prepareTacticalVisibilityContext = (scenario: CombatScenario): TacticalVisibilityContext => {
  const lineOfSight = preparedTacticalLineOfSight(scenario);
  const interior = new Set((scenario.interiorCells ?? []).map(pointKey));
  const flares = new Set((scenario.flareCells ?? []).map(pointKey));
  const sources = tacticalLightSources(scenario);
  const lightingByCell = new Map<string, ReturnType<typeof tacticalLightingLevelAt>>();
  const sourceReaches = (source: TacticalLightSource, point: GridPoint) => {
    if (Math.max(Math.abs(source.position.x - point.x), Math.abs(source.position.y - point.y)) > source.range
      || !lineOfSight(source.position, point)) return false;
    const sourceInside = interior.has(pointKey(source.position));
    const pointInside = interior.has(pointKey(point));
    if (sourceInside === pointInside) return true;
    return scenario.doors.some((door) => {
      if (!door.open) return false;
      const [first, second] = doorAdjacentCells(door);
      const firstInside = interior.has(pointKey(first));
      const secondInside = interior.has(pointKey(second));
      if (firstInside === secondInside) return false;
      const insideCell = firstInside ? first : second;
      const outsideCell = firstInside ? second : first;
      return samePoint(point, sourceInside ? outsideCell : insideCell);
    });
  };
  const baseLightingLevelAt = (point: GridPoint) => {
    if (!interior.has(pointKey(point))) return scenario.exteriorLighting ?? lightingLevelAt(scenario, point);
    if (scenario.exteriorLighting === "illuminated" && scenario.doors.some((door) => {
      if (!door.open) return false;
      const [first, second] = doorAdjacentCells(door);
      const firstInside = interior.has(pointKey(first));
      const secondInside = interior.has(pointKey(second));
      if (firstInside === secondInside) return false;
      return samePoint(point, firstInside ? first : second);
    })) return "illuminated" as const;
    return "dark" as const;
  };
  const lightingLevelAtPoint = (point: GridPoint) => {
    const key = pointKey(point);
    const cached = lightingByCell.get(key);
    if (cached) return cached;
    const lighting = flares.has(key) || sources.some((source) => sourceReaches(source, point))
      ? "illuminated" as const
      : baseLightingLevelAt(point);
    lightingByCell.set(key, lighting);
    return lighting;
  };
  return { lightingLevelAt: lightingLevelAtPoint, lineOfSight };
};

export const tacticalVisibilityAssessment = (
  scenario: CombatScenario,
  observer: Combatant,
  target: Combatant,
  prepared?: TacticalVisibilityContext,
) => {
  const observerLighting = prepared?.lightingLevelAt(observer.position) ?? tacticalLightingLevelAt(scenario, observer.position);
  const targetLighting = prepared?.lightingLevelAt(target.position) ?? tacticalLightingLevelAt(scenario, target.position);
  const range = distanceInSquares(observer, target);
  const visionEnhanced = observer.visionMode === "enhanced" || observer.weapon.enhancedVision === true;
  const geometricLineOfSight = prepared?.lineOfSight(observer.position, target.position)
    ?? hasLineOfSight(scenario, observer.position, target.position);

  if (target.concealed) return {
    observable: false,
    hasLineOfSight: geometricLineOfSight,
    observerLighting,
    targetLighting,
    range,
    darknessModifier: 0,
    visionEnhanced,
    reason: "concealed" as const,
  };
  if (!geometricLineOfSight) return {
    observable: false,
    hasLineOfSight: false,
    observerLighting,
    targetLighting,
    range,
    darknessModifier: 0,
    visionEnhanced,
    reason: "blocked" as const,
  };
  if (targetLighting !== "dark") return {
    observable: true,
    hasLineOfSight: true,
    observerLighting,
    targetLighting,
    range,
    darknessModifier: 0,
    visionEnhanced,
    reason: "illuminated-target" as const,
  };
  if (visionEnhanced) return {
    observable: true,
    hasLineOfSight: true,
    observerLighting,
    targetLighting,
    range,
    darknessModifier: 0,
    visionEnhanced,
    reason: "enhanced-vision" as const,
  };
  return {
    observable: true,
    hasLineOfSight: true,
    observerLighting,
    targetLighting,
    range,
    darknessModifier: -range,
    visionEnhanced,
    reason: "darkness" as const,
  };
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

const fireLaneCells = (scenario: CombatScenario, from: GridPoint, to: GridPoint) => {
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

export const coverAssessment = (scenario: CombatScenario, attackerId: string, targetId: string): { value: number; source: "low-cover" | "console" | "close-machinery" | "platform-edge" | "corner-cover" | "bush" | "rock" | null } => {
  const attacker = scenario.combatants.find((unit) => unit.id === attackerId);
  const target = scenario.combatants.find((unit) => unit.id === targetId);
  if (!attacker || !target) return { value: 0, source: null };
  const attackerHeight = combatantElevationLevel(scenario, attacker) * 0.65;
  const targetHeight = combatantElevationLevel(scenario, target) * 0.65;
  const line = tracedCells(attacker.position, target.position);
  const crossesElevationAccess = (scenario.elevationAccessCells ?? []).some((cell) => samePoint(cell, attacker.position) || samePoint(cell, target.position) || line.has(pointKey(cell)));
  const protectedByPlatformEdge = attackerHeight < targetHeight && !crossesElevationAccess;
  const adjacentToTarget = (position: GridPoint) => Math.max(Math.abs(position.x - target.position.x), Math.abs(position.y - target.position.y)) === 1;
  const protectedByCargo = scenario.objects.some((object) => object.kind === "cover" && object.coverType !== "close-machinery" && !/machin|manifold/i.test(object.label)
    && line.has(pointKey(object.position))
    && terrainHeightAt(scenario, object.position) === targetHeight
    && adjacentToTarget(object.position));
  const protectedByConsole = scenario.objects.some((object) => (object.kind === "console" || object.coverType === "console") && line.has(pointKey(object.position)) && adjacentToTarget(object.position));
  const protectedByBush = (scenario.bushCells ?? []).some((position) => (
    samePoint(position, target.position)
    || (line.has(pointKey(position)) && adjacentToTarget(position))
  ));
  const protectedByRock = (scenario.rockCells ?? []).some((position) => (
    samePoint(position, target.position)
    || (line.has(pointKey(position)) && adjacentToTarget(position))
  ));
  const attackerTargetAdjacent = Math.max(Math.abs(attacker.position.x - target.position.x), Math.abs(attacker.position.y - target.position.y)) === 1;
  const protectedByMachinery = !attackerTargetAdjacent && [...closeMachineryCellKeys(scenario)].some((key) => {
    const machinery = line.get(key);
    return machinery && adjacentToTarget(machinery) && Math.max(Math.abs(attacker.position.x - machinery.x), Math.abs(attacker.position.y - machinery.y)) !== 1;
  });
  const cornerClaimant = scenario.combatants.find((unit) => !unit.defeated && samePoint(unit.position, target.position));
  const protectedByCorner = cornerClaimant?.id === target.id && [...scenario.walls, ...scenario.doors]
    .some((segment) => protectedByStructuralCorner(attacker.position, target.position, segment));
  if (protectedByPlatformEdge) return { value: 2, source: "platform-edge" };
  if (attackerHeight <= targetHeight && protectedByCargo) return { value: 2, source: "low-cover" };
  if (protectedByConsole) return { value: 2, source: "console" };
  if (protectedByBush) return { value: 2, source: "bush" };
  if (protectedByRock) return { value: 2, source: "rock" };
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

export const tacticalRangedEnemies = (scenario: CombatScenario, combatantId: string, visibility?: TacticalVisibilityContext) => {
  const attacker = scenario.combatants.find((unit) => unit.id === combatantId && !unit.defeated);
  if (!attacker) return [];
  return scenario.combatants.filter((target) => target.side !== attacker.side && !target.defeated
    && inFieldOfFire(attacker, target.position)
    && snapShotTarget(attacker, target)
    && tacticalVisibilityAssessment(scenario, attacker, target, visibility).observable);
};

export const reachableOpenMapMovement = ({ width, height, origin, originElevationLevel, facing, allowance, trotting, blockedCells = new Set<string>(), blockedEdges = new Set<string>(), activeOccupantsByCell = new Map<string, number>(), terrainByCell = {}, elevationLevelByCell = {}, bridges = [], closeMachineryCells = [], elevationAccessCells = [], elevationTransitions = [] }: { width: number; height: number; origin: GridPoint; originElevationLevel?: number; facing: Combatant["facing"]; allowance: number; trotting: boolean; blockedCells?: ReadonlySet<string>; blockedEdges?: ReadonlySet<string>; activeOccupantsByCell?: ReadonlyMap<string, number>; terrainByCell?: CombatScenario["terrainByCell"]; elevationLevelByCell?: CombatScenario["elevationLevelByCell"]; bridges?: CombatScenario["bridges"]; closeMachineryCells?: GridPoint[]; elevationAccessCells?: GridPoint[]; elevationTransitions?: CombatScenario["elevationTransitions"] }) => {
  const results = new Map<string, PlannedMove>();
  const elevationAccess = new Set(elevationAccessCells.map(pointKey));
  const elevationLevel = (point: GridPoint) => elevationLevelByCell?.[pointKey(point)] ?? (terrainByCell?.[pointKey(point)] === "elevated" ? 1 : 0);
  const bridgeLevelByCell = new Map(bridges.flatMap((bridge) => bridge.cells.map((point) => [pointKey(point), bridge.elevationLevel] as const)));
  const rampMembershipByCell = new Map(
    (elevationTransitions ?? [])
      .filter((transition) => transition.kind === "ramp")
      .flatMap((transition) => transition.path.map((point, index) => [
        pointKey(point),
        { transition, index },
      ] as const)),
  );
  const rampStepAllowed = (
    from: GridPoint,
    fromLevel: number,
    to: GridPoint,
    toLevel: number,
  ) => {
    const fromMembership = rampMembershipByCell.get(pointKey(from));
    const toMembership = rampMembershipByCell.get(pointKey(to));
    if (!fromMembership && !toMembership) return true;
    const flatTransition = [
      fromMembership?.transition,
      toMembership?.transition,
    ].find((transition) =>
      transition
      && transition.lowerLevel === transition.upperLevel) ?? null;
    if (flatTransition
      && fromLevel !== flatTransition.lowerLevel
      && toLevel !== flatTransition.lowerLevel) {
      return true;
    }
    if (fromMembership && toMembership
      && fromMembership.transition.id === toMembership.transition.id) {
      return Math.abs(fromMembership.index - toMembership.index) === 1;
    }
    const fromIsEndpoint = fromMembership
      ? fromMembership.index === 0
        || fromMembership.index === fromMembership.transition.path.length - 1
      : true;
    const toIsEndpoint = toMembership
      ? toMembership.index === 0
        || toMembership.index === toMembership.transition.path.length - 1
      : true;
    return fromIsEndpoint && toIsEndpoint;
  };
  const flatRampLevelByCell = new Map(
    (elevationTransitions ?? [])
      .filter((transition) =>
        transition.kind === "ramp"
        && transition.lowerLevel === transition.upperLevel)
      .flatMap((transition) => transition.path.map((point) => [
        pointKey(point),
        transition.lowerLevel,
      ] as const)),
  );
  const availableLevels = (point: GridPoint) => {
    const solidLevel = elevationLevel(point);
    const bridgeLevel = bridgeLevelByCell.get(pointKey(point));
    const flatRampLevel = flatRampLevelByCell.get(pointKey(point));
    return [...new Set([
      solidLevel,
      ...(bridgeLevel === undefined ? [] : [bridgeLevel]),
      ...(flatRampLevel === undefined ? [] : [flatRampLevel]),
    ])];
  };
  const initialLevel = originElevationLevel ?? elevationLevel(origin);
  const transitionForStep = (
    from: GridPoint,
    fromLevel: number,
    to: GridPoint,
    toLevel: number,
  ) => elevationTransitions?.find((transition) => {
    const lowerAccess = transition.path[transition.path.length - 2] ?? transition.lower;
    return (
      samePoint(from, lowerAccess)
      && fromLevel === transition.lowerLevel
      && samePoint(to, transition.upper)
      && toLevel === transition.upperLevel
    ) || (
      samePoint(from, transition.upper)
      && fromLevel === transition.upperLevel
      && samePoint(to, lowerAccess)
      && toLevel === transition.lowerLevel
    );
  });
  const queue: { point: GridPoint; level: number; path: GridPoint[]; pathLevels: number[]; cost: number; facing: Combatant["facing"]; costBreakdown: string[] }[] = [{ point: origin, level: initialLevel, path: [], pathLevels: [], cost: 0, facing, costBreakdown: [] }];
  const stateKey = (point: GridPoint, level: number, direction: Combatant["facing"]) => `${pointKey(point)}@${level}:${direction}`;
  const bestCost = new Map([[stateKey(origin, initialLevel, facing), 0]]);
  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;
    if (current.cost !== bestCost.get(stateKey(current.point, current.level, current.facing)) || current.cost >= allowance) continue;
    for (const destination of movementNeighbors(current.point)) {
      if (destination.x < 0 || destination.y < 0 || destination.x >= width || destination.y >= height) continue;
      if (blockedCells.has(pointKey(destination))) continue;
      const destinationLevels = availableLevels(destination).filter((destinationLevel) => destinationLevel === current.level
        || Math.abs(destinationLevel - current.level) === 0.5
        || Boolean(transitionForStep(current.point, current.level, destination, destinationLevel))
        || (elevationAccess.has(pointKey(current.point)) || elevationAccess.has(pointKey(destination))))
        .filter((destinationLevel) =>
          rampStepAllowed(current.point, current.level, destination, destinationLevel));
      if (destinationLevels.length === 0) continue;
      const diagonal = current.point.x !== destination.x && current.point.y !== destination.y;
      const crossingEdges = diagonal ? [
        tacticalMovementEdgeKey(current.point, destination),
        tacticalMovementEdgeKey(current.point, { x: destination.x, y: current.point.y }),
        tacticalMovementEdgeKey(current.point, { x: current.point.x, y: destination.y }),
        tacticalMovementEdgeKey({ x: destination.x, y: current.point.y }, destination),
        tacticalMovementEdgeKey({ x: current.point.x, y: destination.y }, destination),
      ] : [tacticalMovementEdgeKey(current.point, destination)];
      if (crossingEdges.some((edge) => blockedEdges.has(edge))) continue;
      for (const destinationLevel of destinationLevels) {
        const elevationTransition = current.level === destinationLevel
          ? undefined
          : transitionForStep(current.point, current.level, destination, destinationLevel);
        if (current.point.x !== destination.x && current.point.y !== destination.y && current.level !== destinationLevel) continue;
        const activeOccupants = activeOccupantsByCell.get(`${pointKey(destination)}@${destinationLevel}`) ?? activeOccupantsByCell.get(pointKey(destination)) ?? 0;
        if (activeOccupants >= 4) continue;
        for (const nextFacing of movementFacingChoices(current.facing, current.point, destination, trotting)) {
          const stepCost = elevationTransition?.movementCost
            ?? movementStepCost({ terrainByCell, closeMachineryCells }, current.point, destination, nextFacing, trotting);
          const cost = current.cost + movementTurnCost(current.facing, nextFacing, trotting) + stepCost + activeOccupants;
          const key = stateKey(destination, destinationLevel, nextFacing);
          if (cost > allowance || cost >= (bestCost.get(key) ?? Number.POSITIVE_INFINITY)) continue;
          bestCost.set(key, cost);
          const path = [...current.path, destination];
          const pathLevels = [...current.pathLevels, destinationLevel];
          const transitionBreakdown = elevationTransition?.kind === "ladder" ? ["ladder 3 AP"] : [];
          const costBreakdown = [
            ...current.costBreakdown,
            ...transitionBreakdown,
            ...(activeOccupants > 0 ? [`congestion +${activeOccupants}`] : []),
          ];
          const resultKey = pointKey(destination);
          const existing = results.get(resultKey);
          if (!existing || cost < existing.cost) results.set(resultKey, { combatantId: "tactical-map", destination, path, cost, finalFacing: nextFacing, finalElevationLevel: destinationLevel, pathElevationLevels: pathLevels, costBreakdown });
          queue.push({ point: destination, level: destinationLevel, path, pathLevels, cost, facing: nextFacing, costBreakdown });
        }
      }
    }
  }
  return results;
};

export const sidestepAndBackstepMoves = ({ width, height, origin, facing, allowance, blockedCells = new Set<string>(), blockedEdges = new Set<string>(), activeOccupantsByCell = new Map<string, number>(), terrainByCell = {}, elevationLevelByCell = {}, closeMachineryCells = [], elevationAccessCells = [] }: { width: number; height: number; origin: GridPoint; facing: Combatant["facing"]; allowance: number; blockedCells?: ReadonlySet<string>; blockedEdges?: ReadonlySet<string>; activeOccupantsByCell?: ReadonlyMap<string, number>; terrainByCell?: CombatScenario["terrainByCell"]; elevationLevelByCell?: CombatScenario["elevationLevelByCell"]; closeMachineryCells?: GridPoint[]; elevationAccessCells?: GridPoint[] }) => {
  const results = new Map<string, PlannedMove>();
  const elevationAccess = new Set(elevationAccessCells.map(pointKey));
  if (allowance < 4) return results;
  for (const destination of movementNeighbors(origin)) {
    if (forwardStep(facing, origin, destination)) continue;
    if (destination.x < 0 || destination.y < 0 || destination.x >= width || destination.y >= height) continue;
    if (blockedCells.has(pointKey(destination))) continue;
    const originElevation = elevationLevelByCell?.[pointKey(origin)] ?? (terrainByCell?.[pointKey(origin)] === "elevated" ? 1 : 0);
    const destinationElevation = elevationLevelByCell?.[pointKey(destination)] ?? (terrainByCell?.[pointKey(destination)] === "elevated" ? 1 : 0);
    const changesElevation = originElevation !== destinationElevation;
    if (changesElevation && !elevationAccess.has(pointKey(origin)) && !elevationAccess.has(pointKey(destination))) continue;
    const activeOccupants = activeOccupantsByCell.get(pointKey(destination)) ?? 0;
    const cost = (isCloseMachineryCell({ terrainByCell, closeMachineryCells }, destination) ? 6 : 4) + activeOccupants;
    if (activeOccupants >= 4 || cost > allowance) continue;
    const diagonal = origin.x !== destination.x && origin.y !== destination.y;
    const crossingEdges = diagonal ? [
      tacticalMovementEdgeKey(origin, destination),
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
export const terrainHeightAt = (scenario: Pick<CombatScenario, "terrainByCell" | "elevationLevelByCell">, point: GridPoint) => {
  const level = scenario.elevationLevelByCell?.[pointKey(point)];
  if (level !== undefined) return level * 0.65;
  return scenario.terrainByCell?.[pointKey(point)] === "elevated" ? 0.65 : 0;
};

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
