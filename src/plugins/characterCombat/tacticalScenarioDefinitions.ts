import controlRoomDefinitionJson from "./terrainDefinitions/control-room.json";
import raisedAreaDefinitionJson from "./terrainDefinitions/raised-area.json";
import raisedArea5x5DefinitionJson from "./terrainDefinitions/raised-area-5x5.json";
import raisedArea3x3DefinitionJson from "./terrainDefinitions/raised-area-3x3.json";
import raisedArea3x5DefinitionJson from "./terrainDefinitions/raised-area-3x5.json";
import raisedArea3x7DefinitionJson from "./terrainDefinitions/raised-area-3x7.json";
import room3x3DefinitionJson from "./terrainDefinitions/room-3x3.json";
import room3x5DefinitionJson from "./terrainDefinitions/room-3x5.json";
import room3x7DefinitionJson from "./terrainDefinitions/room-3x7.json";
import room5x5DefinitionJson from "./terrainDefinitions/room-5x5.json";
import closeMachinery1x1DefinitionJson from "./terrainDefinitions/close-machinery-1x1.json";
import closeMachinery2x2DefinitionJson from "./terrainDefinitions/close-machinery-2x2.json";
import closeMachinery3x3DefinitionJson from "./terrainDefinitions/close-machinery-3x3.json";
import closeMachinery4x4DefinitionJson from "./terrainDefinitions/close-machinery-4x4.json";
import console1x1DefinitionJson from "./terrainDefinitions/console-1x1.json";
import defaultScenarioDefinitionJson from "./scenarioDefinitions/default-tactical-control-room.json";
import type { CombatScenario, GridPoint, MapObject, TacticalLightSource, TerrainType } from "./types";
import type { TacticalRotation, TacticalTerrainObject, TacticalTerminalKind } from "./tacticalTerrain";

type BoundarySide = "north" | "east" | "south" | "west";

export interface TacticalTerrainDefinitionFile {
  schemaVersion: 1;
  id: string;
  label: string;
  size: { width: number; height: number };
  cellRegions: { terrainType: "interior" | TerrainType; origin: GridPoint; width: number; height: number }[];
  boundaryRuns: { side: BoundarySide; start: number; length: number; doorOffsets: number[] }[];
  objects: {
    id: string;
    kind: "terminal";
    position: GridPoint;
    terminalKind: TacticalTerminalKind;
    label: string;
    facing: TacticalRotation;
    operational: boolean;
    blocking: boolean;
    targetable: boolean;
    integrity: number;
    completesScenario?: boolean;
  }[];
  lightSources: TacticalLightSource[];
  elevationAccessCells?: GridPoint[];
}

export interface TacticalTerrainPlacement {
  id: string;
  terrainDefinitionId: string;
  origin: GridPoint;
  rotation: TacticalRotation;
  objectSettings?: Record<string, { terminalKind?: TacticalTerminalKind; label?: string; facing?: TacticalRotation; operational?: boolean; completesScenario?: boolean }>;
}

export interface TacticalScenarioDefinitionFile {
  schemaVersion: 1;
  id: string;
  title: string;
  briefing: string;
  objective: string;
  map: { width: number; height: number; backgroundImage?: string };
  terrainPlacements: TacticalTerrainPlacement[];
  fireCells: GridPoint[];
  smokeCells: GridPoint[];
}

export interface ResolvedTacticalScenarioTerrain {
  terrainObjects: TacticalTerrainObject[];
  walls: CombatScenario["walls"];
  doors: CombatScenario["doors"];
  objects: MapObject[];
  interiorCells: GridPoint[];
  lightSources: TacticalLightSource[];
  terrainByCell: Record<string, TerrainType>;
  elevationLevelByCell: Record<string, number>;
  closeMachineryCells: GridPoint[];
  elevationAccessCells: GridPoint[];
}

const deepFreeze = <T,>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
};

