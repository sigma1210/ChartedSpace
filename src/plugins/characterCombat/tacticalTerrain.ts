import type { CombatScenario, GridPoint, TacticalLightSource } from "./types";

export type TacticalRotation = 0 | 90 | 180 | 270;
export type TacticalTerminalKind = "generic" | "navigation" | "engineering" | "security" | "communications";

export interface TacticalTerminalDefinition {
  kind: TacticalTerminalKind;
  label: string;
  facing?: TacticalRotation;
  operational?: boolean;
}

interface TacticalTerrainBase { id: string; blocking: boolean; targetable: boolean }
interface TacticalBoundary extends TacticalTerrainBase {
  edge: { from: GridPoint; to: GridPoint };
  separates: { first: GridPoint; second: GridPoint };
  integrity: number;
}

export interface TacticalWallSegment extends TacticalBoundary { kind: "wall" }
export interface TacticalDoor extends TacticalBoundary { kind: "door"; open: boolean }
export interface TacticalTerminal extends TacticalTerrainBase {
  kind: "terminal";
  position: GridPoint;
  terminalKind: TacticalTerminalKind;
  label: string;
  facing: TacticalRotation;
  operational: boolean;
  integrity: number;
  completesScenario?: boolean;
}

export type TacticalTerrainObject = TacticalWallSegment | TacticalDoor | TacticalTerminal;
export interface ControlRoomDefinition { id: string; origin: GridPoint; rotation?: TacticalRotation; terminal: TacticalTerminalDefinition }
export interface ControlRoom { id: string; origin: GridPoint; rotation: TacticalRotation; width: 9; height: 9; objects: TacticalTerrainObject[]; interiorCells: GridPoint[]; lightSources: TacticalLightSource[] }

const rotateCell = (point: GridPoint, rotation: TacticalRotation): GridPoint => {
  if (rotation === 90) return { x: 8 - point.y, y: point.x };
  if (rotation === 180) return { x: 8 - point.x, y: 8 - point.y };
  if (rotation === 270) return { x: point.y, y: 8 - point.x };
  return point;
};

const rotateVertex = (point: GridPoint, rotation: TacticalRotation): GridPoint => {
  if (rotation === 90) return { x: 9 - point.y, y: point.x };
  if (rotation === 180) return { x: 9 - point.x, y: 9 - point.y };
  if (rotation === 270) return { x: point.y, y: 9 - point.x };
  return point;
};

const worldPoint = (origin: GridPoint, point: GridPoint) => ({ x: origin.x + point.x, y: origin.y + point.y });

export const createControlRoom = ({ id, origin, rotation = 0, terminal }: ControlRoomDefinition): ControlRoom => {
  const objects: TacticalTerrainObject[] = [];
  const addBoundary = (side: "north" | "east" | "south" | "west", offset: number) => {
    const horizontal = side === "north" || side === "south";
    const edgeStart = horizontal ? { x: offset, y: side === "north" ? 0 : 9 } : { x: side === "west" ? 0 : 9, y: offset };
    const edgeEnd = horizontal ? { x: offset + 1, y: edgeStart.y } : { x: edgeStart.x, y: offset + 1 };
    const inside = horizontal ? { x: offset, y: side === "north" ? 0 : 8 } : { x: side === "west" ? 0 : 8, y: offset };
    const outside = horizontal ? { x: offset, y: side === "north" ? -1 : 9 } : { x: side === "west" ? -1 : 9, y: offset };
    const edge = { from: worldPoint(origin, rotateVertex(edgeStart, rotation)), to: worldPoint(origin, rotateVertex(edgeEnd, rotation)) };
    const separates = { first: worldPoint(origin, rotateCell(inside, rotation)), second: worldPoint(origin, rotateCell(outside, rotation)) };
    const isDoor = offset === 4;
    const boundary = { id: `${id}:${side}:${isDoor ? "door" : "wall"}:${offset}`, edge, separates, blocking: true, targetable: true, integrity: isDoor ? 2 : 3 };
    if (isDoor) objects.push({ ...boundary, kind: "door", open: false });
    else objects.push({ ...boundary, kind: "wall" });
  };

  for (let offset = 0; offset < 9; offset += 1) {
    addBoundary("north", offset);
    addBoundary("east", offset);
    addBoundary("south", offset);
    addBoundary("west", offset);
  }

  const terminalLocal = rotateCell({ x: 4, y: 4 }, rotation);
  objects.push({
    id: `${id}:terminal`, kind: "terminal", terminalKind: terminal.kind, label: terminal.label,
    position: worldPoint(origin, terminalLocal), facing: ((terminal.facing ?? 0) + rotation) % 360 as TacticalRotation,
    operational: terminal.operational ?? true, blocking: true, targetable: true, integrity: 2,
  });
  const interiorCells = Array.from({ length: 9 }, (_, x) => Array.from({ length: 9 }, (_, y) => worldPoint(origin, rotateCell({ x, y }, rotation)))).flat();
  const lightSources = [{ x: 2, y: 2 }, { x: 6, y: 2 }, { x: 2, y: 6 }, { x: 6, y: 6 }].map((position, index) => ({
    id: `${id}:ceiling-light:${index + 1}`,
    position: worldPoint(origin, rotateCell(position, rotation)),
    range: 3,
    on: true,
  }));
  return { id, origin, rotation, width: 9, height: 9, objects, interiorCells, lightSources };
};

