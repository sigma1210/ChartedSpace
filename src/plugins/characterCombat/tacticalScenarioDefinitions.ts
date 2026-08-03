import controlRoomDefinitionJson from "./terrainDefinitions/control-room.json";
import closeMachinery1x1DefinitionJson from "./terrainDefinitions/close-machinery-1x1.json";
import closeMachinery2x2DefinitionJson from "./terrainDefinitions/close-machinery-2x2.json";
import closeMachinery3x3DefinitionJson from "./terrainDefinitions/close-machinery-3x3.json";
import closeMachinery4x4DefinitionJson from "./terrainDefinitions/close-machinery-4x4.json";
import console1x1DefinitionJson from "./terrainDefinitions/console-1x1.json";
import bridge1x5DefinitionJson from "./terrainDefinitions/bridge-1x5.json";
import bridge1x7DefinitionJson from "./terrainDefinitions/bridge-1x7.json";
import bridge1x9DefinitionJson from "./terrainDefinitions/bridge-1x9.json";
import hatch1x1DefinitionJson from "./terrainDefinitions/hatch-1x1.json";
import liquidHydrogen2x2DefinitionJson from "./terrainDefinitions/liquid-hydrogen-2x2.json";
import liquidHydrogen3x3DefinitionJson from "./terrainDefinitions/liquid-hydrogen-3x3.json";
import liquidHydrogen4x4DefinitionJson from "./terrainDefinitions/liquid-hydrogen-4x4.json";
import interactiveHumanDefinitionJson from "./terrainDefinitions/interactive-human.json";
import deploymentZone9x9DefinitionJson from "./terrainDefinitions/deployment-zone-9x9.json";
import defaultScenarioDefinitionJson from "./scenarioDefinitions/default-tactical-control-room.json";
import type { CombatScenario, GridPoint, MapObject, TacticalBridge, TacticalElevationTransition, TacticalElevationTransitionKind, TacticalLadderMount, TacticalLightSource, TacticalLiquidHydrogenArea, TerrainType, WallSegment } from "./types";
import { tacticalCellsSeparatedBySegment, tacticalWallSegmentKey } from "./tacticalSegmentGeometry";
import { tacticalCirclePrimitiveOutline, tacticalCircleWallBoundary } from "./tacticalTerrainPrimitives";
import { tacticalNaturalTerrainFootprintCells } from "./tacticalNaturalTerrain";
import { tacticalQuadraticBezierWallSegments } from "./tacticalBezierWalls";
import { tacticalDrawnAreaOwnerByCell, tacticalDrawnRaisedAreaCells, tacticalRaisedAreaOutlineLines } from "./tacticalDrawnRaisedAreas";
import { tacticalAreaBoundaryPortalLayout } from "./tacticalAreaBoundaryPortals";
import type { TacticalRotation, TacticalTerrainObject, TacticalTerminalKind } from "./tacticalTerrain";
import type { TacticalInteractiveHumanCombatProfile } from "./tacticalInteractiveHuman";

export type TacticalDeploymentEdge = "north" | "east" | "south" | "west";
type BoundarySide = TacticalDeploymentEdge;

export interface TacticalTerrainDefinitionFile {
  schemaVersion: 1;
  id: string;
  label: string;
  size: { width: number; height: number };
  cellRegions: { terrainType: "interior" | TerrainType; origin: GridPoint; width: number; height: number }[];
  boundaryRuns: { side: BoundarySide; start: number; length: number; doorOffsets: number[]; portalType?: "sliding-door" | "iris-valve" }[];
  objects: ({
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
    visualKind?: "console" | "human";
    modelPath?: string;
    combatProfile?: TacticalInteractiveHumanCombatProfile;
  } | {
    id: string;
    kind: "hatch";
    position: GridPoint;
    open: boolean;
    blocking: boolean;
    targetable: boolean;
    integrity: number;
  })[];
  lightSources: TacticalLightSource[];
  elevationAccessCells?: GridPoint[];
  bridgeDeck?: boolean;
  liquidHydrogen?: boolean;
  deploymentZone?: boolean;
}

export interface TacticalTerrainPlacement {
  id: string;
  terrainDefinitionId: string;
  origin: GridPoint;
  rotation: TacticalRotation;
  terrainSettings?: { filled?: boolean };
  objectSettings?: Record<string, { terminalKind?: TacticalTerminalKind; label?: string; facing?: TacticalRotation; operational?: boolean; completesScenario?: boolean; combatProfile?: TacticalInteractiveHumanCombatProfile }>;
}

export type TacticalEnemyType = "gang-member" | "gang-leader";
export interface TacticalEnemyPlacement {
  id: string;
  type: TacticalEnemyType;
  name: string;
  position: GridPoint;
  facing?: "north" | "east" | "south" | "west";
  avatarPath: string;
}

export interface TacticalDrawnWall extends WallSegment {
  control?: GridPoint;
  portals?: {
    id: string;
    kind: "sliding-door" | "iris-valve";
    position: number;
  }[];
}

export type TacticalAreaOutlineSegment = {
  kind: "line";
  from: GridPoint;
  to: GridPoint;
} | {
  kind: "quadratic";
  from: GridPoint;
  control: GridPoint;
  to: GridPoint;
} | {
  kind: "cubic";
  from: GridPoint;
  control1: GridPoint;
  control2: GridPoint;
  to: GridPoint;
};

export type TacticalRaisedAreaOutlineSegment = TacticalAreaOutlineSegment;

export interface TacticalDrawnRaisedArea {
  id: string;
  segments: TacticalAreaOutlineSegment[];
}

export type TacticalDrawnTerrainRegion = {
  id: string;
  kind: "close-machinery";
  segments: TacticalAreaOutlineSegment[];
} | {
  id: string;
  kind: "liquid-hydrogen";
  segments: TacticalAreaOutlineSegment[];
  settings?: { filled?: boolean };
} | {
  id: string;
  kind: "grass" | "sand" | "water";
  segments: TacticalAreaOutlineSegment[];
};

export type TacticalClosedAreaSurface = "none" | "grass" | "sand" | "water" | "close-machinery" | "liquid-hydrogen";
export type TacticalClosedAreaBoundary = "none" | "wall";

export type TacticalClosedAreaGeometry = {
  kind: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
} | {
  kind: "circle";
  center: GridPoint;
  radius: number;
};

export interface TacticalDrawnArea {
  id: string;
  segments: TacticalAreaOutlineSegment[];
  geometry?: TacticalClosedAreaGeometry;
  surface: TacticalClosedAreaSurface;
  elevation: number;
  boundary: TacticalClosedAreaBoundary;
  deployment?: boolean;
  settings?: { filled?: boolean };
  portals?: {
    id: string;
    kind: "sliding-door" | "iris-valve";
    position: number;
  }[];
}

export const tacticalClosedAreaGeometrySegments = (
  geometry: TacticalClosedAreaGeometry,
): TacticalAreaOutlineSegment[] => {
  if (geometry.kind === "circle") {
    return tacticalCirclePrimitiveOutline({ center: geometry.center, radius: geometry.radius });
  }
  const topLeft = { x: geometry.x, y: geometry.y };
  const topRight = { x: geometry.x + geometry.width, y: geometry.y };
  const bottomRight = { x: geometry.x + geometry.width, y: geometry.y + geometry.height };
  const bottomLeft = { x: geometry.x, y: geometry.y + geometry.height };
  return [
    { kind: "line", from: topLeft, to: topRight },
    { kind: "line", from: topRight, to: bottomRight },
    { kind: "line", from: bottomRight, to: bottomLeft },
    { kind: "line", from: bottomLeft, to: topLeft },
  ];
};

export type TacticalNaturalTerrainPlacement = {
  id: string;
  kind: "tree" | "bush" | "rock";
  position: GridPoint;
  radius: number;
};

export type TacticalTerrainPrimitiveType =
  | "wall"
  | "raised-area"
  | "close-machinery"
  | "liquid-hydrogen";