const controlRoomDefinition = deepFreeze(controlRoomDefinitionJson as TacticalTerrainDefinitionFile);
const raisedAreaDefinition = deepFreeze(raisedAreaDefinitionJson as TacticalTerrainDefinitionFile);
const raisedArea5x5Definition = deepFreeze(raisedArea5x5DefinitionJson as TacticalTerrainDefinitionFile);
const raisedArea3x3Definition = deepFreeze(raisedArea3x3DefinitionJson as TacticalTerrainDefinitionFile);
const raisedArea3x5Definition = deepFreeze(raisedArea3x5DefinitionJson as TacticalTerrainDefinitionFile);
const raisedArea3x7Definition = deepFreeze(raisedArea3x7DefinitionJson as TacticalTerrainDefinitionFile);
const room3x3Definition = deepFreeze(room3x3DefinitionJson as TacticalTerrainDefinitionFile);
const room3x5Definition = deepFreeze(room3x5DefinitionJson as TacticalTerrainDefinitionFile);
const room3x7Definition = deepFreeze(room3x7DefinitionJson as TacticalTerrainDefinitionFile);
const room5x5Definition = deepFreeze(room5x5DefinitionJson as TacticalTerrainDefinitionFile);
const closeMachinery1x1Definition = deepFreeze(closeMachinery1x1DefinitionJson as TacticalTerrainDefinitionFile);
const closeMachinery2x2Definition = deepFreeze(closeMachinery2x2DefinitionJson as TacticalTerrainDefinitionFile);
const closeMachinery3x3Definition = deepFreeze(closeMachinery3x3DefinitionJson as TacticalTerrainDefinitionFile);
const closeMachinery4x4Definition = deepFreeze(closeMachinery4x4DefinitionJson as TacticalTerrainDefinitionFile);
const console1x1Definition = deepFreeze(console1x1DefinitionJson as TacticalTerrainDefinitionFile);
export const defaultTacticalScenarioDefinition = deepFreeze(defaultScenarioDefinitionJson as TacticalScenarioDefinitionFile);
export const cloneTacticalScenarioDefinition = (definition: TacticalScenarioDefinitionFile): TacticalScenarioDefinitionFile => JSON.parse(JSON.stringify(definition)) as TacticalScenarioDefinitionFile;
const tacticalTerrainDefinitions = new Map([
  [controlRoomDefinition.id, controlRoomDefinition],
  [raisedAreaDefinition.id, raisedAreaDefinition],
  [raisedArea5x5Definition.id, raisedArea5x5Definition],
  [raisedArea3x3Definition.id, raisedArea3x3Definition],
  [raisedArea3x5Definition.id, raisedArea3x5Definition],
  [raisedArea3x7Definition.id, raisedArea3x7Definition],
  [room3x3Definition.id, room3x3Definition],
  [room3x5Definition.id, room3x5Definition],
  [room3x7Definition.id, room3x7Definition],
  [room5x5Definition.id, room5x5Definition],
  [closeMachinery1x1Definition.id, closeMachinery1x1Definition],
  [closeMachinery2x2Definition.id, closeMachinery2x2Definition],
  [closeMachinery3x3Definition.id, closeMachinery3x3Definition],
  [closeMachinery4x4Definition.id, closeMachinery4x4Definition],
  [console1x1Definition.id, console1x1Definition],
]);
export const tacticalTerrainPalette = [...tacticalTerrainDefinitions.values()].map((definition) => ({
  id: definition.id,
  label: definition.label,
  size: { ...definition.size },
  previewCells: (() => {
    const cells = [
    ...definition.cellRegions.flatMap((region) => Array.from({ length: region.width }, (_, x) => Array.from({ length: region.height }, (_, y) => ({ x: region.origin.x + x, y: region.origin.y + y }))).flat()),
    ...(definition.elevationAccessCells ?? []).map((point) => ({ ...point })),
    ];
    return cells.length > 0 ? cells : definition.objects.map((object) => ({ ...object.position }));
  })(),
}));

