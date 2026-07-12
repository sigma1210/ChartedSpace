import type { CombatScenario, DoorSegment, GridPoint, WallSegment } from "./types";

export interface ScenarioValidationError { code: string; message: string }

const key = (point: GridPoint) => `${point.x}:${point.y}`;
const inCellBounds = (scenario: CombatScenario, point: GridPoint) => point.x >= 0 && point.y >= 0 && point.x < scenario.width && point.y < scenario.height;
const inVertexBounds = (scenario: CombatScenario, point: GridPoint) => point.x >= 0 && point.y >= 0 && point.x <= scenario.width && point.y <= scenario.height;
const between = (value: number, a: number, b: number) => value >= Math.min(a, b) && value < Math.max(a, b);
const wallBlocksStep = (from: GridPoint, to: GridPoint, segment: WallSegment) => {
  if (from.x !== to.x) return segment.from.x === segment.to.x && segment.from.x === Math.max(from.x, to.x) && between(from.y, segment.from.y, segment.to.y);
  return segment.from.y === segment.to.y && segment.from.y === Math.max(from.y, to.y) && between(from.x, segment.from.x, segment.to.x);
};
const normalizedSegment = (segment: WallSegment) => segment.from.x === segment.to.x
  ? `v:${segment.from.x}:${Math.min(segment.from.y, segment.to.y)}:${Math.max(segment.from.y, segment.to.y)}`
  : `h:${segment.from.y}:${Math.min(segment.from.x, segment.to.x)}:${Math.max(segment.from.x, segment.to.x)}`;
const validSegment = (segment: WallSegment) => (segment.from.x === segment.to.x || segment.from.y === segment.to.y)
  && (segment.from.x !== segment.to.x || segment.from.y !== segment.to.y);
const doorCells = (door: DoorSegment): GridPoint[] => door.from.x === door.to.x
  ? [{ x: door.from.x - 1, y: Math.min(door.from.y, door.to.y) }, { x: door.from.x, y: Math.min(door.from.y, door.to.y) }]
  : [{ x: Math.min(door.from.x, door.to.x), y: door.from.y - 1 }, { x: Math.min(door.from.x, door.to.x), y: door.from.y }];

export const validateCombatScenario = (scenario: CombatScenario): ScenarioValidationError[] => {
  const errors: ScenarioValidationError[] = [];
  const add = (code: string, message: string) => errors.push({ code, message });
  if (!Number.isInteger(scenario.width) || !Number.isInteger(scenario.height) || scenario.width <= 0 || scenario.height <= 0) add("dimensions", `Scenario ${scenario.id} must have positive integer dimensions.`);

  const identified = [...scenario.walls, ...scenario.doors, ...scenario.objects, ...scenario.combatants];
  const seenIds = new Set<string>();
  identified.forEach((item) => { if (seenIds.has(item.id)) add("duplicate-id", `Duplicate scenario ID: ${item.id}.`); seenIds.add(item.id); });

  const segments = [...scenario.walls, ...scenario.doors];
  segments.forEach((segment) => {
    if (!validSegment(segment)) add("invalid-segment", `${segment.id} must be a non-zero orthogonal segment.`);
    if (!inVertexBounds(scenario, segment.from) || !inVertexBounds(scenario, segment.to)) add("segment-bounds", `${segment.id} extends outside the ${scenario.width}×${scenario.height} deck.`);
  });
  const seenWalls = new Set<string>();
  scenario.walls.forEach((wall) => { const segment = normalizedSegment(wall); if (seenWalls.has(segment)) add("duplicate-wall", `Duplicate wall segment: ${wall.id}.`); seenWalls.add(segment); });

  scenario.doors.forEach((door) => {
    const cells = doorCells(door);
    if (cells.some((cell) => !inCellBounds(scenario, cell))) add("door-cells", `${door.id} does not connect two valid deck cells.`);
    if (scenario.walls.some((wall) => cells.length === 2 && wallBlocksStep(cells[0], cells[1], wall))) add("door-covered", `${door.id} is covered by a wall segment.`);
  });

  const occupied = new Map<string, string>();
  [...scenario.objects, ...scenario.combatants].forEach((item) => {
    if (!inCellBounds(scenario, item.position)) add("position-bounds", `${item.id} is outside the deck at ${key(item.position)}.`);
    const position = key(item.position);
    const existing = occupied.get(position);
    if (existing) add("occupied-cell", `${item.id} overlaps ${existing} at ${position}.`);
    else occupied.set(position, item.id);
  });

  const blocked = new Set(scenario.objects.filter((object) => object.kind === "cover").map((object) => key(object.position)));
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
    if (!scenario.stageUnlockDoorId || !scenario.doors.some((door) => door.id === scenario.stageUnlockDoorId)) add("stage-door", "Staged scenarios require a valid door unlocked by stage one.");
  }
  const disconnected = [...walkable].filter((cell) => !reachable.has(cell));
  if (start && disconnected.length > 0) add("disconnected-deck", `${disconnected.length} walkable deck cells are disconnected; first: ${disconnected[0]}.`);
  return errors;
};

export const assertValidCombatScenario = (scenario: CombatScenario) => {
  const errors = validateCombatScenario(scenario);
  if (errors.length) throw new Error(`Invalid character-combat scenario ${scenario.id}:\n${errors.map((error) => `- [${error.code}] ${error.message}`).join("\n")}`);
  return scenario;
};