const pointKey = (point: GridPoint) => `${point.x}:${point.y}`;
export const tacticalMovementEdgeKey = (first: GridPoint, second: GridPoint) => [pointKey(first), pointKey(second)].sort().join("|");
export const tacticalTerrainBlockedCells = (objects: TacticalTerrainObject[]) => new Set(objects.filter((object): object is TacticalTerminal => object.kind === "terminal" && object.blocking).map((object) => pointKey(object.position)));
export const tacticalTerrainBlockedEdges = (objects: TacticalTerrainObject[]) => new Set(objects.filter((object): object is TacticalWallSegment | TacticalDoor => object.kind !== "terminal" && object.blocking && (object.kind !== "door" || !object.open)).map((object) => tacticalMovementEdgeKey(object.separates.first, object.separates.second)));

const cellsSeparatedBy = (from: GridPoint, to: GridPoint) => from.x === to.x
  ? { first: { x: from.x - 1, y: Math.min(from.y, to.y) }, second: { x: from.x, y: Math.min(from.y, to.y) } }
  : { first: { x: Math.min(from.x, to.x), y: from.y - 1 }, second: { x: Math.min(from.x, to.x), y: from.y } };

export const tacticalTerrainObjectsForScenario = (scenario: CombatScenario): TacticalTerrainObject[] => scenario.terrainObjects ?? [
  ...scenario.walls.map((wall): TacticalWallSegment => ({
    id: wall.id,
    kind: "wall",
    edge: { from: { ...wall.from }, to: { ...wall.to } },
    separates: cellsSeparatedBy(wall.from, wall.to),
    blocking: true,
    targetable: true,
    integrity: 3,
  })),
  ...scenario.doors.map((door): TacticalDoor => ({
    id: door.id,
    kind: "door",
    edge: { from: { ...door.from }, to: { ...door.to } },
    separates: cellsSeparatedBy(door.from, door.to),
    blocking: true,
    targetable: true,
    integrity: 2,
    open: door.open,
  })),
  ...scenario.objects.filter((object) => object.kind === "console").map((object): TacticalTerminal => ({
    id: object.id,
    kind: "terminal",
    position: { ...object.position },
    terminalKind: "generic",
    label: object.label,
    facing: 0,
    operational: true,
    blocking: true,
    targetable: true,
    integrity: 2,
  })),
];

export const activeTacticalTerrainObjects = (scenario: CombatScenario, doorOpenById: Record<string, boolean>, destroyedIds: readonly string[] = []) => tacticalTerrainObjectsForScenario(scenario)
  .filter((object) => !destroyedIds.includes(object.id))
  .map((object) => object.kind === "door" ? { ...object, open: doorOpenById[object.id] ?? object.open } : object);

export interface TacticalWallVisualRun { edge: { from: GridPoint; to: GridPoint }; segmentIds: string[] }

export const tacticalWallVisualRuns = (objects: TacticalTerrainObject[]): TacticalWallVisualRun[] => {
  const groups = new Map<string, { id: string; start: number; end: number; fixed: number; horizontal: boolean }[]>();
  objects.filter((object): object is TacticalWallSegment => object.kind === "wall").forEach((wall) => {
    const horizontal = wall.edge.from.y === wall.edge.to.y;
    const fixed = horizontal ? wall.edge.from.y : wall.edge.from.x;
    const start = Math.min(horizontal ? wall.edge.from.x : wall.edge.from.y, horizontal ? wall.edge.to.x : wall.edge.to.y);
    const end = Math.max(horizontal ? wall.edge.from.x : wall.edge.from.y, horizontal ? wall.edge.to.x : wall.edge.to.y);
    const key = `${horizontal ? "h" : "v"}:${fixed}`;
    groups.set(key, [...groups.get(key) ?? [], { id: wall.id, start, end, fixed, horizontal }]);
  });

  const runs: TacticalWallVisualRun[] = [];
  groups.forEach((segments) => {
    segments.sort((a, b) => a.start - b.start);
    segments.forEach((segment) => {
      const previous = runs[runs.length - 1];
      const previousEnd = previous && (segment.horizontal ? previous.edge.to.x : previous.edge.to.y);
      const sameLine = previous && (segment.horizontal ? previous.edge.from.y === segment.fixed && previous.edge.to.y === segment.fixed : previous.edge.from.x === segment.fixed && previous.edge.to.x === segment.fixed);
      if (sameLine && previousEnd === segment.start) {
        previous.edge.to = segment.horizontal ? { x: segment.end, y: segment.fixed } : { x: segment.fixed, y: segment.end };
        previous.segmentIds.push(segment.id);
      } else runs.push({
        edge: segment.horizontal ? { from: { x: segment.start, y: segment.fixed }, to: { x: segment.end, y: segment.fixed } } : { from: { x: segment.fixed, y: segment.start }, to: { x: segment.fixed, y: segment.end } },
        segmentIds: [segment.id],
      });
    });
  });
  return runs;
};

export const tacticalWallCornerPoints = (objects: TacticalTerrainObject[]) => {
  const connections = new Map<string, { point: GridPoint; orientations: Set<"horizontal" | "vertical"> }>();
  objects.filter((object): object is TacticalWallSegment | TacticalDoor => object.kind === "wall" || object.kind === "door").forEach((boundary) => {
    const orientation = boundary.edge.from.y === boundary.edge.to.y ? "horizontal" : "vertical";
    for (const point of [boundary.edge.from, boundary.edge.to]) {
      const key = pointKey(point);
      const connection = connections.get(key) ?? { point, orientations: new Set<"horizontal" | "vertical">() };
      connection.orientations.add(orientation);
      connections.set(key, connection);
    }
  });
  return [...connections.values()].filter((connection) => connection.orientations.size === 2).map((connection) => connection.point);
};