const rotatedCell = (point: GridPoint, size: TacticalTerrainDefinitionFile["size"], rotation: TacticalRotation): GridPoint => {
  if (rotation === 90) return { x: size.height - 1 - point.y, y: point.x };
  if (rotation === 180) return { x: size.width - 1 - point.x, y: size.height - 1 - point.y };
  if (rotation === 270) return { x: point.y, y: size.width - 1 - point.x };
  return { ...point };
};

const rotatedVertex = (point: GridPoint, size: TacticalTerrainDefinitionFile["size"], rotation: TacticalRotation): GridPoint => {
  if (rotation === 90) return { x: size.height - point.y, y: point.x };
  if (rotation === 180) return { x: size.width - point.x, y: size.height - point.y };
  if (rotation === 270) return { x: point.y, y: size.width - point.x };
  return { ...point };
};

const worldPoint = (origin: GridPoint, point: GridPoint) => ({ x: origin.x + point.x, y: origin.y + point.y });

const localBoundary = (side: BoundarySide, offset: number, size: TacticalTerrainDefinitionFile["size"]) => {
  const horizontal = side === "north" || side === "south";
  const edgeStart = horizontal
    ? { x: offset, y: side === "north" ? 0 : size.height }
    : { x: side === "west" ? 0 : size.width, y: offset };
  const edgeEnd = horizontal ? { x: offset + 1, y: edgeStart.y } : { x: edgeStart.x, y: offset + 1 };
  const inside = horizontal
    ? { x: offset, y: side === "north" ? 0 : size.height - 1 }
    : { x: side === "west" ? 0 : size.width - 1, y: offset };
  const outside = horizontal
    ? { x: offset, y: side === "north" ? -1 : size.height }
    : { x: side === "west" ? -1 : size.width, y: offset };
  return { edgeStart, edgeEnd, inside, outside };
};

const resolveTerrainPlacement = (definition: TacticalTerrainDefinitionFile, placement: TacticalTerrainPlacement) => {
  const objects: TacticalTerrainObject[] = [];
  definition.boundaryRuns.forEach((run) => {
    for (let offset = run.start; offset < run.start + run.length; offset += 1) {
      const boundary = localBoundary(run.side, offset, definition.size);
      const edge = {
        from: worldPoint(placement.origin, rotatedVertex(boundary.edgeStart, definition.size, placement.rotation)),
        to: worldPoint(placement.origin, rotatedVertex(boundary.edgeEnd, definition.size, placement.rotation)),
      };
      const separates = {
        first: worldPoint(placement.origin, rotatedCell(boundary.inside, definition.size, placement.rotation)),
        second: worldPoint(placement.origin, rotatedCell(boundary.outside, definition.size, placement.rotation)),
      };
      const isDoor = run.doorOffsets.includes(offset);
      const id = `${placement.id}:${run.side}:${isDoor ? "door" : "wall"}:${offset}`;
      const common = { id, edge, separates, blocking: true, targetable: true, integrity: isDoor ? 2 : 3 };
      objects.push(isDoor ? { ...common, kind: "door", open: false } : { ...common, kind: "wall" });
    }
  });

  definition.objects.forEach((object) => {
    const settings = placement.objectSettings?.[object.id];
    objects.push({
      ...object,
      ...settings,
      id: `${placement.id}:${object.id}`,
      kind: "terminal",
      position: worldPoint(placement.origin, rotatedCell(object.position, definition.size, placement.rotation)),
      facing: (((settings?.facing ?? object.facing) + placement.rotation) % 360) as TacticalRotation,
    });
  });

  const resolvedRegions = definition.cellRegions.map((region) => ({
    ...region,
    cells: Array.from({ length: region.width }, (_, x) => Array.from({ length: region.height }, (_, y) => worldPoint(placement.origin, rotatedCell({ x: region.origin.x + x, y: region.origin.y + y }, definition.size, placement.rotation)))).flat(),
  }));
  const interiorCells = resolvedRegions.filter((region) => region.terrainType === "interior").flatMap((region) => region.cells);
  const elevatedCells = resolvedRegions.filter((region) => region.terrainType === "elevated").flatMap((region) => region.cells);
  const closeMachineryCells = resolvedRegions.filter((region) => region.terrainType === "close-machinery").flatMap((region) => region.cells);
  const terrainByCell = Object.fromEntries(resolvedRegions.filter((region) => region.terrainType !== "interior" && region.terrainType !== "close-machinery").flatMap((region) => region.cells.map((point) => [`${point.x}:${point.y}`, region.terrainType as TerrainType])));
  const elevationAccessCells = (definition.elevationAccessCells ?? []).map((point) => worldPoint(placement.origin, rotatedCell(point, definition.size, placement.rotation)));
  const occupiedCells = [...resolvedRegions.filter((region) => region.terrainType !== "close-machinery").flatMap((region) => region.cells), ...elevationAccessCells];
  const lightSources = definition.lightSources.map((source) => ({
    ...source,
    id: `${placement.id}:${source.id}`,
    position: worldPoint(placement.origin, rotatedCell(source.position, definition.size, placement.rotation)),
  }));
  return { objects, interiorCells, elevatedCells, lightSources, terrainByCell, closeMachineryCells, elevationAccessCells, occupiedCells };
};

