import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
  resolveTacticalScenarioTerrain,
  tacticalClosedAreaGeometrySegments,
  type TacticalClosedAreaGeometry,
  type TacticalElevationTransitionDefinition,
  type TacticalRaisedAreaOutlineSegment,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import {
  cloneTacticalConsoleVictoryDefinition,
  defaultTacticalConsoleVictoryDefinition,
  type TacticalConsoleVictoryDefinitionFile,
} from "@/plugins/characterCombat/tacticalConsoleVictory";
import {
  tacticalElevationEdgeCandidates,
  tacticalLadderMountForEdge,
  tacticalNearestElevationEdgeCandidate,
} from "@/plugins/characterCombat/tacticalElevationTransitions";
import { tacticalCirclePrimitiveOutline } from "@/plugins/characterCombat/tacticalTerrainPrimitives";
import type { EditorMapPoint } from "@/plugins/characterCombat/editor/tacticalEditorInteractionState";
import { gridPoint } from "@/plugins/characterCombat/editor/tacticalEditorSupport";

const cloneEditorAreaSegments = (segments: TacticalRaisedAreaOutlineSegment[]) => segments.map((segment) => ({
  ...segment,
  from: { ...segment.from },
  to: { ...segment.to },
  ...(segment.kind === "quadratic" ? { control: { ...segment.control } } : {}),
  ...(segment.kind === "cubic" ? { control1: { ...segment.control1 }, control2: { ...segment.control2 } } : {}),
}));
const inferredConstrainedAreaGeometry = (
  id: string,
  segments: TacticalRaisedAreaOutlineSegment[],
): TacticalClosedAreaGeometry | null => {
  if (id.startsWith("rectangle-area-") && segments.length === 4 && segments.every((segment) => segment.kind === "line")) {
    const xs = segments.flatMap((segment) => [segment.from.x, segment.to.x]);
    const ys = segments.flatMap((segment) => [segment.from.y, segment.to.y]);
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    const corners = new Set(segments.flatMap((segment) => [segment.from, segment.to]).map((point) => `${point.x}:${point.y}`));
    if (corners.size === 4 && [...corners].every((corner) => {
      const [x, y] = corner.split(":").map(Number);
      return (x === left || x === right) && (y === top || y === bottom);
    })) return { kind: "rectangle", x: left, y: top, width: right - left, height: bottom - top };
  }
  if (id.startsWith("circle-area-") && segments.length >= 3) {
    const anchors = segments.map((segment) => segment.from);
    const left = Math.min(...anchors.map((point) => point.x));
    const right = Math.max(...anchors.map((point) => point.x));
    const top = Math.min(...anchors.map((point) => point.y));
    const bottom = Math.max(...anchors.map((point) => point.y));
    const center = { x: (left + right) / 2, y: (top + bottom) / 2 };
    const radius = (right - left + bottom - top) / 4;
    if (radius > 0) return { kind: "circle", center, radius };
  }
  return null;
};

