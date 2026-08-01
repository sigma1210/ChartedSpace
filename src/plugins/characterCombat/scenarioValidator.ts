import type { CombatScenario, DoorSegment, GridPoint, WallSegment } from "./types";
import {
  tacticalCellsSeparatedBySegment,
  tacticalMovementStepCrossesWall,
  tacticalSegmentsIntersect,
  tacticalWallSegmentKey,
} from "./tacticalSegmentGeometry";

export interface ScenarioValidationError { code: string; message: string }

const key = (point: GridPoint) => `${point.x}:${point.y}`;
const inCellBounds = (scenario: CombatScenario, point: GridPoint) => point.x >= 0 && point.y >= 0 && point.x < scenario.width && point.y < scenario.height;
const inVertexBounds = (scenario: CombatScenario, point: GridPoint) => point.x >= 0 && point.y >= 0 && point.x <= scenario.width && point.y <= scenario.height;
const wallBlocksStep = tacticalMovementStepCrossesWall;
const validSegment = (segment: WallSegment) => segment.from.x !== segment.to.x || segment.from.y !== segment.to.y;
const doorCells = (door: DoorSegment): GridPoint[] => {
  const separated = tacticalCellsSeparatedBySegment(door);
  return [separated.first, separated.second];
};
const wallCoversDoorInterior = (door: DoorSegment, wall: WallSegment) => {
  const trim = 0.001;
  const interiorFrom = {
    x: door.from.x + (door.to.x - door.from.x) * trim,
    y: door.from.y + (door.to.y - door.from.y) * trim,
  };
  const interiorTo = {
    x: door.to.x + (door.from.x - door.to.x) * trim,
    y: door.to.y + (door.from.y - door.to.y) * trim,
  };
  return tacticalSegmentsIntersect(interiorFrom, interiorTo, wall.from, wall.to);
};