export const resolveTacticalScenarioTerrain = (scenario: TacticalScenarioDefinitionFile): ResolvedTacticalScenarioTerrain => {
  if (scenario.schemaVersion !== 1) throw new Error(`Unsupported tactical scenario schema version: ${scenario.schemaVersion}`);
  const terrainObjects: TacticalTerrainObject[] = [];
  const interiorCells: GridPoint[] = [];
  const lightSources: TacticalLightSource[] = [];
  const terrainByCell: Record<string, TerrainType> = {};
  const elevationLevelByCell: Record<string, number> = {};
  const closeMachineryCells: GridPoint[] = [];
  const elevationAccessCells: GridPoint[] = [];
  const placementIds = new Set<string>();
  const pointKey = (point: GridPoint) => `${point.x}:${point.y}`;
  const validCell = (point: GridPoint) => point.x >= 0 && point.y >= 0 && point.x < scenario.map.width && point.y < scenario.map.height;
  const records = scenario.terrainPlacements.map((placement) => {
    if (placementIds.has(placement.id)) throw new Error(`Duplicate tactical terrain placement ID: ${placement.id}`);
    placementIds.add(placement.id);
    const definition = tacticalTerrainDefinitions.get(placement.terrainDefinitionId);
    if (!definition) throw new Error(`Unknown tactical terrain definition: ${placement.terrainDefinitionId}`);
    if (definition.schemaVersion !== 1) throw new Error(`Unsupported tactical terrain schema version: ${definition.schemaVersion}`);
    const resolved = resolveTerrainPlacement(definition, placement);
    resolved.objects.filter((object) => object.kind === "door").forEach((door) => {
      if (!validCell(door.separates.first) || !validCell(door.separates.second)) {
        throw new Error(`Tactical terrain placement ${placement.id} has a doorway that does not connect two valid map cells.`);
      }
    });
    [...resolved.occupiedCells, ...resolved.closeMachineryCells].forEach((point) => {
      if (!validCell(point)) throw new Error(`Tactical terrain placement ${placement.id} extends outside the map at ${point.x}:${point.y}`);
    });
    terrainObjects.push(...resolved.objects);
    interiorCells.push(...resolved.interiorCells);
    lightSources.push(...resolved.lightSources);
    Object.entries(resolved.terrainByCell).filter(([, terrain]) => terrain !== "elevated").forEach(([key, terrain]) => { terrainByCell[key] = terrain; });
    elevationAccessCells.push(...resolved.elevationAccessCells);
    return { placement, resolved };
  });

  const raisedRecords = records.filter((record) => record.resolved.elevatedCells.length > 0);
  const nonRaisedRecords = records.filter((record) => record.resolved.elevatedCells.length === 0 && record.resolved.occupiedCells.length > 0);
  const keySet = (points: GridPoint[]) => new Set(points.map(pointKey));
  const raisedSets = new Map(raisedRecords.map((record) => [record.placement.id, { elevated: keySet(record.resolved.elevatedCells), occupied: keySet(record.resolved.occupiedCells) }]));
  const supports = (lower: typeof raisedRecords[number], upper: typeof raisedRecords[number]) => {
    const lowerCells = raisedSets.get(lower.placement.id)!.elevated;
    return lower.resolved.elevatedCells.length > upper.resolved.elevatedCells.length
      && upper.resolved.occupiedCells.every((point) => lowerCells.has(pointKey(point)));
  };
  for (let firstIndex = 0; firstIndex < raisedRecords.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < raisedRecords.length; secondIndex += 1) {
      const first = raisedRecords[firstIndex];
      const second = raisedRecords[secondIndex];
      const firstOccupied = raisedSets.get(first.placement.id)!.occupied;
      const overlaps = second.resolved.occupiedCells.some((point) => firstOccupied.has(pointKey(point)));
      if (overlaps && !supports(first, second) && !supports(second, first)) {
        const overlap = second.resolved.occupiedCells.find((point) => firstOccupied.has(pointKey(point)))!;
        throw new Error(`Tactical terrain placements ${first.placement.id} and ${second.placement.id} overlap at ${pointKey(overlap)}`);
      }
    }
  }
  const nonRaisedOwnerByCell = new Map<string, string>();
  nonRaisedRecords.forEach((record) => record.resolved.occupiedCells.forEach((point) => {
    const key = pointKey(point);
    const existing = nonRaisedOwnerByCell.get(key);
    if (existing) throw new Error(`Tactical terrain placements ${existing} and ${record.placement.id} overlap at ${key}`);
    const raised = raisedRecords.find((candidate) => candidate.resolved.occupiedCells.some((cell) => pointKey(cell) === key));
    if (raised) throw new Error(`Tactical terrain placements ${raised.placement.id} and ${record.placement.id} overlap at ${key}`);
    nonRaisedOwnerByCell.set(key, record.placement.id);
  }));

  const levelByRaisedId = new Map<string, number>();
  const raisedLevel = (record: typeof raisedRecords[number]): number => {
    const existing = levelByRaisedId.get(record.placement.id);
    if (existing) return existing;
    const supporting = raisedRecords.filter((candidate) => supports(candidate, record));
    const level = supporting.length > 0 ? Math.max(...supporting.map(raisedLevel)) + 1 : 1;
    levelByRaisedId.set(record.placement.id, level);
    return level;
  };
  raisedRecords.forEach(raisedLevel);
  const topRaisedOwnerByCell = new Map<string, string>();
  [...raisedRecords].sort((first, second) => raisedLevel(first) - raisedLevel(second)).forEach((record) => {
    const level = raisedLevel(record);
    record.resolved.elevatedCells.forEach((point) => {
      const key = pointKey(point);
      elevationLevelByCell[key] = level;
      terrainByCell[key] = "elevated";
      topRaisedOwnerByCell.set(key, record.placement.id);
    });
  });

  const closeMachineryPlacements = records.filter((record) => record.resolved.closeMachineryCells.length > 0).map((record) => ({ id: record.placement.id, cells: record.resolved.closeMachineryCells }));
  const machineryOwnerByCell = new Map<string, string>();
  closeMachineryPlacements.forEach(({ id, cells }) => {
    cells.forEach((point) => {
      const key = `${point.x}:${point.y}`;
      const existing = machineryOwnerByCell.get(key);
      if (existing && existing !== id) throw new Error(`Tactical terrain placements ${existing} and ${id} overlap at ${key}`);
      machineryOwnerByCell.set(key, id);
    });
    if (cells.some((point) => nonRaisedOwnerByCell.has(pointKey(point)))) throw new Error(`Close machinery placement ${id} overlaps another terrain placement.`);
    const underlyingOwners = cells.map((point) => topRaisedOwnerByCell.get(pointKey(point)));
    const coveredOwners = new Set(underlyingOwners.filter((owner): owner is string => Boolean(owner)));
    if (coveredOwners.size > 0) {
      const entirelyOnOneRaisedArea = coveredOwners.size === 1
        && underlyingOwners.every((owner) => owner === underlyingOwners[0])
        && cells.every((point) => terrainByCell[pointKey(point)] === "elevated");
      if (!entirelyOnOneRaisedArea) throw new Error(`Close machinery placement ${id} must fit entirely within one raised-area placement.`);
    }
    closeMachineryCells.push(...cells);
  });

  const terminalByCell = new Map<string, string>();
  const machineryCells = new Set(closeMachineryCells.map((point) => `${point.x}:${point.y}`));
  const stairCells = new Set(elevationAccessCells.map((point) => `${point.x}:${point.y}`));
  terrainObjects.filter((object) => object.kind === "terminal").forEach((terminal) => {
    const { x, y } = terminal.position;
    const key = `${x}:${y}`;
    if (x < 0 || y < 0 || x >= scenario.map.width || y >= scenario.map.height) throw new Error(`Tactical terminal ${terminal.id} extends outside the map at ${key}`);
    const existing = terminalByCell.get(key);
    if (existing) throw new Error(`Tactical terminals ${existing} and ${terminal.id} overlap at ${key}`);
    if (machineryCells.has(key)) throw new Error(`Tactical terminal ${terminal.id} overlaps close machinery at ${key}`);
    if (stairCells.has(key)) throw new Error(`Tactical terminal ${terminal.id} overlaps stairs at ${key}`);
    terminalByCell.set(key, terminal.id);
  });

  const walls: CombatScenario["walls"] = [];
  const doors: CombatScenario["doors"] = [];
  const objects: MapObject[] = [];
  const mergedTerrainObjects: TacticalTerrainObject[] = [];
  const boundaryByEdge = new Map<string, TacticalTerrainObject>();
  terrainObjects.forEach((object) => {
    if (object.kind !== "wall" && object.kind !== "door") {
      mergedTerrainObjects.push(object);
      return;
    }
    const vertical = object.edge.from.x === object.edge.to.x;
    const edgeKey = vertical
      ? `v:${object.edge.from.x}:${Math.min(object.edge.from.y, object.edge.to.y)}:${Math.max(object.edge.from.y, object.edge.to.y)}`
      : `h:${object.edge.from.y}:${Math.min(object.edge.from.x, object.edge.to.x)}:${Math.max(object.edge.from.x, object.edge.to.x)}`;
    const existing = boundaryByEdge.get(edgeKey);
    if (!existing) {
      boundaryByEdge.set(edgeKey, object);
      mergedTerrainObjects.push(object);
      return;
    }
    if (existing.kind !== object.kind) throw new Error(`Tactical terrain boundary conflict between ${existing.id} and ${object.id}.`);
  });
  mergedTerrainObjects.forEach((object) => {
    if (object.kind === "wall") walls.push({ id: object.id, from: { ...object.edge.from }, to: { ...object.edge.to } });
    else if (object.kind === "door") doors.push({ id: object.id, from: { ...object.edge.from }, to: { ...object.edge.to }, open: object.open });
    else objects.push({ id: object.id, kind: "console", position: { ...object.position }, label: object.label });
  });
  return { terrainObjects: mergedTerrainObjects, walls, doors, objects, interiorCells, lightSources, terrainByCell, elevationLevelByCell, closeMachineryCells, elevationAccessCells };
};