export const upgradeLegacyTacticalEditorAreas = (definition: TacticalScenarioDefinitionFile): TacticalScenarioDefinitionFile => {
  const legacyRaisedAreas = definition.drawnRaisedAreas ?? [];
  const legacyRegions = definition.drawnTerrainRegions ?? [];
  const legacyCircles = (definition.drawnTerrainPrimitives ?? [])
    .filter((primitive) => (primitive.portals?.length ?? 0) === 0);
  let constrainedExistingArea = false;
  const existingAreas = (definition.drawnAreas ?? []).map((area) => {
    const geometry = area.geometry ?? inferredConstrainedAreaGeometry(area.id, area.segments);
    if (!geometry) return area;
    constrainedExistingArea = true;
    return { ...area, geometry, segments: tacticalClosedAreaGeometrySegments(geometry) };
  });
  if (legacyRaisedAreas.length === 0 && legacyRegions.length === 0 && legacyCircles.length === 0 && !constrainedExistingArea) return definition;
  const consumedRaisedIndexes = new Set<number>();
  const migratedRegions: NonNullable<TacticalScenarioDefinitionFile["drawnAreas"]> = legacyRegions.map((region) => {
    const shapeKey = JSON.stringify(region.segments);
    const matchingRaisedIndex = legacyRaisedAreas.findIndex((area, index) =>
      !consumedRaisedIndexes.has(index) && JSON.stringify(area.segments) === shapeKey);
    const matchingRaised = matchingRaisedIndex >= 0 ? legacyRaisedAreas[matchingRaisedIndex] : null;
    if (matchingRaised) consumedRaisedIndexes.add(matchingRaisedIndex);
    return {
      id: matchingRaised?.id ?? region.id,
      segments: cloneEditorAreaSegments(region.segments),
      surface: region.kind,
      elevation: matchingRaised ? 1 : 0,
      boundary: "none",
      ...(region.kind === "liquid-hydrogen" && region.settings ? { settings: { ...region.settings } } : {}),
    };
  });
  const migratedRaisedAreas: NonNullable<TacticalScenarioDefinitionFile["drawnAreas"]> = legacyRaisedAreas
    .filter((_area, index) => !consumedRaisedIndexes.has(index))
    .map((area) => ({
      id: area.id,
      segments: cloneEditorAreaSegments(area.segments),
      surface: "none",
      elevation: 1,
      boundary: "none",
    }));
  const migratedCircles: NonNullable<TacticalScenarioDefinitionFile["drawnAreas"]> = legacyCircles.map((circle) => ({
    id: circle.id,
    geometry: { kind: "circle", center: { ...circle.center }, radius: circle.radius },
    segments: cloneEditorAreaSegments(tacticalCirclePrimitiveOutline(circle)),
    surface: circle.terrainType === "close-machinery" || circle.terrainType === "liquid-hydrogen"
      ? circle.terrainType
      : "none",
    elevation: circle.terrainType === "raised-area" ? 1 : 0,
    boundary: circle.terrainType === "wall" ? "wall" : "none",
    ...(circle.terrainType === "liquid-hydrogen" && circle.settings ? { settings: { ...circle.settings } } : {}),
  }));
  const migratedCircleIds = new Set(legacyCircles.map((circle) => circle.id));
  return {
    ...definition,
    drawnAreas: [
      ...migratedRegions,
      ...migratedRaisedAreas,
      ...migratedCircles,
      ...existingAreas,
    ],
    drawnRaisedAreas: [],
    drawnTerrainRegions: [],
    drawnTerrainPrimitives: (definition.drawnTerrainPrimitives ?? [])
      .filter((primitive) => !migratedCircleIds.has(primitive.id)),
  };
};