export const validateCombatScenario = (scenario: CombatScenario): ScenarioValidationError[] => {
  const errors: ScenarioValidationError[] = [];
  const add = (code: string, message: string) => errors.push({ code, message });
  if (!Number.isInteger(scenario.width) || !Number.isInteger(scenario.height) || scenario.width <= 0 || scenario.height <= 0) add("dimensions", `Scenario ${scenario.id} must have positive integer dimensions.`);

  const identified = [...scenario.walls, ...scenario.doors, ...scenario.objects, ...scenario.combatants];
  const seenIds = new Set<string>();
  identified.forEach((item) => { if (seenIds.has(item.id)) add("duplicate-id", `Duplicate scenario ID: ${item.id}.`); seenIds.add(item.id); });

  const segments = [...scenario.walls, ...scenario.doors];
  segments.forEach((segment) => {
    if (!validSegment(segment)) add("invalid-segment", `${segment.id} must be a non-zero segment.`);
    if (!inVertexBounds(scenario, segment.from) || !inVertexBounds(scenario, segment.to)) add("segment-bounds", `${segment.id} extends outside the ${scenario.width}×${scenario.height} deck.`);
  });
  const seenWalls = new Set<string>();
  scenario.walls.forEach((wall) => { const segment = tacticalWallSegmentKey(wall); if (seenWalls.has(segment)) add("duplicate-wall", `Duplicate wall segment: ${wall.id}.`); seenWalls.add(segment); });

  scenario.doors.forEach((door) => {
    const cells = doorCells(door);
    if (cells.some((cell) => !inCellBounds(scenario, cell))) add("door-cells", `${door.id} does not connect two valid deck cells.`);
    if (scenario.walls.some((wall) => wallCoversDoorInterior(door, wall))) add("door-covered", `${door.id} is covered by a wall segment.`);
  });

  const occupied = new Map<string, string>();
  [...scenario.objects, ...scenario.combatants].forEach((item) => {
    if (!inCellBounds(scenario, item.position)) add("position-bounds", `${item.id} is outside the deck at ${key(item.position)}.`);
    const position = key(item.position);
    const existing = occupied.get(position);
    if (existing) add("occupied-cell", `${item.id} overlaps ${existing} at ${position}.`);
    else occupied.set(position, item.id);
  });
  const treeTrunks = new Set((scenario.treeTrunkCells ?? []).map(key));
  scenario.combatants.forEach((unit) => {
    if (treeTrunks.has(key(unit.position))) add("tree-overlap", `${unit.id} overlaps a tree trunk at ${key(unit.position)}.`);
  });
  if (scenario.deploymentCells) {
    const deploymentCells = new Set(scenario.deploymentCells.map(key));
    scenario.deploymentCells.forEach((cell) => { if (!inCellBounds(scenario, cell)) add("deployment-bounds", `Deployment square ${key(cell)} is outside the deck.`); });
    scenario.combatants.filter((unit) => unit.side === "enemy").forEach((unit) => { if (deploymentCells.has(key(unit.position))) add("enemy-deployment", `${unit.id} occupies crew deployment square ${key(unit.position)}.`); });
    scenario.combatants.filter((unit) => unit.side === "player").forEach((unit) => { if (!deploymentCells.has(key(unit.position))) add("crew-deployment", `${unit.id} must begin inside a crew deployment zone.`); });
  }

  const blocked = new Set([
    ...scenario.objects.filter((object) => object.kind === "cover").map((object) => key(object.position)),
    ...(scenario.treeTrunkCells ?? []).map(key),
  ]);
  const walkable = new Set<string>();
  for (let x = 0; x < scenario.width; x += 1) for (let y = 0; y < scenario.height; y += 1) if (!blocked.has(`${x}:${y}`)) walkable.add(`${x}:${y}`);
  const start = scenario.combatants.find((unit) => unit.side === "player")?.position ?? null;
  if (!start) add("player-spawn", "Scenario must contain at least one player combatant.");
  const reachable = new Set<string>();
  if (start && walkable.has(key(start))) {
    const queue = [start];
    reachable.add(key(start));
    while (queue.length) {
      const current = queue.shift()!;
      for (const next of [{ x: current.x + 1, y: current.y }, { x: current.x - 1, y: current.y }, { x: current.x, y: current.y + 1 }, { x: current.x, y: current.y - 1 }]) {
        const nextKey = key(next);
        if (!inCellBounds(scenario, next) || !walkable.has(nextKey) || reachable.has(nextKey) || scenario.walls.some((wall) => wallBlocksStep(current, next, wall))) continue;
        reachable.add(nextKey);
        queue.push(next);
      }
    }
  }
  scenario.combatants.filter((unit) => unit.side === "player").forEach((unit) => { if (!reachable.has(key(unit.position))) add("player-disconnected", `${unit.id} cannot reach the primary player spawn with doors open.`); });
  scenario.objects.filter((object) => object.kind !== "cover").forEach((objective) => {
    const adjacent = [{ x: objective.position.x + 1, y: objective.position.y }, { x: objective.position.x - 1, y: objective.position.y }, { x: objective.position.x, y: objective.position.y + 1 }, { x: objective.position.x, y: objective.position.y - 1 }];
    if (!adjacent.some((cell) => reachable.has(key(cell)))) add("objective-unreachable", `${objective.id} has no reachable adjacent square.`);
  });
  if (scenario.victoryCondition === "rescue-extract") {
    if (!scenario.captiveId || !scenario.combatants.some((unit) => unit.id === scenario.captiveId && unit.side === "player")) add("captive", "Rescue scenarios require a player-side captive combatant.");
    if (scenario.objects.filter((object) => object.kind === "prisoner").length !== 1 || scenario.objects.filter((object) => object.kind === "extraction").length !== 1) add("rescue-objectives", "Rescue scenarios require exactly one prisoner and one extraction objective.");
  }
  if (scenario.victoryCondition === "hold-zone" && (!scenario.holdUntilTurn || scenario.holdUntilTurn < 2 || scenario.objects.filter((object) => object.kind === "control").length !== 1)) add("hold-zone", "Hold scenarios require one control zone and a final turn of at least 2.");
  if (scenario.victoryCondition === "capture-target" && (!scenario.captureTargetId || !scenario.combatants.some((unit) => unit.id === scenario.captureTargetId && unit.side === "enemy"))) add("capture-target", "Capture scenarios require a valid enemy capture target.");
  if (scenario.victoryCondition === "staged-objectives") {
    if (!scenario.stageObjectiveIds || scenario.stageObjectiveIds.length < 2 || scenario.stageObjectiveIds.some((id) => !scenario.objects.some((object) => object.id === id && object.kind === "console"))) add("staged-objectives", "Staged scenarios require at least two valid console objective IDs.");
    if (scenario.stageUnlockDoorId && !scenario.doors.some((door) => door.id === scenario.stageUnlockDoorId)) add("stage-door", "A staged scenario unlock door must reference a valid door.");
  }
  Object.entries(scenario.defendedObjectiveByCombatantId ?? {}).forEach(([combatantId, objectiveId]) => {
    if (!scenario.combatants.some((unit) => unit.id === combatantId && unit.side === "enemy")) add("defender-assignment", `Defensive assignment ${combatantId} must reference an enemy combatant.`);
    if (!scenario.objects.some((object) => object.id === objectiveId && object.kind !== "cover")) add("defender-assignment", `Defensive assignment ${combatantId} must reference a valid objective.`);
  });
  Object.keys(scenario.flankBiasByCombatantId ?? {}).forEach((combatantId) => {
    if (!scenario.combatants.some((unit) => unit.id === combatantId && unit.side === "enemy")) add("flank-assignment", `Flank assignment ${combatantId} must reference an enemy combatant.`);
    if (scenario.defendedObjectiveByCombatantId?.[combatantId]) add("flank-assignment", `Flank assignment ${combatantId} cannot also have a defensive assignment.`);
  });
  (scenario.contestedObjectiveIds ?? []).forEach((objectiveId) => {
    if (!scenario.objects.some((object) => object.id === objectiveId && object.kind !== "cover" && object.kind !== "control")) add("contested-objective", `Contested objective ${objectiveId} must reference an actionable objective.`);
  });
  return errors;
};

export const assertValidCombatScenario = (scenario: CombatScenario) => {
  const errors = validateCombatScenario(scenario);
  if (errors.length) throw new Error(`Invalid character-combat scenario ${scenario.id}:\n${errors.map((error) => `- [${error.code}] ${error.message}`).join("\n")}`);
  return scenario;
};