export interface TacticalDrawnCirclePrimitive {
  id: string;
  shape: "circle";
  center: GridPoint;
  radius: number;
  terrainType: TacticalTerrainPrimitiveType;
  settings?: { filled?: boolean };
  portals?: {
    id: string;
    kind: "sliding-door" | "iris-valve";
    position: number;
  }[];
}

export type TacticalDrawnTerrainPrimitive = TacticalDrawnCirclePrimitive;

export interface TacticalElevationTransitionDefinition {
  id: string;
  kind: TacticalElevationTransitionKind;
  lower: GridPoint;
  upper: GridPoint;
  path?: GridPoint[];
  ladderMount?: TacticalLadderMount;
}

export interface TacticalScenarioTracingTemplate {
  imagePath: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  lockAspectRatio: boolean;
}

export interface TacticalScenarioDefinitionFile {
  schemaVersion: 1;
  id: string;
  consoleVictoryDefinitionId?: string;
  title: string;
  briefing: string;
  objective: string;
  map: { width: number; height: number; backgroundImage?: string };
  tracingTemplate?: TacticalScenarioTracingTemplate;
  terrainPlacements: TacticalTerrainPlacement[];
  drawnWalls?: TacticalDrawnWall[];
  drawnRaisedAreas?: TacticalDrawnRaisedArea[];
  drawnTerrainRegions?: TacticalDrawnTerrainRegion[];
  drawnAreas?: TacticalDrawnArea[];
  drawnTerrainPrimitives?: TacticalDrawnTerrainPrimitive[];
  naturalTerrainPlacements?: TacticalNaturalTerrainPlacement[];
  elevationTransitions?: TacticalElevationTransitionDefinition[];
  deploymentEdges?: TacticalDeploymentEdge[];
  enemyPlacements?: TacticalEnemyPlacement[];
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
  drawnRaisedAreaLevels: Record<string, number>;
  drawnRaisedAreas: TacticalDrawnRaisedArea[];
  drawnTerrainRegions: TacticalDrawnTerrainRegion[];
  drawnAreas: TacticalDrawnArea[];
  naturalTerrainPlacements: TacticalNaturalTerrainPlacement[];
  treeTrunkCells: GridPoint[];
  bushCells: GridPoint[];
  rockCells: GridPoint[];
  elevationTransitions: TacticalElevationTransition[];
  closeMachineryCells: GridPoint[];
  elevationAccessCells: GridPoint[];
  bridges: TacticalBridge[];
  liquidHydrogenAreas: TacticalLiquidHydrogenArea[];
  deploymentCells: GridPoint[];
}

const deepFreeze = <T,>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
};