export const freshDefaultDraft = () => upgradeLegacyTacticalEditorAreas(cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition));
export const freshDefaultConsoleVictory = () => cloneTacticalConsoleVictoryDefinition(defaultTacticalConsoleVictoryDefinition);
export const emptyTacticalScenarioDraft = (
  source: TacticalScenarioDefinitionFile,
  title: string,
): TacticalScenarioDefinitionFile => ({
  schemaVersion: 1,
  id: source.id,
  consoleVictoryDefinitionId: source.consoleVictoryDefinitionId ?? source.id,
  title: title.trim(),
  briefing: "",
  objective: "",
  map: { width: source.map.width, height: source.map.height },
  deploymentEdges: ["south"],
  terrainPlacements: [],
  drawnWalls: [],
  drawnRaisedAreas: [],
  drawnTerrainRegions: [],
  drawnAreas: [],
  drawnTerrainPrimitives: [],
  naturalTerrainPlacements: [],
  elevationTransitions: [],
  enemyPlacements: [],
  fireCells: [],
  smokeCells: [],
});
export const removeConsolePlacementOperations = (definition: TacticalConsoleVictoryDefinitionFile, placementId: string): TacticalConsoleVictoryDefinitionFile => {
  const removedOperationIds = new Set(definition.operations.filter((operation) => operation.consolePlacementId === placementId).map((operation) => operation.id));
  if (removedOperationIds.size === 0) return definition;
  return {
    ...definition,
    operations: definition.operations.filter((operation) => !removedOperationIds.has(operation.id)).map((operation) => ({
      ...operation,
      prerequisites: { ...operation.prerequisites, operationIds: operation.prerequisites.operationIds.filter((id) => !removedOperationIds.has(id)) },
      result: operation.result.type === "unlock" ? { ...operation.result, operationIds: operation.result.operationIds.filter((id) => !removedOperationIds.has(id)) } : operation.result,
    })),
  };
};
export const tacticalElevationTransitionPlacementCandidate = (
  definition: TacticalScenarioDefinitionFile,
  kind: TacticalElevationTransitionDefinition["kind"],
  point: EditorMapPoint,
): { definition: TacticalScenarioDefinitionFile; transition: TacticalElevationTransitionDefinition } => {
  if (kind === "ramp") throw new Error("Ramps require two-point placement.");
  const inside = (cell: { x: number; y: number }) =>
    cell.x >= 0 && cell.y >= 0 && cell.x < definition.map.width && cell.y < definition.map.height;
  if (!inside(point)) throw new Error("Select an edge inside the map.");
  const edgeCandidates = tacticalElevationEdgeCandidates(definition);
  const edgeCandidate = tacticalNearestElevationEdgeCandidate(edgeCandidates, point);
  if (!edgeCandidate) {
    const label = kind === "ladder" ? "ladder" : "stairs";
    throw new Error(edgeCandidates.length === 0
      ? `No unused adjacent-level edge is available for ${label}.`
      : `Move closer to a highlighted edge to place ${label}.`);
  }
  const lower = gridPoint(edgeCandidate.lower);
  const upper = gridPoint(edgeCandidate.upper);
  const ladderMount = kind === "ladder"
    ? tacticalLadderMountForEdge(definition, edgeCandidate)
    : { mount: null, error: null };
  if (ladderMount.error) throw new Error(ladderMount.error);
  let suffix = 1;
  let id = `${kind}-${suffix}`;
  while ((definition.elevationTransitions ?? []).some((transition) => transition.id === id)) {
    suffix += 1;
    id = `${kind}-${suffix}`;
  }
  const transition: TacticalElevationTransitionDefinition = {
    id,
    kind,
    lower,
    upper,
    ...(ladderMount.mount ? { ladderMount: ladderMount.mount } : {}),
  };
  const candidate = {
    ...definition,
    elevationTransitions: [...(definition.elevationTransitions ?? []), transition],
  };
  resolveTacticalScenarioTerrain(candidate);
  return { definition: candidate, transition };
};
export const removeDrawnRaisedAreaCandidate = (
  definition: TacticalScenarioDefinitionFile,
  areaId: string,
): { definition: TacticalScenarioDefinitionFile; removedTransitionIds: string[] } => {
  const withoutArea: TacticalScenarioDefinitionFile = {
    ...definition,
    drawnRaisedAreas: (definition.drawnRaisedAreas ?? []).filter((area) => area.id !== areaId),
    elevationTransitions: [],
  };
  resolveTacticalScenarioTerrain(withoutArea);
  const keptTransitions: TacticalElevationTransitionDefinition[] = [];
  const removedTransitionIds: string[] = [];
  (definition.elevationTransitions ?? []).forEach((transition) => {
    const candidate = { ...withoutArea, elevationTransitions: [...keptTransitions, transition] };
    try {
      resolveTacticalScenarioTerrain(candidate);
      keptTransitions.push(transition);
    } catch {
      removedTransitionIds.push(transition.id);
    }
  });
  const candidate = { ...withoutArea, elevationTransitions: keptTransitions };
  resolveTacticalScenarioTerrain(candidate);
  return { definition: candidate, removedTransitionIds };
};
export const removeDrawnTerrainPrimitiveCandidate = (
  definition: TacticalScenarioDefinitionFile,
  primitiveId: string,
): { definition: TacticalScenarioDefinitionFile; removedTransitionIds: string[] } => {
  const withoutPrimitive: TacticalScenarioDefinitionFile = {
    ...definition,
    drawnTerrainPrimitives: (definition.drawnTerrainPrimitives ?? [])
      .filter((primitive) => primitive.id !== primitiveId),
    elevationTransitions: [],
  };
  resolveTacticalScenarioTerrain(withoutPrimitive);
  const keptTransitions: TacticalElevationTransitionDefinition[] = [];
  const removedTransitionIds: string[] = [];
  (definition.elevationTransitions ?? []).forEach((transition) => {
    const candidate = {
      ...withoutPrimitive,
      elevationTransitions: [...keptTransitions, transition],
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      keptTransitions.push(transition);
    } catch {
      removedTransitionIds.push(transition.id);
    }
  });
  const candidate = { ...withoutPrimitive, elevationTransitions: keptTransitions };
  resolveTacticalScenarioTerrain(candidate);
  return { definition: candidate, removedTransitionIds };
};