const controlRoomDefinition = deepFreeze(controlRoomDefinitionJson as TacticalTerrainDefinitionFile);
const closeMachinery1x1Definition = deepFreeze(closeMachinery1x1DefinitionJson as TacticalTerrainDefinitionFile);
const closeMachinery2x2Definition = deepFreeze(closeMachinery2x2DefinitionJson as TacticalTerrainDefinitionFile);
const closeMachinery3x3Definition = deepFreeze(closeMachinery3x3DefinitionJson as TacticalTerrainDefinitionFile);
const closeMachinery4x4Definition = deepFreeze(closeMachinery4x4DefinitionJson as TacticalTerrainDefinitionFile);
const console1x1Definition = deepFreeze(console1x1DefinitionJson as TacticalTerrainDefinitionFile);
const bridge1x5Definition = deepFreeze(bridge1x5DefinitionJson as TacticalTerrainDefinitionFile);
const bridge1x7Definition = deepFreeze(bridge1x7DefinitionJson as TacticalTerrainDefinitionFile);
const bridge1x9Definition = deepFreeze(bridge1x9DefinitionJson as TacticalTerrainDefinitionFile);
const hatch1x1Definition = deepFreeze(hatch1x1DefinitionJson as TacticalTerrainDefinitionFile);
const liquidHydrogen2x2Definition = deepFreeze(liquidHydrogen2x2DefinitionJson as TacticalTerrainDefinitionFile);
const liquidHydrogen3x3Definition = deepFreeze(liquidHydrogen3x3DefinitionJson as TacticalTerrainDefinitionFile);
const liquidHydrogen4x4Definition = deepFreeze(liquidHydrogen4x4DefinitionJson as TacticalTerrainDefinitionFile);
const interactiveHumanDefinition = deepFreeze(interactiveHumanDefinitionJson as TacticalTerrainDefinitionFile);
const deploymentZone9x9Definition = deepFreeze(deploymentZone9x9DefinitionJson as TacticalTerrainDefinitionFile);
export const defaultTacticalScenarioDefinition = deepFreeze(defaultScenarioDefinitionJson as TacticalScenarioDefinitionFile);
export const cloneTacticalScenarioDefinition = (definition: TacticalScenarioDefinitionFile): TacticalScenarioDefinitionFile => JSON.parse(JSON.stringify(definition)) as TacticalScenarioDefinitionFile;
const tacticalTerrainDefinitions = new Map([
  [controlRoomDefinition.id, controlRoomDefinition],
  [closeMachinery1x1Definition.id, closeMachinery1x1Definition],
  [closeMachinery2x2Definition.id, closeMachinery2x2Definition],
  [closeMachinery3x3Definition.id, closeMachinery3x3Definition],
  [closeMachinery4x4Definition.id, closeMachinery4x4Definition],
  [console1x1Definition.id, console1x1Definition],
  [bridge1x5Definition.id, bridge1x5Definition],
  [bridge1x7Definition.id, bridge1x7Definition],
  [bridge1x9Definition.id, bridge1x9Definition],
  [hatch1x1Definition.id, hatch1x1Definition],
  [liquidHydrogen2x2Definition.id, liquidHydrogen2x2Definition],
  [liquidHydrogen3x3Definition.id, liquidHydrogen3x3Definition],
  [liquidHydrogen4x4Definition.id, liquidHydrogen4x4Definition],
  [interactiveHumanDefinition.id, interactiveHumanDefinition],
  [deploymentZone9x9Definition.id, deploymentZone9x9Definition],
]);
export const tacticalPlacementSupportsConsoleOperations = (placement: Pick<TacticalTerrainPlacement, "terrainDefinitionId">) => placement.terrainDefinitionId === "control-room" || placement.terrainDefinitionId === "console-1x1" || placement.terrainDefinitionId === "interactive-human";
export const tacticalTerrainPalette = [...tacticalTerrainDefinitions.values()].map((definition) => ({
  id: definition.id,
  label: definition.label,
  size: { ...definition.size },
  previewCells: (() => {
    const cells = [
    ...definition.cellRegions.flatMap((region) => Array.from({ length: region.width }, (_, x) => Array.from({ length: region.height }, (_, y) => ({ x: region.origin.x + x, y: region.origin.y + y }))).flat()),
    ...(definition.elevationAccessCells ?? []).map((point) => ({ ...point })),
    ];
    if (cells.length > 0) return cells;
    if (definition.liquidHydrogen || definition.deploymentZone) return Array.from({ length: definition.size.width }, (_, x) => Array.from({ length: definition.size.height }, (_, y) => ({ x, y }))).flat();
    if (definition.bridgeDeck) return Array.from({ length: definition.size.width }, (_, x) => Array.from({ length: definition.size.height }, (_, y) => ({ x, y }))).flat();
    return definition.objects.map((object) => ({ ...object.position }));
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
      objects.push(isDoor ? { ...common, kind: "door", open: false, portalType: run.portalType ?? "sliding-door" } : { ...common, kind: "wall" });
    }
  });

  definition.objects.forEach((object) => {
    if (object.kind === "hatch") {
      objects.push({
        ...object,
        id: `${placement.id}:${object.id}`,
        position: worldPoint(placement.origin, rotatedCell(object.position, definition.size, placement.rotation)),
      });
      return;
    }
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
  const closeMachineryCells = resolvedRegions.filter((region) => region.terrainType === "close-machinery").flatMap((region) => region.cells);
  const terrainByCell = Object.fromEntries(resolvedRegions.filter((region) => region.terrainType !== "interior" && region.terrainType !== "close-machinery").flatMap((region) => region.cells.map((point) => [`${point.x}:${point.y}`, region.terrainType as TerrainType])));
  const elevationAccessCells = (definition.elevationAccessCells ?? []).map((point) => worldPoint(placement.origin, rotatedCell(point, definition.size, placement.rotation)));
  const bridgeCells = definition.bridgeDeck
    ? Array.from({ length: definition.size.width }, (_, x) => Array.from({ length: definition.size.height }, (_, y) => worldPoint(placement.origin, rotatedCell({ x, y }, definition.size, placement.rotation)))).flat()
    : [];
  const liquidHydrogenFootprintCells = definition.liquidHydrogen
    ? Array.from({ length: definition.size.width }, (_, x) => Array.from({ length: definition.size.height }, (_, y) => worldPoint(placement.origin, rotatedCell({ x, y }, definition.size, placement.rotation)))).flat()
    : [];
  const deploymentCells = definition.deploymentZone
    ? Array.from({ length: definition.size.width }, (_, x) => Array.from({ length: definition.size.height }, (_, y) => worldPoint(placement.origin, rotatedCell({ x, y }, definition.size, placement.rotation)))).flat()
    : [];
  const occupiedCells = [...resolvedRegions.filter((region) => region.terrainType !== "close-machinery").flatMap((region) => region.cells), ...elevationAccessCells];
  const lightSources = definition.lightSources.map((source) => ({
    ...source,
    id: `${placement.id}:${source.id}`,
    position: worldPoint(placement.origin, rotatedCell(source.position, definition.size, placement.rotation)),
  }));
  return { objects, interiorCells, lightSources, terrainByCell, closeMachineryCells, elevationAccessCells, bridgeCells, liquidHydrogenFootprintCells, liquidHydrogenFilled: placement.terrainSettings?.filled !== false, deploymentCells, occupiedCells };
};

export const resolveTacticalScenarioTerrain = (scenario: TacticalScenarioDefinitionFile): ResolvedTacticalScenarioTerrain => {
  if (scenario.schemaVersion !== 1) throw new Error(`Unsupported tactical scenario schema version: ${scenario.schemaVersion}`);
  const terrainObjects: TacticalTerrainObject[] = [];
  const interiorCells: GridPoint[] = [];
  const lightSources: TacticalLightSource[] = [];
  const terrainByCell: Record<string, TerrainType> = {};
  const elevationLevelByCell: Record<string, number> = {};
  const closeMachineryCells: GridPoint[] = [];
  const bridges: TacticalBridge[] = [];
  const liquidHydrogenAreas: TacticalLiquidHydrogenArea[] = [];
  const deploymentCells: GridPoint[] = [];
  const elevationAccessCells: GridPoint[] = [];
  const placementIds = new Set<string>();
  const pointKey = (point: GridPoint) => `${point.x}:${point.y}`;
  const validCell = (point: GridPoint) => point.x >= 0 && point.y >= 0 && point.x < scenario.map.width && point.y < scenario.map.height;
  const validVertex = (point: GridPoint) => point.x >= 0 && point.y >= 0 && point.x <= scenario.map.width && point.y <= scenario.map.height;
  const drawnAreas = (scenario.drawnAreas ?? []).map((area) => {
    if (!area.id.trim()) throw new Error("A drawn area requires an ID.");
    if (!Number.isFinite(area.elevation) || area.elevation < 0 || !Number.isInteger(area.elevation * 2)) {
      throw new Error(`Drawn area ${area.id} elevation must be a non-negative half level.`);
    }
    const normalizedArea = area.geometry
      ? { ...area, segments: tacticalClosedAreaGeometrySegments(area.geometry) }
      : area;
    return {
      area: normalizedArea,
      cells: tacticalDrawnRaisedAreaCells(normalizedArea, scenario.map.width, scenario.map.height),
    };
  });
  drawnAreas.forEach(({ area, cells }) => {
    if (area.deployment) deploymentCells.push(...cells);
  });
  const drawnAreaOwnerByCell = tacticalDrawnAreaOwnerByCell(
    drawnAreas.map(({ area }) => area),
    scenario.map.width,
    scenario.map.height,
  );
  const areaBoundaryElevationByWallId = new Map<string, number>();
  const unifiedBoundaryWalls: TacticalDrawnWall[] = drawnAreas.flatMap(({ area }) =>
    area.boundary === "wall" && (area.portals?.length ?? 0) === 0
      ? area.segments.flatMap((segment, index) => segment.kind === "cubic"
        ? tacticalRaisedAreaOutlineLines({ id: area.id, segments: [segment] }).map((line, lineIndex) => {
          const wall = {
            id: `${area.id}:boundary:${index + 1}:${lineIndex + 1}`,
            from: { ...line.from },
            to: { ...line.to },
          };
          areaBoundaryElevationByWallId.set(wall.id, area.elevation);
          return wall;
        })
        : (() => {
          const wall = {
            id: `${area.id}:boundary:${index + 1}`,
            from: { ...segment.from },
            to: { ...segment.to },
            ...(segment.kind === "quadratic" ? { control: { ...segment.control } } : {}),
          };
          areaBoundaryElevationByWallId.set(wall.id, area.elevation);
          return [wall];
        })())
      : []);
  const allDrawnWalls = [...(scenario.drawnWalls ?? []), ...unifiedBoundaryWalls];
  const drawnWallIds = new Set<string>();
  const drawnObjectIds = new Set<string>();
  const drawnWallSegments = new Set<string>();
  drawnAreas.forEach(({ area }) => {
    if (drawnObjectIds.has(area.id)) throw new Error(`Duplicate drawn terrain ID: ${area.id}.`);
    drawnObjectIds.add(area.id);
    if ((area.portals?.length ?? 0) > 0) {
      const layout = tacticalAreaBoundaryPortalLayout(area);
      [...layout.walls, ...layout.portals].forEach((item) => {
        if (drawnObjectIds.has(item.id)) throw new Error(`Duplicate drawn terrain ID: ${item.id}.`);
        drawnObjectIds.add(item.id);
      });
    }
  });
  allDrawnWalls.forEach((wall) => {
    if (!wall.id.trim()) throw new Error("A drawn wall requires an ID.");
    if (drawnWallIds.has(wall.id)) throw new Error(`Duplicate drawn wall ID: ${wall.id}.`);
    if (drawnObjectIds.has(wall.id)) throw new Error(`Duplicate drawn terrain ID: ${wall.id}.`);
    drawnObjectIds.add(wall.id);
    if (!validVertex(wall.from) || !validVertex(wall.to) || (wall.control && !validVertex(wall.control))) throw new Error(`Drawn wall ${wall.id} extends outside the map.`);
    if (wall.from.x === wall.to.x && wall.from.y === wall.to.y) throw new Error(`Drawn wall ${wall.id} must have different endpoints.`);
    if (wall.control && (wall.portals?.length ?? 0) > 0) throw new Error(`Curved drawn wall ${wall.id} cannot contain portals.`);
    if (wall.control) {
      tacticalQuadraticBezierWallSegments({ ...wall, control: wall.control }).forEach((segment) => {
        if (drawnObjectIds.has(segment.id)) throw new Error(`Duplicate drawn terrain ID: ${segment.id}.`);
        drawnObjectIds.add(segment.id);
      });
    }
    const length = Math.hypot(wall.to.x - wall.from.x, wall.to.y - wall.from.y);
    let previousPortalEnd = 0;
    [...(wall.portals ?? [])].sort((first, second) => first.position - second.position).forEach((portal) => {
      if (!portal.id.trim()) throw new Error(`A portal on drawn wall ${wall.id} requires an ID.`);
      if (drawnObjectIds.has(portal.id)) throw new Error(`Duplicate drawn terrain ID: ${portal.id}.`);
      if (!Number.isFinite(portal.position) || portal.position < 0 || portal.position > 1) throw new Error(`Portal ${portal.id} must have a position between 0 and 1.`);
      const center = portal.position * length;
      const start = center - 0.5;
      const end = center + 0.5;
      if (start < -1e-9 || end > length + 1e-9) throw new Error(`Portal ${portal.id} must fit entirely within drawn wall ${wall.id}.`);
      if (start < previousPortalEnd - 1e-9) throw new Error(`Portal ${portal.id} overlaps another portal on drawn wall ${wall.id}.`);
      previousPortalEnd = end;
      drawnObjectIds.add(portal.id);
    });
    const key = wall.control
      ? `${tacticalWallSegmentKey(wall)}:control:${wall.control.x}:${wall.control.y}`
      : tacticalWallSegmentKey(wall);
    if (drawnWallSegments.has(key)) throw new Error(`Duplicate drawn wall segment: ${wall.id}.`);
    drawnWallIds.add(wall.id);
    drawnWallSegments.add(key);
  });
  type ResolvedPrimitiveArea =
    | { target: "wall"; circle: TacticalDrawnCirclePrimitive }
    | { target: "raised-area"; area: TacticalDrawnRaisedArea }
    | { target: "terrain-region"; region: TacticalDrawnTerrainRegion };
  const primitiveAreas = (scenario.drawnTerrainPrimitives ?? []).map((primitive): ResolvedPrimitiveArea => {
    if (!primitive.id.trim()) throw new Error("A drawn terrain primitive requires an ID.");
    if (
      !Number.isFinite(primitive.center.x)
      || !Number.isFinite(primitive.center.y)
      || !Number.isFinite(primitive.radius)
      || primitive.radius <= 0
    ) {
      throw new Error(`Circle primitive ${primitive.id} requires a finite positive radius and center.`);
    }
    if (
      primitive.center.x - primitive.radius < 0
      || primitive.center.y - primitive.radius < 0
      || primitive.center.x + primitive.radius > scenario.map.width
      || primitive.center.y + primitive.radius > scenario.map.height
    ) {
      throw new Error(`Circle primitive ${primitive.id} extends outside the map.`);
    }
    const segments = tacticalCirclePrimitiveOutline(primitive);
    if (primitive.terrainType !== "wall" && (primitive.portals?.length ?? 0) > 0) {
      throw new Error(`Circle primitive ${primitive.id} can only contain portals when its terrain type is wall.`);
    }
    if (primitive.terrainType === "wall") {
      if (drawnObjectIds.has(primitive.id)) {
        throw new Error(`Duplicate drawn terrain ID: ${primitive.id}.`);
      }
      drawnObjectIds.add(primitive.id);
      const circumference = Math.PI * 2 * primitive.radius;
      const portalIds = new Set<string>();
      (primitive.portals ?? []).forEach((portal, index, portals) => {
        if (!portal.id.trim()) {
          throw new Error(`A portal on circle wall ${primitive.id} requires an ID.`);
        }
        if (portalIds.has(portal.id) || drawnObjectIds.has(portal.id)) {
          throw new Error(`Duplicate drawn terrain ID: ${portal.id}.`);
        }
        if (!Number.isFinite(portal.position) || portal.position < 0 || portal.position > 1) {
          throw new Error(`Portal ${portal.id} must have a position between 0 and 1.`);
        }
        if (circumference < 2) {
          throw new Error(`Circle wall ${primitive.id} is too small to contain a portal.`);
        }
        if (portals.some((candidate, candidateIndex) =>
          candidateIndex < index
          && Math.min(
            Math.abs(candidate.position - portal.position),
            1 - Math.abs(candidate.position - portal.position),
          ) * circumference < 1 - 1e-9)) {
          throw new Error(`Portal ${portal.id} overlaps another portal on circle wall ${primitive.id}.`);
        }
        portalIds.add(portal.id);
        drawnObjectIds.add(portal.id);
      });
      const boundary = tacticalCircleWallBoundary(primitive);
      boundary.walls.forEach((wall) => {
        if (drawnObjectIds.has(wall.id)) throw new Error(`Duplicate drawn terrain ID: ${wall.id}.`);
        drawnObjectIds.add(wall.id);
      });
      return {
        target: "wall",
        circle: primitive,
      };
    }
    return primitive.terrainType === "raised-area"
      ? {
        target: "raised-area",
        area: { id: primitive.id, segments },
      }
      : {
        target: "terrain-region",
        region: primitive.terrainType === "close-machinery"
          ? {
            id: primitive.id,
            kind: "close-machinery" as const,
            segments,
          }
          : {
            id: primitive.id,
            kind: "liquid-hydrogen" as const,
            segments,
            ...(primitive.settings ? { settings: { ...primitive.settings } } : {}),
          },
      };
  });
  const drawnRaisedAreaIds = new Set<string>();
  const drawnRaisedAreas = [
    ...(scenario.drawnRaisedAreas ?? []),
    ...primitiveAreas.flatMap((resolved) => resolved.target === "raised-area" ? [resolved.area] : []),
  ].map((area) => {
    if (drawnRaisedAreaIds.has(area.id)) {
      throw new Error(`Duplicate drawn raised area ID: ${area.id}.`);
    }
    if (drawnObjectIds.has(area.id)) {
      throw new Error(`Duplicate drawn terrain ID: ${area.id}.`);
    }
    drawnRaisedAreaIds.add(area.id);
    drawnObjectIds.add(area.id);
    return {
      area,
      cells: tacticalDrawnRaisedAreaCells(
        area,
        scenario.map.width,
        scenario.map.height,
      ),
    };
  });
  const drawnTerrainRegions = [
    ...(scenario.drawnTerrainRegions ?? []),
    ...primitiveAreas.flatMap((resolved) => resolved.target === "terrain-region" ? [resolved.region] : []),
  ].map((region) => {
    if (drawnObjectIds.has(region.id)) {
      throw new Error(`Duplicate drawn terrain ID: ${region.id}.`);
    }
    drawnObjectIds.add(region.id);
    return {
      region,
      cells: tacticalDrawnRaisedAreaCells(
        region,
        scenario.map.width,
        scenario.map.height,
      ),
    };
  });
  const naturalTerrainPlacements = (scenario.naturalTerrainPlacements ?? []).map((placement) => {
    if (drawnObjectIds.has(placement.id)) {
      throw new Error(`Duplicate drawn terrain ID: ${placement.id}.`);
    }
    if (!Number.isFinite(placement.radius) || placement.radius <= 0) {
      throw new Error(`${placement.kind === "tree" ? "Tree" : placement.kind === "bush" ? "Bush" : "Rock"} ${placement.id} requires a finite positive radius.`);
    }
    if (!validCell(placement.position)) {
      throw new Error(`${placement.kind === "tree" ? "Tree" : placement.kind === "bush" ? "Bush" : "Rock"} ${placement.id} has a center outside the map.`);
    }
    const center = { x: placement.position.x + 0.5, y: placement.position.y + 0.5 };
    if (
      center.x - placement.radius < 0
      || center.y - placement.radius < 0
      || center.x + placement.radius > scenario.map.width
      || center.y + placement.radius > scenario.map.height
    ) {
      throw new Error(`${placement.kind === "tree" ? "Tree" : placement.kind === "bush" ? "Bush" : "Rock"} ${placement.id} extends outside the map.`);
    }
    drawnObjectIds.add(placement.id);
    return {
      ...placement,
      position: { ...placement.position },
    };
  });
  const treeTrunkCells = naturalTerrainPlacements
    .filter((placement) => placement.kind === "tree")
    .map((placement) => ({ ...placement.position }));
  const bushCells = [...new Map(naturalTerrainPlacements
    .filter((placement) => placement.kind === "bush")
    .flatMap((placement) => tacticalNaturalTerrainFootprintCells(
      placement,
      scenario.map.width,
      scenario.map.height,
    ))
    .map((point) => [pointKey(point), point])).values()];
  const rockCells = [...new Map(naturalTerrainPlacements
    .filter((placement) => placement.kind === "rock")
    .flatMap((placement) => tacticalNaturalTerrainFootprintCells(
      placement,
      scenario.map.width,
      scenario.map.height,
    ))
    .map((point) => [pointKey(point), point])).values()];
  const fireCellKeys = new Set<string>();
  scenario.fireCells.forEach((point) => {
    if (!validCell(point)) throw new Error(`Scenario fire extends outside the map at ${pointKey(point)}.`);
    const key = pointKey(point);
    if (fireCellKeys.has(key)) throw new Error(`Duplicate scenario fire at ${key}.`);
    fireCellKeys.add(key);
  });
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
    [...resolved.occupiedCells, ...resolved.closeMachineryCells, ...resolved.bridgeCells, ...resolved.liquidHydrogenFootprintCells, ...resolved.deploymentCells].forEach((point) => {
      if (!validCell(point)) throw new Error(`Tactical terrain placement ${placement.id} extends outside the map at ${point.x}:${point.y}`);
    });
    terrainObjects.push(...resolved.objects);
    interiorCells.push(...resolved.interiorCells);
    lightSources.push(...resolved.lightSources);
    Object.entries(resolved.terrainByCell).forEach(([key, terrain]) => { terrainByCell[key] = terrain; });
    elevationAccessCells.push(...resolved.elevationAccessCells);
    deploymentCells.push(...resolved.deploymentCells);
    return { placement, resolved };
  });

  const nonRaisedRecords = records.filter((record) => record.resolved.occupiedCells.length > 0);
  const keySet = (points: GridPoint[]) => new Set(points.map(pointKey));
  type RaisedNode = {
    id: string;
    elevatedCells: GridPoint[];
    occupiedCells: GridPoint[];
  };
  const raisedNodes: RaisedNode[] = drawnRaisedAreas.map(({ area, cells }) => ({
      id: area.id,
      elevatedCells: cells,
      occupiedCells: cells,
    }));
  const raisedSets = new Map(raisedNodes.map((node) => [node.id, {
    elevated: keySet(node.elevatedCells),
    occupied: keySet(node.occupiedCells),
  }]));
  const supports = (lower: RaisedNode, upper: RaisedNode) => {
    const lowerCells = raisedSets.get(lower.id)!.elevated;
    return lower.elevatedCells.length > upper.elevatedCells.length
      && upper.occupiedCells.every((point) => lowerCells.has(pointKey(point)));
  };
  for (let firstIndex = 0; firstIndex < raisedNodes.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < raisedNodes.length; secondIndex += 1) {
      const first = raisedNodes[firstIndex];
      const second = raisedNodes[secondIndex];
      const firstOccupied = raisedSets.get(first.id)!.occupied;
      const overlaps = second.occupiedCells.some((point) => firstOccupied.has(pointKey(point)));
      if (overlaps && !supports(first, second) && !supports(second, first)) {
        const overlap = second.occupiedCells.find((point) => firstOccupied.has(pointKey(point)))!;
        throw new Error(`Raised areas ${first.id} and ${second.id} partially overlap at ${pointKey(overlap)}.`);
      }
    }
  }
  const nonRaisedOwnerByCell = new Map<string, string>();
  nonRaisedRecords.forEach((record) => record.resolved.occupiedCells.forEach((point) => {
    const key = pointKey(point);
    const existing = nonRaisedOwnerByCell.get(key);
    if (existing) throw new Error(`Tactical terrain placements ${existing} and ${record.placement.id} overlap at ${key}`);
    const raised = raisedNodes.find((candidate) => candidate.occupiedCells.some((cell) => pointKey(cell) === key));
    if (raised) throw new Error(`Tactical terrain placements ${raised.id} and ${record.placement.id} overlap at ${key}`);
    nonRaisedOwnerByCell.set(key, record.placement.id);
  }));

  const levelByRaisedId = new Map<string, number>();
  const raisedLevel = (node: RaisedNode): number => {
    const existing = levelByRaisedId.get(node.id);
    if (existing) return existing;
    const supporting = raisedNodes.filter((candidate) => supports(candidate, node));
    const level = supporting.length > 0 ? Math.max(...supporting.map(raisedLevel)) + 1 : 1;
    levelByRaisedId.set(node.id, level);
    return level;
  };
  raisedNodes.forEach(raisedLevel);
  const topRaisedOwnerByCell = new Map<string, string>();
  [...raisedNodes].sort((first, second) => raisedLevel(first) - raisedLevel(second)).forEach((node) => {
    const level = raisedLevel(node);
    node.elevatedCells.forEach((point) => {
      const key = pointKey(point);
      elevationLevelByCell[key] = level;
      terrainByCell[key] = "elevated";
      topRaisedOwnerByCell.set(key, node.id);
    });
  });
  const drawnRaisedAreaLevels = Object.fromEntries(
    drawnRaisedAreas.map(({ area }) => [area.id, levelByRaisedId.get(area.id) ?? 1]),
  );
  drawnRaisedAreas.forEach(({ area, cells }) => cells.forEach((point) => {
    const key = pointKey(point);
    const existingTerrain = nonRaisedOwnerByCell.get(key);
    if (existingTerrain) {
      throw new Error(`Drawn raised area ${area.id} overlaps terrain placement ${existingTerrain} at ${key}.`);
    }
  }));
  drawnAreaOwnerByCell.forEach((area, key) => {
    elevationLevelByCell[key] = area.elevation;
    if (area.elevation > 0) terrainByCell[key] = "elevated";
    else if (terrainByCell[key] === "elevated") delete terrainByCell[key];
  });
  (["grass", "sand", "water"] as const).forEach((kind) => {
    drawnTerrainRegions
      .filter(({ region }) => region.kind === kind)
      .forEach(({ cells }) => cells.forEach((point) => {
        terrainByCell[pointKey(point)] = kind;
      }));
  });
  drawnAreaOwnerByCell.forEach((area, key) => {
    if (area.surface !== "grass" && area.surface !== "sand" && area.surface !== "water") return;
    terrainByCell[key] = area.surface as TerrainType;
  });
  naturalTerrainPlacements.forEach((placement) => {
    const cells = tacticalNaturalTerrainFootprintCells(
      placement,
      scenario.map.width,
      scenario.map.height,
    );
    if (cells.some((point) => terrainByCell[pointKey(point)] === "water")) {
      throw new Error(`${placement.kind === "tree" ? "Tree" : placement.kind === "bush" ? "Bush" : "Rock"} ${placement.id} cannot be placed in water.`);
    }
  });
  bushCells.forEach((point) => { terrainByCell[pointKey(point)] = "bush"; });
  rockCells.forEach((point) => { terrainByCell[pointKey(point)] = "rock"; });
  const transitionEdges = new Set<string>();
  const elevationTransitions = (scenario.elevationTransitions ?? []).map((transition): TacticalElevationTransition => {
    if (!transition.id.trim()) throw new Error("Elevation transitions require an ID.");
    if (drawnObjectIds.has(transition.id)) throw new Error(`Duplicate drawn terrain ID: ${transition.id}.`);
    drawnObjectIds.add(transition.id);
    if (!validCell(transition.lower) || !validCell(transition.upper)) {
      throw new Error(`Elevation transition ${transition.id} extends outside the map.`);
    }
    const lowerLevel = elevationLevelByCell[pointKey(transition.lower)] ?? 0;
    const upperLevel = elevationLevelByCell[pointKey(transition.upper)] ?? 0;
    const flatBridge = transition.kind === "ramp"
      && lowerLevel === upperLevel
      && lowerLevel > 0;
    if (!flatBridge && upperLevel !== lowerLevel + 1) {
      throw new Error(`Elevation transition ${transition.id} must connect adjacent levels from lower to upper.`);
    }
    const dx = transition.upper.x - transition.lower.x;
    const dy = transition.upper.y - transition.lower.y;
    const distance = Math.abs(dx) + Math.abs(dy);
    if (dx !== 0 && dy !== 0) {
      throw new Error(`Elevation transition ${transition.id} must run horizontally or vertically.`);
    }
    if ((transition.kind === "stairs" || transition.kind === "ladder") && distance !== 1) {
      throw new Error(`${transition.kind === "stairs" ? "Stairs" : "Ladder"} ${transition.id} must connect neighboring squares.`);
    }
    if (transition.ladderMount) {
      if (transition.kind !== "ladder") {
        throw new Error(`Only ladders may define curve-aware mount geometry.`);
      }
      const tangentLength = Math.hypot(
        transition.ladderMount.tangent.x,
        transition.ladderMount.tangent.y,
      );
      const normalLength = Math.hypot(
        transition.ladderMount.outwardNormal.x,
        transition.ladderMount.outwardNormal.y,
      );
      const alignment = transition.ladderMount.tangent.x * transition.ladderMount.outwardNormal.x
        + transition.ladderMount.tangent.y * transition.ladderMount.outwardNormal.y;
      if (Math.abs(tangentLength - 1) > 0.02
        || Math.abs(normalLength - 1) > 0.02
        || Math.abs(alignment) > 0.02) {
        throw new Error(`Ladder ${transition.id} mount tangent and normal must be perpendicular unit vectors.`);
      }
    }
    const direction = { x: Math.sign(dx), y: Math.sign(dy) };
    const expectedPath = Array.from({ length: distance + 1 }, (_, index) => ({
      x: transition.lower.x + direction.x * index,
      y: transition.lower.y + direction.y * index,
    }));
    const path = transition.kind === "ramp" ? transition.path ?? expectedPath : expectedPath;
    if (transition.kind === "ramp") {
      if (distance < 1) throw new Error(`Ramp ${transition.id} must be at least one square long.`);
      if (path.length !== expectedPath.length || path.some((point, index) =>
        point.x !== expectedPath[index].x || point.y !== expectedPath[index].y)) {
        throw new Error(`Ramp ${transition.id} path must run directly from its lower square to its upper square.`);
      }
      path.forEach((point, index) => {
        if (!validCell(point)) throw new Error(`Ramp ${transition.id} extends outside the map.`);
        const level = elevationLevelByCell[pointKey(point)] ?? 0;
        const endpoint = index === 0 || index === path.length - 1;
        const validLevel = flatBridge
          ? endpoint
            ? level === lowerLevel
            : level < lowerLevel
          : level === (index === path.length - 1 ? upperLevel : lowerLevel);
        if (!validLevel) {
          if (flatBridge) {
            throw new Error(`Bridge ${transition.id} must connect matching raised endpoints across lower terrain.`);
          }
          throw new Error(`Ramp ${transition.id} must remain on its lower level until its upper endpoint.`);
        }
      });
    }
    const edgeKey = [pointKey(transition.lower), pointKey(transition.upper)].sort().join("|");
    if (transitionEdges.has(edgeKey)) throw new Error(`Two elevation transitions use edge ${edgeKey}.`);
    transitionEdges.add(edgeKey);
    return {
      id: transition.id,
      kind: transition.kind,
      lower: { ...transition.lower },
      upper: { ...transition.upper },
      path: path.map((point) => ({ ...point })),
      lowerLevel,
      upperLevel,
      ...(transition.kind === "ladder" ? { movementCost: 3 } : {}),
      ...(transition.ladderMount ? {
        ladderMount: {
          position: { ...transition.ladderMount.position },
          tangent: { ...transition.ladderMount.tangent },
          outwardNormal: { ...transition.ladderMount.outwardNormal },
        },
      } : {}),
    };
  });

  const bridgeOwnerByCell = new Map<string, string>();
  records.filter((record) => record.resolved.bridgeCells.length > 0).forEach((record) => {
    const cells = record.resolved.bridgeCells;
    const first = cells[0];
    const last = cells[cells.length - 1];
    const direction = { x: Math.sign(cells[1].x - first.x), y: Math.sign(cells[1].y - first.y) };
    const before = { x: first.x - direction.x, y: first.y - direction.y };
    const after = { x: last.x + direction.x, y: last.y + direction.y };
    const supportOptions = [
      { first, last, openDeckCells: cells.slice(1, -1) },
      { first: before, last: after, openDeckCells: cells },
    ];
    const support = supportOptions.find((option) => {
      const firstOwner = topRaisedOwnerByCell.get(pointKey(option.first));
      const lastOwner = topRaisedOwnerByCell.get(pointKey(option.last));
      const firstLevel = elevationLevelByCell[pointKey(option.first)] ?? 0;
      const lastLevel = elevationLevelByCell[pointKey(option.last)] ?? 0;
      return Boolean(firstOwner && lastOwner && firstOwner !== lastOwner && firstLevel === lastLevel);
    });
    if (!support) throw new Error(`Bridge placement ${record.placement.id} must connect two raised areas at the same height.`);
    support.openDeckCells.forEach((point) => {
      const key = pointKey(point);
      if (topRaisedOwnerByCell.has(key) || nonRaisedOwnerByCell.has(key)) throw new Error(`Bridge placement ${record.placement.id} intersects solid terrain at ${key}.`);
    });
    cells.forEach((point) => {
      const key = pointKey(point);
      const existing = bridgeOwnerByCell.get(key);
      if (existing) throw new Error(`Bridge placements ${existing} and ${record.placement.id} overlap at ${key}.`);
      bridgeOwnerByCell.set(key, record.placement.id);
    });
    bridges.push({ id: record.placement.id, cells: cells.map((point) => ({ ...point })), elevationLevel: elevationLevelByCell[pointKey(support.first)] });
  });

  const closeMachineryPlacements = [
    ...records
      .filter((record) => record.resolved.closeMachineryCells.length > 0)
      .map((record) => ({ id: record.placement.id, cells: record.resolved.closeMachineryCells })),
    ...drawnTerrainRegions
      .filter(({ region }) => region.kind === "close-machinery")
      .map(({ region, cells }) => ({ id: region.id, cells })),
    ...drawnAreas
      .filter(({ area }) => area.surface === "close-machinery")
      .map(({ area, cells }) => ({
        id: area.id,
        cells: cells.filter((point) => drawnAreaOwnerByCell.get(pointKey(point))?.id === area.id),
      })),
  ];
  const machineryOwnerByCell = new Map<string, string>();
  closeMachineryPlacements.forEach(({ id, cells }) => {
    cells.forEach((point) => {
      const key = `${point.x}:${point.y}`;
      const existing = machineryOwnerByCell.get(key);
      if (existing && existing !== id) throw new Error(`Tactical terrain placements ${existing} and ${id} overlap at ${key}`);
      machineryOwnerByCell.set(key, id);
    });
    if (cells.some((point) => nonRaisedOwnerByCell.has(pointKey(point)) || bridgeOwnerByCell.has(pointKey(point)))) throw new Error(`Close machinery placement ${id} overlaps another terrain placement.`);
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
  const stairCells = new Set([
    ...elevationAccessCells.map((point) => `${point.x}:${point.y}`),
    ...elevationTransitions
      .filter((transition) => transition.kind === "stairs")
      .map((transition) => pointKey(transition.lower)),
  ]);
  terrainObjects.filter((object) => object.kind === "terminal").forEach((terminal) => {
    const { x, y } = terminal.position;
    const key = `${x}:${y}`;
    if (x < 0 || y < 0 || x >= scenario.map.width || y >= scenario.map.height) throw new Error(`Tactical terminal ${terminal.id} extends outside the map at ${key}`);
    const existing = terminalByCell.get(key);
    if (existing) throw new Error(`Tactical terminals ${existing} and ${terminal.id} overlap at ${key}`);
    if (machineryCells.has(key)) throw new Error(`Tactical terminal ${terminal.id} overlaps close machinery at ${key}`);
    if (stairCells.has(key)) throw new Error(`Tactical terminal ${terminal.id} overlaps stairs at ${key}`);
    if (bridgeOwnerByCell.has(key)) throw new Error(`Tactical terminal ${terminal.id} overlaps a bridge at ${key}`);
    terminalByCell.set(key, terminal.id);
  });

  const hatchRecords = records.filter((record) => record.placement.terrainDefinitionId === "hatch-1x1");
  const hatchByCell = new Map<string, string>();
  hatchRecords.forEach((record) => {
    const hatch = record.resolved.objects.find((object) => object.kind === "hatch");
    if (!hatch || !validCell(hatch.position)) throw new Error(`Hatch placement ${record.placement.id} extends outside the map.`);
    const key = pointKey(hatch.position);
    const existing = hatchByCell.get(key);
    if (existing) throw new Error(`Hatch placements ${existing} and ${record.placement.id} overlap at ${key}.`);
    if (machineryCells.has(key)) throw new Error(`Hatch placement ${record.placement.id} overlaps close machinery at ${key}.`);
    if (stairCells.has(key)) throw new Error(`Hatch placement ${record.placement.id} overlaps stairs at ${key}.`);
    if (bridgeOwnerByCell.has(key)) throw new Error(`Hatch placement ${record.placement.id} overlaps a bridge at ${key}.`);
    if (terminalByCell.has(key)) throw new Error(`Hatch placement ${record.placement.id} overlaps a console at ${key}.`);
    hatchByCell.set(key, record.placement.id);

  });

  const liquidHydrogenOwnerByCell = new Map<string, string>();
  const liquidHydrogenRegions = [
    ...records
      .filter((record) => record.resolved.liquidHydrogenFootprintCells.length > 0)
      .map((record) => ({
        id: record.placement.id,
        cells: record.resolved.liquidHydrogenFootprintCells,
        filled: record.resolved.liquidHydrogenFilled,
      })),
    ...drawnTerrainRegions
      .filter(({ region }) => region.kind === "liquid-hydrogen")
      .map(({ region, cells }) => ({
        id: region.id,
        cells,
        filled: region.kind === "liquid-hydrogen" && region.settings?.filled !== false,
      })),
    ...drawnAreas
      .filter(({ area }) => area.surface === "liquid-hydrogen")
      .map(({ area, cells }) => ({
        id: area.id,
        cells: cells.filter((point) => drawnAreaOwnerByCell.get(pointKey(point))?.id === area.id),
        filled: area.settings?.filled !== false,
      })),
  ].filter((region) => region.cells.length > 0);
  liquidHydrogenRegions.forEach((region) => {
    const { cells } = region;
    cells.forEach((point) => {
      const key = pointKey(point);
      const existing = liquidHydrogenOwnerByCell.get(key);
      if (existing) throw new Error(`Liquid-hydrogen regions ${existing} and ${region.id} overlap at ${key}.`);
      if (machineryCells.has(key)) throw new Error(`Liquid-hydrogen region ${region.id} overlaps close machinery at ${key}.`);
      if (stairCells.has(key)) throw new Error(`Liquid-hydrogen region ${region.id} overlaps stairs at ${key}.`);
      if (bridgeOwnerByCell.has(key)) throw new Error(`Liquid-hydrogen region ${region.id} overlaps a bridge at ${key}.`);
      if (terminalByCell.has(key)) throw new Error(`Liquid-hydrogen region ${region.id} overlaps a console at ${key}.`);
      if (hatchByCell.has(key)) throw new Error(`Liquid-hydrogen region ${region.id} overlaps a hatch at ${key}.`);
      liquidHydrogenOwnerByCell.set(key, region.id);
    });
    const raisedOwners = cells.map((point) => topRaisedOwnerByCell.get(pointKey(point)));
    const coveredOwners = new Set(raisedOwners.filter((owner): owner is string => Boolean(owner)));
    if (coveredOwners.size > 0 && (coveredOwners.size !== 1 || raisedOwners.some((owner) => owner !== raisedOwners[0]))) {
      throw new Error(`Liquid-hydrogen region ${region.id} must fit entirely within one raised-area placement.`);
    }
    const levels = new Set(cells.map((point) => elevationLevelByCell[pointKey(point)] ?? 0));
    if (levels.size !== 1) throw new Error(`Liquid-hydrogen region ${region.id} must occupy one elevation level.`);
    liquidHydrogenAreas.push({ id: region.id, cells: cells.map((point) => ({ ...point })), filled: region.filled, elevationLevel: [...levels][0] });
  });

  const walls: CombatScenario["walls"] = [];
  const doors: CombatScenario["doors"] = [];
  const objects: MapObject[] = [];
  const mergedNonBoundaryObjects: TacticalTerrainObject[] = [];
  const boundaryByEdge = new Map<string, TacticalTerrainObject>();
  const boundaryEdgeKey = (object: Extract<TacticalTerrainObject, { kind: "wall" | "door" }>) => {
    const vertical = object.edge.from.x === object.edge.to.x;
    return vertical
      ? `v:${object.edge.from.x}:${Math.min(object.edge.from.y, object.edge.to.y)}:${Math.max(object.edge.from.y, object.edge.to.y)}`
      : `h:${object.edge.from.y}:${Math.min(object.edge.from.x, object.edge.to.x)}:${Math.max(object.edge.from.x, object.edge.to.x)}`;
  };
  terrainObjects.forEach((object) => {
    if (object.kind !== "wall" && object.kind !== "door") {
      mergedNonBoundaryObjects.push(object);
      return;
    }
    const edgeKey = boundaryEdgeKey(object);
    const existing = boundaryByEdge.get(edgeKey);
    if (!existing) {
      boundaryByEdge.set(edgeKey, object);
      return;
    }
    if (existing.kind !== object.kind) throw new Error(`Tactical terrain boundary conflict between ${existing.id} and ${object.id}.`);
  });
  const boundaryElevationLevel = (
    id: string,
    edges: { from: GridPoint; to: GridPoint }[],
  ) => {
    const levels = new Set<number>();
    edges.forEach((edge) => {
      const length = Math.hypot(edge.to.x - edge.from.x, edge.to.y - edge.from.y);
      const sampleCount = Math.max(1, Math.ceil(length * 2));
      for (let index = 0; index < sampleCount; index += 1) {
        const fromRatio = index / sampleCount;
        const toRatio = (index + 1) / sampleCount;
        const sample = {
          from: {
            x: edge.from.x + (edge.to.x - edge.from.x) * fromRatio,
            y: edge.from.y + (edge.to.y - edge.from.y) * fromRatio,
          },
          to: {
            x: edge.from.x + (edge.to.x - edge.from.x) * toRatio,
            y: edge.from.y + (edge.to.y - edge.from.y) * toRatio,
          },
        };
        const separated = tacticalCellsSeparatedBySegment(sample);
        const adjacentLevels = [separated.first, separated.second]
          .filter(validCell)
          .map((point) => elevationLevelByCell[pointKey(point)] ?? 0);
        levels.add(adjacentLevels.length > 0 ? Math.max(...adjacentLevels) : 0);
      }
    });
    if (levels.size > 1) {
      throw new Error(`Wall ${id} crosses multiple elevation levels.`);
    }
    return [...levels][0] ?? 0;
  };
  const withBoundaryElevation = (object: TacticalTerrainObject): TacticalTerrainObject =>
    object.kind === "wall" || object.kind === "door"
      ? { ...object, elevationLevel: boundaryElevationLevel(object.id, [object.edge]) }
      : object;
  const generatedTerrainObjects = [...mergedNonBoundaryObjects, ...boundaryByEdge.values()]
    .map(withBoundaryElevation);
  const generatedIds = new Set(generatedTerrainObjects.map((object) => object.id));
  drawnObjectIds.forEach((id) => {
    if (generatedIds.has(id)) throw new Error(`Drawn terrain ID ${id} conflicts with generated terrain.`);
  });
  const drawnWallObjects = allDrawnWalls.flatMap((wall): TacticalTerrainObject[] => {
    const portals = [...(wall.portals ?? [])].sort((first, second) => first.position - second.position);
    if (wall.control) {
      const curvedObjects: TacticalTerrainObject[] = tacticalQuadraticBezierWallSegments({ ...wall, control: wall.control }).map((segment) => ({
        id: segment.id,
        kind: "wall",
        edge: { from: { ...segment.from }, to: { ...segment.to } },
        blocking: true,
        targetable: true,
        integrity: 3,
      }));
      const elevationLevel = areaBoundaryElevationByWallId.get(wall.id) ?? boundaryElevationLevel(
        wall.id,
        curvedObjects.flatMap((object) => object.kind === "wall" ? [object.edge] : []),
      );
      return curvedObjects.map((object) => object.kind === "wall"
        ? { ...object, elevationLevel }
        : object);
    }
    if (portals.length === 0) {
      const elevationLevel = areaBoundaryElevationByWallId.get(wall.id)
        ?? boundaryElevationLevel(wall.id, [{ from: wall.from, to: wall.to }]);
      return [{
        id: wall.id,
        kind: "wall",
        edge: { from: { ...wall.from }, to: { ...wall.to } },
        blocking: true,
        targetable: true,
        integrity: 3,
        elevationLevel,
      }];
    }
    const dx = wall.to.x - wall.from.x;
    const dy = wall.to.y - wall.from.y;
    const length = Math.hypot(dx, dy);
    const pointAt = (distance: number) => ({
      x: wall.from.x + dx * distance / length,
      y: wall.from.y + dy * distance / length,
    });
    const resolved: TacticalTerrainObject[] = [];
    let cursor = 0;
    let section = 1;
    portals.forEach((portal) => {
      const center = portal.position * length;
      const portalStart = center - 0.5;
      const portalEnd = center + 0.5;
      if (portalStart > cursor + 1e-9) {
        resolved.push({
          id: `${wall.id}:section:${section}`,
          kind: "wall",
          edge: { from: pointAt(cursor), to: pointAt(portalStart) },
          blocking: true,
          targetable: true,
          integrity: 3,
        });
        section += 1;
      }
      const edge = { from: pointAt(portalStart), to: pointAt(portalEnd) };
      const separates = tacticalCellsSeparatedBySegment(edge);
      if (!validCell(separates.first) || !validCell(separates.second)) {
        throw new Error(`Portal ${portal.id} must connect two valid map cells.`);
      }
      resolved.push({
        id: portal.id,
        kind: "door",
        edge,
        separates,
        blocking: true,
        targetable: true,
        integrity: 2,
        open: false,
        portalType: portal.kind,
      });
      cursor = portalEnd;
    });
    if (cursor < length - 1e-9) {
      resolved.push({
        id: `${wall.id}:section:${section}`,
        kind: "wall",
        edge: { from: pointAt(cursor), to: { ...wall.to } },
        blocking: true,
        targetable: true,
        integrity: 3,
      });
    }
    const elevationLevel = boundaryElevationLevel(
      wall.id,
      resolved.flatMap((object) => object.kind === "wall" || object.kind === "door" ? [object.edge] : []),
    );
    return resolved.map((object) => object.kind === "wall" || object.kind === "door"
      ? { ...object, elevationLevel }
      : object);
  });
  const circleWallObjects = primitiveAreas.flatMap((resolved): TacticalTerrainObject[] => {
    if (resolved.target !== "wall") return [];
    const boundary = tacticalCircleWallBoundary(resolved.circle);
    const elevationLevel = boundaryElevationLevel(
      resolved.circle.id,
      [
        ...boundary.walls.map((wall) => ({ from: wall.from, to: wall.to })),
        ...boundary.portals.map((portal) => ({ from: portal.from, to: portal.to })),
      ],
    );
    return [
      ...boundary.walls.map((wall): TacticalTerrainObject => ({
        id: wall.id,
        kind: "wall",
        edge: { from: { ...wall.from }, to: { ...wall.to } },
        blocking: true,
        targetable: true,
        integrity: 3,
        elevationLevel,
      })),
      ...boundary.portals.map((portal): TacticalTerrainObject => ({
        id: portal.id,
        kind: "door",
        edge: { from: { ...portal.from }, to: { ...portal.to } },
        separates: tacticalCellsSeparatedBySegment(portal),
        blocking: true,
        targetable: true,
        integrity: 2,
        open: false,
        portalType: portal.kind,
        elevationLevel,
      })),
    ];
  });
  const areaBoundaryPortalObjects = drawnAreas.flatMap(({ area }): TacticalTerrainObject[] => {
    if (area.boundary !== "wall" || (area.portals?.length ?? 0) === 0) return [];
    const layout = tacticalAreaBoundaryPortalLayout(area);
    const elevationLevel = area.elevation;
    return [
      ...layout.walls.map((wall): TacticalTerrainObject => ({
        id: wall.id,
        kind: "wall",
        edge: { from: { ...wall.from }, to: { ...wall.to } },
        blocking: true,
        targetable: true,
        integrity: 3,
        elevationLevel,
      })),
      ...layout.portals.map((portal): TacticalTerrainObject => ({
        id: portal.id,
        kind: "door",
        edge: { from: { ...portal.from }, to: { ...portal.to } },
        separates: tacticalCellsSeparatedBySegment(portal),
        blocking: true,
        targetable: true,
        integrity: 2,
        open: false,
        portalType: portal.kind,
        elevationLevel,
      })),
    ];
  });
  const mergedTerrainObjects = [...generatedTerrainObjects, ...drawnWallObjects, ...circleWallObjects, ...areaBoundaryPortalObjects];
  mergedTerrainObjects.forEach((object) => {
    if (object.kind === "wall") walls.push({ id: object.id, from: { ...object.edge.from }, to: { ...object.edge.to } });
    else if (object.kind === "door") doors.push({ id: object.id, from: { ...object.edge.from }, to: { ...object.edge.to }, open: object.open, portalType: object.portalType ?? "sliding-door" });
    else if (object.kind === "terminal") objects.push({ id: object.id, kind: "console", position: { ...object.position }, label: object.label });
  });
  const deploymentEdges = scenario.deploymentEdges ?? ["south"];
  const edgeDeploymentCells = Array.from({ length: scenario.map.width }, (_, x) => Array.from({ length: scenario.map.height }, (_, y) => ({ x, y }))).flat().filter((point) => deploymentEdges.some((edge) => edge === "north" ? point.y < 6 : edge === "south" ? point.y >= scenario.map.height - 6 : edge === "west" ? point.x < 6 : point.x >= scenario.map.width - 6));
  const uniqueDeploymentCells = [...new Map([...edgeDeploymentCells, ...deploymentCells].map((point) => [pointKey(point), point])).values()];
  return {
    terrainObjects: mergedTerrainObjects,
    walls,
    doors,
    objects,
    interiorCells,
    lightSources,
    terrainByCell,
    elevationLevelByCell,
    drawnRaisedAreaLevels,
    drawnRaisedAreas: drawnRaisedAreas.map(({ area }) => ({
      id: area.id,
      segments: area.segments.map((segment) => ({
        ...segment,
        from: { ...segment.from },
        to: { ...segment.to },
        ...(segment.kind === "quadratic" ? { control: { ...segment.control } } : {}),
        ...(segment.kind === "cubic" ? { control1: { ...segment.control1 }, control2: { ...segment.control2 } } : {}),
      })),
    })),
    drawnTerrainRegions: drawnTerrainRegions.map(({ region }) => ({
      ...region,
      segments: region.segments.map((segment) => ({
        ...segment,
        from: { ...segment.from },
        to: { ...segment.to },
        ...(segment.kind === "quadratic" ? { control: { ...segment.control } } : {}),
        ...(segment.kind === "cubic" ? { control1: { ...segment.control1 }, control2: { ...segment.control2 } } : {}),
      })),
      ...(region.kind === "liquid-hydrogen" && region.settings
        ? { settings: { ...region.settings } }
        : {}),
    })),
    drawnAreas: drawnAreas.map(({ area }) => ({
      ...area,
      segments: area.segments.map((segment) => ({
        ...segment,
        from: { ...segment.from },
        to: { ...segment.to },
        ...(segment.kind === "quadratic" ? { control: { ...segment.control } } : {}),
        ...(segment.kind === "cubic" ? { control1: { ...segment.control1 }, control2: { ...segment.control2 } } : {}),
      })),
      ...(area.settings ? { settings: { ...area.settings } } : {}),
    })),
    naturalTerrainPlacements: naturalTerrainPlacements.map((placement) => ({
      ...placement,
      position: { ...placement.position },
    })),
    treeTrunkCells,
    bushCells,
    rockCells,
    elevationTransitions,
    closeMachineryCells,
    elevationAccessCells,
    bridges,
    liquidHydrogenAreas,
    deploymentCells: uniqueDeploymentCells,
  };
};
