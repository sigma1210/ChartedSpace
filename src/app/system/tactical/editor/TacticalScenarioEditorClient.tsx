"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Provider } from "react-redux";
import { FloatingPluginHud, type FloatingPluginHudLayout } from "@/components/hud/FloatingPluginHud";
import { PluginHudLayer } from "@/components/hud/PluginHudLayer";
import TacticalMapPageClient from "../TacticalMapPageClient";
import { TacticalNavigationHud } from "../TacticalNavigationHud";
import { cloneTacticalScenarioDefinition, defaultTacticalScenarioDefinition, resolveTacticalScenarioTerrain, tacticalPlacementSupportsConsoleOperations, tacticalTerrainPalette, type TacticalDeploymentEdge, type TacticalDrawnRaisedArea, type TacticalDrawnWall, type TacticalElevationTransitionDefinition, type TacticalEnemyPlacement, type TacticalEnemyType, type TacticalRaisedAreaOutlineSegment, type TacticalScenarioDefinitionFile, type TacticalScenarioTracingTemplate, type TacticalTerrainPlacement } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { tacticalDrawnRaisedAreaCells } from "@/plugins/characterCombat/tacticalDrawnRaisedAreas";
import { tacticalElevationEdgeCandidates, tacticalNearestElevationEdgeCandidate, tacticalRampPlacementCandidate, tacticalRampPlacementPreview, type TacticalElevationEdgeCandidate, type TacticalElevationEdgePointer } from "@/plugins/characterCombat/tacticalElevationTransitions";
import { cloneTacticalConsoleVictoryDefinition, defaultTacticalConsoleVictoryDefinition, TRAVELLER_TASK_DIFFICULTIES, validateTacticalConsoleVictoryDefinition, type TacticalConsoleOperation, type TacticalConsoleVictoryDefinitionFile, type TravellerTaskDifficulty } from "@/plugins/characterCombat/tacticalConsoleVictory";
import { randomTacticalEnemyAvatarPath, tacticalEnemyPalette } from "@/plugins/characterCombat/tacticalEnemyDefinitions";
import type { TacticalTerminalKind } from "@/plugins/characterCombat/tacticalTerrain";
import { defaultTacticalInteractiveHumanCombatProfile, tacticalHumanArmorOptions, tacticalHumanWeaponOptions, validateTacticalInteractiveHumanCombatProfile, type TacticalInteractiveHumanCombatProfile, type TacticalHumanArmorId, type TacticalHumanWeaponId } from "@/plugins/characterCombat/tacticalInteractiveHuman";
import { buildDefaultTacticalScenario } from "@/plugins/characterCombat/defaultTacticalScenario";
import { tacticalWallPortalPlacementCandidate, tacticalWallPortalRepositionCandidate, type TacticalWallPortalKind } from "@/plugins/characterCombat/tacticalWallPortals";
import { createAppStore, store, type AppStore } from "@/store";

const freshDefaultDraft = () => cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
const freshDefaultConsoleVictory = () => cloneTacticalConsoleVictoryDefinition(defaultTacticalConsoleVictoryDefinition);
const definitionsMatch = (first: TacticalScenarioDefinitionFile, second: TacticalScenarioDefinitionFile) => JSON.stringify(first) === JSON.stringify(second);
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
type ScenarioSummary = { id: string; title: string; isDefault: boolean };
type TacticalTemplateAsset = { id: string; label: string; imagePath: string; source: "built-in" | "uploaded" };
const fetchScenarioList = async () => {
  const response = await fetch("/api/tactical/scenarios", { cache: "no-store" });
  const body = await response.json() as { scenarios?: ScenarioSummary[]; error?: string };
  if (!response.ok || !body.scenarios) throw new Error(body.error ?? "Could not list scenario files.");
  return body.scenarios;
};
const FIRE_TOOL_ID = "scenario-fire";
const WALL_TOOL_ID = "scenario-wall";
const CURVED_WALL_TOOL_ID = "scenario-curved-wall";
const RAISED_AREA_TOOL_ID = "scenario-raised-area";
const RAISED_AREA_CURVE_TOOL_ID = "scenario-raised-area-curve";
const DOOR_TOOL_ID = "scenario-wall-door";
const WALL_IRIS_TOOL_ID = "scenario-wall-iris-valve";
const STAIRS_TOOL_ID = "scenario-stairs";
const LADDER_TOOL_ID = "scenario-ladder";
const RAMP_TOOL_ID = "scenario-ramp";
const wallPortalKindForTool = (tool: string | null): TacticalWallPortalKind | null =>
  tool === DOOR_TOOL_ID ? "sliding-door" : tool === WALL_IRIS_TOOL_ID ? "iris-valve" : null;
const elevationTransitionKindForTool = (tool: string | null): TacticalElevationTransitionDefinition["kind"] | null =>
  tool === STAIRS_TOOL_ID ? "stairs" : tool === LADDER_TOOL_ID ? "ladder" : tool === RAMP_TOOL_ID ? "ramp" : null;
const INTERACTION_SKILLS = ["Bribery", "Carouse", "Diplomat", "Medic", "Leadership", "Streetwise", "Persuade", "Investigate", "Deception"] as const;
const cellKey = (point: { x: number; y: number }) => `${point.x}:${point.y}`;
const gridPoint = (point: { x: number; y: number }) => ({ x: point.x, y: point.y });
export const fitTacticalTracingTemplate = (
  imagePath: string,
  naturalSize: { width: number; height: number },
  mapSize: { width: number; height: number },
): TacticalScenarioTracingTemplate => {
  const validNaturalSize = naturalSize.width > 0 && naturalSize.height > 0;
  const naturalWidth = validNaturalSize ? naturalSize.width : mapSize.width;
  const naturalHeight = validNaturalSize ? naturalSize.height : mapSize.height;
  const scale = Math.min(mapSize.width / naturalWidth, mapSize.height / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  return {
    imagePath,
    x: (mapSize.width - width) / 2,
    y: (mapSize.height - height) / 2,
    width,
    height,
    rotation: 0,
    opacity: 0.45,
    visible: true,
    lockAspectRatio: true,
  };
};
type TracingTemplateCorner = "nw" | "ne" | "se" | "sw";
type TracingTemplateTransformDrag =
  | { kind: "move"; start: { x: number; y: number }; original: TacticalScenarioTracingTemplate }
  | { kind: "resize"; corner: TracingTemplateCorner; original: TacticalScenarioTracingTemplate }
  | { kind: "rotate"; center: { x: number; y: number }; startAngle: number; original: TacticalScenarioTracingTemplate };
const tracingTemplateRotation = (template: TacticalScenarioTracingTemplate) => template.rotation * Math.PI / 180;
const tracingTemplateCenter = (template: TacticalScenarioTracingTemplate) => ({
  x: template.x + template.width / 2,
  y: template.y + template.height / 2,
});
const rotateOffset = (offset: { x: number; y: number }, radians: number) => ({
  x: offset.x * Math.cos(radians) - offset.y * Math.sin(radians),
  y: offset.x * Math.sin(radians) + offset.y * Math.cos(radians),
});
const tracingTemplateHandlePoint = (template: TacticalScenarioTracingTemplate, corner: TracingTemplateCorner) => {
  const center = tracingTemplateCenter(template);
  const signs = {
    nw: { x: -1, y: -1 },
    ne: { x: 1, y: -1 },
    se: { x: 1, y: 1 },
    sw: { x: -1, y: 1 },
  }[corner];
  const offset = rotateOffset({ x: signs.x * template.width / 2, y: signs.y * template.height / 2 }, tracingTemplateRotation(template));
  return { x: center.x + offset.x, y: center.y + offset.y };
};
export const resizeTacticalTracingTemplate = (
  original: TacticalScenarioTracingTemplate,
  corner: TracingTemplateCorner,
  point: { x: number; y: number },
): TacticalScenarioTracingTemplate => {
  const signs = {
    nw: { x: -1, y: -1 },
    ne: { x: 1, y: -1 },
    se: { x: 1, y: 1 },
    sw: { x: -1, y: 1 },
  }[corner];
  const opposite = ({ nw: "se", ne: "sw", se: "nw", sw: "ne" } as const)[corner];
  const anchor = tracingTemplateHandlePoint(original, opposite);
  const radians = tracingTemplateRotation(original);
  const widthAxis = { x: Math.cos(radians), y: Math.sin(radians) };
  const heightAxis = { x: -Math.sin(radians), y: Math.cos(radians) };
  const delta = { x: point.x - anchor.x, y: point.y - anchor.y };
  let width = Math.max(0.25, signs.x * (delta.x * widthAxis.x + delta.y * widthAxis.y));
  let height = Math.max(0.25, signs.y * (delta.x * heightAxis.x + delta.y * heightAxis.y));
  if (original.lockAspectRatio) {
    const aspectRatio = original.width / original.height;
    const widthChange = Math.abs(width - original.width) / original.width;
    const heightChange = Math.abs(height - original.height) / original.height;
    if (widthChange >= heightChange) height = width / aspectRatio;
    else width = height * aspectRatio;
  }
  const center = {
    x: anchor.x + signs.x * widthAxis.x * width / 2 + signs.y * heightAxis.x * height / 2,
    y: anchor.y + signs.x * widthAxis.y * width / 2 + signs.y * heightAxis.y * height / 2,
  };
  return { ...original, x: center.x - width / 2, y: center.y - height / 2, width, height };
};
const loadImageDimensions = (imagePath: string) => new Promise<{ width: number; height: number }>((resolve, reject) => {
  const image = new window.Image();
  image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
  image.onerror = () => reject(new Error("The selected tracing template could not be loaded."));
  image.src = imagePath;
});
const facingRotation = (facing: NonNullable<TacticalEnemyPlacement["facing"]> | TacticalTerrainPlacement["rotation"]) => typeof facing === "number" ? facing : ({ north: 0, east: 90, south: 180, west: 270 } as const)[facing];
const facingVector = (facing: NonNullable<TacticalEnemyPlacement["facing"]> | TacticalTerrainPlacement["rotation"]) => {
  const radians = facingRotation(facing) * Math.PI / 180;
  return { x: Math.sin(radians), y: -Math.cos(radians) };
};
const facingName = (facing: NonNullable<TacticalEnemyPlacement["facing"]> | TacticalTerrainPlacement["rotation"]) => ["North", "East", "South", "West"][facingRotation(facing) / 90] ?? "North";
type EditorMapPoint = TacticalElevationEdgePointer;
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
type WallEndpoint = "from" | "to";
type WallEndpointDrag = {
  id: string;
  endpoint: WallEndpoint;
  original: { from: { x: number; y: number }; to: { x: number; y: number }; control?: { x: number; y: number } };
};
type WallMoveDrag = {
  id: string;
  start: { x: number; y: number };
  original: { from: { x: number; y: number }; to: { x: number; y: number }; control?: { x: number; y: number } };
};
type WallControlDrag = { id: string; original: { x: number; y: number } };
type WallPortalDrag = {
  wallId: string;
  portalId: string;
  originalPosition: number;
};
type RaisedAreaDraft = {
  start: { x: number; y: number };
  current: { x: number; y: number };
  hover: { x: number; y: number };
  segments: TacticalRaisedAreaOutlineSegment[];
};
type RaisedAreaControlDrag = {
  areaId: string | null;
  segmentIndex: number;
  original: { x: number; y: number };
};
type RampDraft = { edge: TacticalElevationEdgeCandidate };
const isRaisedAreaTool = (tool: string | null) => tool === RAISED_AREA_TOOL_ID || tool === RAISED_AREA_CURVE_TOOL_ID;
const sameGridPoint = (first: { x: number; y: number }, second: { x: number; y: number }) => first.x === second.x && first.y === second.y;
const raisedAreaSegment = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  curved: boolean,
  map: { width: number; height: number },
): TacticalRaisedAreaOutlineSegment => {
  if (!curved) return { kind: "line", from: gridPoint(from), to: gridPoint(to) };
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return {
    kind: "quadratic",
    from: gridPoint(from),
    control: {
      x: Math.max(0, Math.min(map.width, (from.x + to.x) / 2 - dy * 0.25)),
      y: Math.max(0, Math.min(map.height, (from.y + to.y) / 2 + dx * 0.25)),
    },
    to: gridPoint(to),
  };
};
export const tacticalEditorMarkerInteractionEnabled = (
  placementKind: string | null,
  enemyKind: TacticalEnemyType | null,
) => placementKind === null && enemyKind === null;
const placementRotations = (terrainDefinitionId: string): TacticalTerrainPlacement["rotation"][] =>
  terrainDefinitionId.startsWith("bridge-") ? [0, 90, 180, 270] : [0];
const rotatePreviewCell = (point: { x: number; y: number }, size: { width: number; height: number }, rotation: TacticalTerrainPlacement["rotation"]) => {
  if (rotation === 90) return { x: size.height - 1 - point.y, y: point.x };
  if (rotation === 180) return { x: size.width - 1 - point.x, y: size.height - 1 - point.y };
  if (rotation === 270) return { x: point.y, y: size.width - 1 - point.x };
  return point;
};
const placementCandidates = (terrainDefinitionId: string, anchor: EditorMapPoint) => {
  const paletteItem = tacticalTerrainPalette.find((item) => item.id === terrainDefinitionId);
  if (!paletteItem) return [];
  const candidates = placementRotations(terrainDefinitionId).flatMap((rotation) => {
    const cells = paletteItem.previewCells.map((cell) => rotatePreviewCell(cell, paletteItem.size, rotation));
    const anchors = terrainDefinitionId.startsWith("bridge-") ? cells : [{ x: 0, y: 0 }];
    return anchors.map((cell) => ({ rotation, cells, origin: { x: anchor.x - cell.x, y: anchor.y - cell.y } }));
  });
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.origin.x}:${candidate.origin.y}:${candidate.rotation}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const DraftPreview = ({ definition, selectedPlacementId, selectedEnemyId, selectedWallId, selectedRaisedAreaId, selectedElevationTransitionId, selectedPortalId, selectedFire, placementKind, enemyKind, placementHover, enemyHover, portalHover, wallDraft, raisedAreaDraft, rampDraft, dragRaisedAreaControl, dragWallEndpoint, dragWallMove, dragWallControl, dragWallPortal, dragTracingTemplate, tracingTemplateEditing, dragPlacement, dragEnemy, selectPlacement, selectEnemy, selectWall, selectRaisedArea, selectElevationTransition, selectPortal, selectFire, hoverPlacement, hoverEnemy, hoverPortal, beginWall, updateWall, finishWall, finishWallInteraction, cancelWall, addRaisedAreaVertex, hoverRaisedArea, beginOrFinishRamp, beginRaisedAreaControlDrag, reshapeRaisedAreaControl, finishRaisedAreaControlDrag, cancelRaisedAreaControlDrag, placeWallPortal, beginWallEndpointDrag, resizeWallEndpoint, finishWallEndpointDrag, cancelWallEndpointDrag, beginWallMove, moveWall, finishWallMove, cancelWallMove, beginWallControlDrag, reshapeWallControl, finishWallControlDrag, cancelWallControlDrag, beginWallPortalDrag, moveWallPortal, finishWallPortalDrag, cancelWallPortalDrag, beginTracingTemplateDrag, transformTracingTemplate, finishTracingTemplateDrag, cancelTracingTemplateDrag, beginDrag, beginEnemyDrag, endDrag, placeTerrain, placeEnemy, moveTerrain, moveEnemy }: {
  definition: TacticalScenarioDefinitionFile;
  selectedPlacementId: string | null;
  selectedEnemyId: string | null;
  selectedWallId: string | null;
  selectedRaisedAreaId: string | null;
  selectedElevationTransitionId: string | null;
  selectedPortalId: string | null;
  selectedFire: { x: number; y: number } | null;
  placementKind: string | null;
  enemyKind: TacticalEnemyType | null;
  placementHover: EditorMapPoint | null;
  enemyHover: { x: number; y: number } | null;
  portalHover: { x: number; y: number } | null;
  wallDraft: { from: { x: number; y: number }; to: { x: number; y: number }; curved: boolean; awaitingEnd: boolean } | null;
  raisedAreaDraft: RaisedAreaDraft | null;
  rampDraft: RampDraft | null;
  dragRaisedAreaControl: RaisedAreaControlDrag | null;
  dragWallEndpoint: WallEndpointDrag | null;
  dragWallMove: WallMoveDrag | null;
  dragWallControl: WallControlDrag | null;
  dragWallPortal: WallPortalDrag | null;
  dragTracingTemplate: TracingTemplateTransformDrag | null;
  tracingTemplateEditing: boolean;
  dragPlacement: { id: string; offset: { x: number; y: number } } | null;
  dragEnemy: { id: string; offset: { x: number; y: number } } | null;
  selectPlacement: (id: string | null) => void;
  selectEnemy: (id: string | null) => void;
  selectWall: (id: string | null) => void;
  selectRaisedArea: (id: string | null) => void;
  selectElevationTransition: (id: string | null) => void;
  selectPortal: (id: string | null) => void;
  selectFire: (point: { x: number; y: number } | null) => void;
  hoverPlacement: (point: EditorMapPoint | null) => void;
  hoverEnemy: (point: { x: number; y: number } | null) => void;
  hoverPortal: (point: { x: number; y: number } | null) => void;
  beginWall: (point: { x: number; y: number }) => void;
  updateWall: (point: { x: number; y: number }) => void;
  finishWall: (point: { x: number; y: number }) => void;
  finishWallInteraction: (point: { x: number; y: number }) => void;
  cancelWall: () => void;
  addRaisedAreaVertex: (point: { x: number; y: number }) => void;
  hoverRaisedArea: (point: { x: number; y: number }) => void;
  beginOrFinishRamp: (point: EditorMapPoint) => void;
  beginRaisedAreaControlDrag: (areaId: string | null, segmentIndex: number) => void;
  reshapeRaisedAreaControl: (point: { x: number; y: number }) => void;
  finishRaisedAreaControlDrag: () => void;
  cancelRaisedAreaControlDrag: () => void;
  placeWallPortal: (point: { x: number; y: number }) => void;
  beginWallEndpointDrag: (id: string, endpoint: WallEndpoint) => void;
  resizeWallEndpoint: (point: { x: number; y: number }) => void;
  finishWallEndpointDrag: () => void;
  cancelWallEndpointDrag: () => void;
  beginWallMove: (id: string, point: { x: number; y: number }) => void;
  moveWall: (point: { x: number; y: number }) => void;
  finishWallMove: () => void;
  cancelWallMove: () => void;
  beginWallControlDrag: (id: string) => void;
  reshapeWallControl: (point: { x: number; y: number }) => void;
  finishWallControlDrag: () => void;
  cancelWallControlDrag: () => void;
  beginWallPortalDrag: (id: string) => void;
  moveWallPortal: (point: { x: number; y: number }) => void;
  finishWallPortalDrag: () => void;
  cancelWallPortalDrag: () => void;
  beginTracingTemplateDrag: (kind: "move" | "rotate" | TracingTemplateCorner, point: { x: number; y: number }) => void;
  transformTracingTemplate: (point: { x: number; y: number }) => void;
  finishTracingTemplateDrag: () => void;
  cancelTracingTemplateDrag: () => void;
  beginDrag: (drag: { id: string; offset: { x: number; y: number } }) => void;
  beginEnemyDrag: (drag: { id: string; offset: { x: number; y: number } }) => void;
  endDrag: () => void;
  placeTerrain: (point: EditorMapPoint) => void;
  placeEnemy: (point: { x: number; y: number }) => void;
  moveTerrain: (id: string, origin: { x: number; y: number }) => void;
  moveEnemy: (id: string, position: { x: number; y: number }) => void;
}) => {
  const resolved = useMemo(() => {
    try {
      return { terrain: resolveTacticalScenarioTerrain(definition), error: null };
    } catch (error) {
      return { terrain: null, error: error instanceof Error ? error.message : "The draft could not be resolved." };
    }
  }, [definition]);
  const elevationEdgeCandidates = useMemo(() => {
    if (!elevationTransitionKindForTool(placementKind)) return [];
    try {
      return tacticalElevationEdgeCandidates(definition);
    } catch {
      return [];
    }
  }, [definition, placementKind]);
  const nearestElevationEdgePreview = placementHover
    ? tacticalNearestElevationEdgeCandidate(elevationEdgeCandidates, placementHover)
    : null;
  const elevationEdgePreview = rampDraft?.edge ?? nearestElevationEdgePreview;
  const rampPreview = rampDraft && placementHover
    ? tacticalRampPlacementPreview(definition, rampDraft.edge, placementHover)
    : null;

  const localMapPoint = (event: ReactPointerEvent<SVGElement>) => {
    const svg = event.currentTarget instanceof SVGSVGElement ? event.currentTarget : event.currentTarget.ownerSVGElement;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(matrix.inverse());
  };
  const mapPoint = (event: ReactPointerEvent<SVGElement>) => {
    const local = localMapPoint(event);
    if (!local) return null;
    const x = Math.floor(local.x);
    const y = Math.floor(local.y);
    const fractionX = local.x - x;
    const fractionY = local.y - y;
    const edgeRotation = ([
      { distance: fractionY, rotation: 0 as const },
      { distance: 1 - fractionX, rotation: 90 as const },
      { distance: 1 - fractionY, rotation: 180 as const },
      { distance: fractionX, rotation: 270 as const },
    ]).sort((first, second) => first.distance - second.distance)[0].rotation;
    return { x, y, edgeRotation, mapX: local.x, mapY: local.y };
  };
  const mapVertex = (event: ReactPointerEvent<SVGElement>) => {
    const local = localMapPoint(event);
    if (!local) return null;
    return {
      x: Math.max(0, Math.min(definition.map.width, Math.round(local.x))),
      y: Math.max(0, Math.min(definition.map.height, Math.round(local.y))),
    };
  };
  const raisedAreaPreview = (() => {
    if (!raisedAreaDraft || sameGridPoint(raisedAreaDraft.current, raisedAreaDraft.hover)) return { segment: null, cells: [] };
    const segment = raisedAreaSegment(
      raisedAreaDraft.current,
      raisedAreaDraft.hover,
      placementKind === RAISED_AREA_CURVE_TOOL_ID,
      definition.map,
    );
    const segments = [...raisedAreaDraft.segments, segment];
    if (!sameGridPoint(raisedAreaDraft.hover, raisedAreaDraft.start)) {
      segments.push({ kind: "line", from: gridPoint(raisedAreaDraft.hover), to: gridPoint(raisedAreaDraft.start) });
    }
    try {
      return {
        segment,
        cells: segments.length >= 3
          ? tacticalDrawnRaisedAreaCells({ id: "__raised-area-preview__", segments }, definition.map.width, definition.map.height)
          : [],
      };
    } catch {
      return { segment, cells: [] };
    }
  })();
  const placementSize = (placement: TacticalTerrainPlacement) => {
    const definition = tacticalTerrainPalette.find((item) => item.id === placement.terrainDefinitionId);
    if (!definition) return { width: 1, height: 1 };
    return placement.rotation === 90 || placement.rotation === 270
      ? { width: definition.size.height, height: definition.size.width }
      : definition.size;
  };
  const placementPreview = (() => {
    if (!placementKind || !placementHover) return null;
    if (placementKind === FIRE_TOOL_ID) {
      const valid = placementHover.x >= 0
        && placementHover.y >= 0
        && placementHover.x < definition.map.width
        && placementHover.y < definition.map.height
        && !definition.fireCells.some((cell) => cellKey(cell) === cellKey(placementHover));
      return { kind: "fire" as const, origin: placementHover, cells: [{ x: 0, y: 0 }], valid };
    }
    const paletteItem = tacticalTerrainPalette.find((item) => item.id === placementKind);
    if (!paletteItem) return null;
    for (const candidate of placementCandidates(placementKind, placementHover)) {
      const previewPlacement: TacticalTerrainPlacement = { id: "terrain-placement-preview", terrainDefinitionId: placementKind, origin: candidate.origin, rotation: candidate.rotation };
      try {
        resolveTacticalScenarioTerrain({ ...definition, terrainPlacements: [...definition.terrainPlacements, previewPlacement] });
        return { kind: "terrain" as const, origin: candidate.origin, cells: candidate.cells, valid: true };
      } catch {
        // Try the next bridge orientation.
      }
    }
    return { kind: "terrain" as const, origin: placementHover, cells: paletteItem.previewCells, valid: false };
  })();
  const portalKind = wallPortalKindForTool(placementKind);
  const elevationTransitionKind = elevationTransitionKindForTool(placementKind);
  const portalPreview = (() => {
    if (!portalKind || !portalHover) return null;
    const candidate = tacticalWallPortalPlacementCandidate(definition.drawnWalls ?? [], portalHover, portalKind);
    if (!candidate || !candidate.available) return candidate ? { ...candidate, valid: false } : null;
    const previewId = "__wall-portal-preview__";
    const previewDefinition: TacticalScenarioDefinitionFile = {
      ...definition,
      drawnWalls: (definition.drawnWalls ?? []).map((wall) => wall.id === candidate.wallId
        ? { ...wall, portals: [...(wall.portals ?? []), { id: previewId, kind: portalKind, position: candidate.position }] }
        : wall),
    };
    try {
      resolveTacticalScenarioTerrain(previewDefinition);
      return { ...candidate, valid: true };
    } catch {
      return { ...candidate, valid: false };
    }
  })();

  if (!resolved.terrain) return <div className="flex h-full items-center justify-center p-8 font-mono text-sm text-red-200">{resolved.error}</div>;
  const { terrain } = resolved;
  const orderedPlacements = [...definition.terrainPlacements].sort((first, second) => {
    const firstSize = placementSize(first);
    const secondSize = placementSize(second);
    return secondSize.width * secondSize.height - firstSize.width * firstSize.height;
  });
  const drawnPortalIds = new Set((definition.drawnWalls ?? []).flatMap((wall) => (wall.portals ?? []).map((portal) => portal.id)));
  const templateCorners = definition.tracingTemplate
    ? (["nw", "ne", "se", "sw"] as const).map((corner) => ({ corner, point: tracingTemplateHandlePoint(definition.tracingTemplate!, corner) }))
    : [];
  const templateTopCenter = definition.tracingTemplate ? (() => {
    const center = tracingTemplateCenter(definition.tracingTemplate);
    const offset = rotateOffset({ x: 0, y: -definition.tracingTemplate.height / 2 }, tracingTemplateRotation(definition.tracingTemplate));
    return { x: center.x + offset.x, y: center.y + offset.y };
  })() : null;
  const templateRotationHandle = definition.tracingTemplate ? (() => {
    const center = tracingTemplateCenter(definition.tracingTemplate);
    const offset = rotateOffset({ x: 0, y: -definition.tracingTemplate.height / 2 - 1.5 }, tracingTemplateRotation(definition.tracingTemplate));
    return { x: center.x + offset.x, y: center.y + offset.y };
  })() : null;
  return <svg viewBox={`0 0 ${definition.map.width} ${definition.map.height}`} preserveAspectRatio="xMidYMid meet" className={`h-full w-full bg-[#050a12] ${placementKind || enemyKind ? "cursor-crosshair" : ""}`} aria-label="Scenario draft map preview"
    onPointerDown={(event) => {
      if (wallPortalKindForTool(placementKind)) {
        const local = localMapPoint(event);
        if (local) placeWallPortal({ x: local.x, y: local.y });
        return;
      }
      if (isRaisedAreaTool(placementKind)) {
        const vertex = mapVertex(event);
        if (vertex) addRaisedAreaVertex(vertex);
        return;
      }
      if (placementKind === WALL_TOOL_ID || placementKind === CURVED_WALL_TOOL_ID) {
        const vertex = mapVertex(event);
        if (!vertex) return;
        if (wallDraft?.awaitingEnd) {
          finishWall(vertex);
          return;
        }
        event.currentTarget.setPointerCapture(event.pointerId);
        beginWall(vertex);
        return;
      }
      if (placementKind === RAMP_TOOL_ID) {
        const point = mapPoint(event);
        if (point) beginOrFinishRamp(point);
        return;
      }
      const point = mapPoint(event);
      if (!point) return;
      if (enemyKind) placeEnemy(point);
      else if (placementKind) placeTerrain(point);
      else {
        selectPlacement(null);
        selectEnemy(null);
        selectWall(null);
        selectRaisedArea(null);
        selectElevationTransition(null);
        selectPortal(null);
        selectFire(null);
      }
    }}
    onPointerMove={(event) => {
      if (dragTracingTemplate) {
        const local = localMapPoint(event);
        if (local) transformTracingTemplate({ x: local.x, y: local.y });
        return;
      }
      if (dragRaisedAreaControl) {
        const local = localMapPoint(event);
        if (local) reshapeRaisedAreaControl({ x: local.x, y: local.y });
        return;
      }
      if (dragWallControl) {
        const local = localMapPoint(event);
        if (local) reshapeWallControl({ x: local.x, y: local.y });
        return;
      }
      if (dragWallPortal) {
        const local = localMapPoint(event);
        if (local) moveWallPortal({ x: local.x, y: local.y });
        return;
      }
      if (dragWallMove) {
        const vertex = mapVertex(event);
        if (vertex) moveWall(vertex);
        return;
      }
      if (dragWallEndpoint) {
        const vertex = mapVertex(event);
        if (vertex) resizeWallEndpoint(vertex);
        return;
      }
      if (wallDraft) {
        const vertex = mapVertex(event);
        if (vertex) updateWall(vertex);
        return;
      }
      if (isRaisedAreaTool(placementKind)) {
        const vertex = mapVertex(event);
        if (vertex) hoverRaisedArea(vertex);
        return;
      }
      if (wallPortalKindForTool(placementKind)) {
        const local = localMapPoint(event);
        hoverPortal(local ? { x: local.x, y: local.y } : null);
        return;
      }
      const point = mapPoint(event);
      if (!point) return;
      if (dragEnemy) moveEnemy(dragEnemy.id, { x: point.x - dragEnemy.offset.x, y: point.y - dragEnemy.offset.y });
      else if (dragPlacement) moveTerrain(dragPlacement.id, { x: point.x - dragPlacement.offset.x, y: point.y - dragPlacement.offset.y });
      else if (enemyKind) hoverEnemy(point);
      else if (placementKind) hoverPlacement(point);
    }} onPointerLeave={() => { hoverPlacement(null); hoverEnemy(null); hoverPortal(null); }} onPointerUp={(event) => {
      if (dragTracingTemplate) {
        const local = localMapPoint(event);
        if (local) transformTracingTemplate({ x: local.x, y: local.y });
        finishTracingTemplateDrag();
        return;
      }
      if (dragRaisedAreaControl) {
        const local = localMapPoint(event);
        if (local) reshapeRaisedAreaControl({ x: local.x, y: local.y });
        finishRaisedAreaControlDrag();
        return;
      }
      if (dragWallControl) {
        const local = localMapPoint(event);
        if (local) reshapeWallControl({ x: local.x, y: local.y });
        finishWallControlDrag();
        return;
      }
      if (dragWallPortal) {
        const local = localMapPoint(event);
        if (local) moveWallPortal({ x: local.x, y: local.y });
        finishWallPortalDrag();
        return;
      }
      if (dragWallMove) {
        const vertex = mapVertex(event);
        if (vertex) moveWall(vertex);
        finishWallMove();
        return;
      }
      if (dragWallEndpoint) {
        const vertex = mapVertex(event);
        if (vertex) resizeWallEndpoint(vertex);
        finishWallEndpointDrag();
        return;
      }
      if (wallDraft) {
        const vertex = mapVertex(event);
        if (vertex) finishWallInteraction(vertex);
        else cancelWall();
        return;
      }
      endDrag();
    }} onPointerCancel={() => { cancelTracingTemplateDrag(); cancelRaisedAreaControlDrag(); cancelWallControlDrag(); cancelWallPortalDrag(); cancelWallMove(); cancelWallEndpointDrag(); cancelWall(); endDrag(); }}>
    <defs>
      <pattern id="draft-grid" width="1" height="1" patternUnits="userSpaceOnUse">
        <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#29434d" strokeWidth="0.04" />
      </pattern>
    </defs>
    {definition.tracingTemplate?.visible && <image
      data-testid="tracing-template-image"
      href={definition.tracingTemplate.imagePath}
      x={definition.tracingTemplate.x}
      y={definition.tracingTemplate.y}
      width={definition.tracingTemplate.width}
      height={definition.tracingTemplate.height}
      opacity={definition.tracingTemplate.opacity}
      preserveAspectRatio={definition.tracingTemplate.lockAspectRatio ? "xMidYMid meet" : "none"}
      transform={`rotate(${definition.tracingTemplate.rotation} ${definition.tracingTemplate.x + definition.tracingTemplate.width / 2} ${definition.tracingTemplate.y + definition.tracingTemplate.height / 2})`}
      pointerEvents="none"
    />}
    <rect x="0" y="0" width={definition.map.width} height={definition.map.height} fill="url(#draft-grid)" />
    {terrain.deploymentCells.map((cell) => <rect key={`deployment:${cell.x}:${cell.y}`} x={cell.x + 0.05} y={cell.y + 0.05} width="0.9" height="0.9" fill="#22c55e" fillOpacity="0.18" stroke="#86efac" strokeWidth="0.04" pointerEvents="none" />)}
    {terrain.interiorCells.map((cell) => <rect key={`interior:${cell.x}:${cell.y}`} x={cell.x} y={cell.y} width="1" height="1" fill="#164e63" opacity="0.28" />)}
    {Object.entries(terrain.terrainByCell).map(([key, terrainType]) => {
      const [x, y] = key.split(":").map(Number);
      const elevationLevel = terrain.elevationLevelByCell[key] ?? 0;
      const elevatedColor = elevationLevel >= 3 ? "#67e8f9" : elevationLevel === 2 ? "#22d3ee" : "#0e7490";
      return <rect key={`terrain:${key}`} x={x} y={y} width="1" height="1" fill={terrainType === "elevated" ? elevatedColor : terrainType === "close-machinery" ? "#b45309" : "#475569"} opacity={terrainType === "elevated" ? Math.min(0.42 + elevationLevel * 0.12, 0.78) : 0.46} />;
    })}
    {terrain.closeMachineryCells.map((cell) => <rect key={`close-machinery:${cell.x}:${cell.y}`} x={cell.x} y={cell.y} width="1" height="1" fill="#b45309" opacity="0.62" />)}
    {terrain.liquidHydrogenAreas.flatMap((area) => area.cells.map((cell) => <rect key={`liquid-hydrogen:${area.id}:${cell.x}:${cell.y}`} x={cell.x + 0.06} y={cell.y + 0.06} width="0.88" height="0.88" fill={area.filled ? "#67e8f9" : "#0f172a"} stroke={area.filled ? "#cffafe" : "#64748b"} strokeWidth="0.08" opacity={area.filled ? 0.7 : 0.85} />))}
    {terrain.bridges.flatMap((bridge) => bridge.cells.map((cell, index) => <rect key={`bridge:${bridge.id}:${index}`} x={cell.x + 0.08} y={cell.y + 0.08} width="0.84" height="0.84" fill="#7c3aed" stroke="#c4b5fd" strokeWidth="0.1" opacity="0.78" />))}
    {terrain.elevationAccessCells.map((cell) => <rect key={`stairs:${cell.x}:${cell.y}`} x={cell.x + 0.08} y={cell.y + 0.08} width="0.84" height="0.84" fill="#cbd5e1" stroke="#0891b2" strokeWidth="0.12" />)}
    {terrain.elevationTransitions.map((transition) => {
      const selected = transition.id === selectedElevationTransitionId;
      const center = {
        x: (transition.lower.x + transition.upper.x + 1) / 2,
        y: (transition.lower.y + transition.upper.y + 1) / 2,
      };
      const selectTransition = (event: ReactPointerEvent<SVGElement>) => {
        if (placementKind || enemyKind) return;
        event.stopPropagation();
        selectPlacement(null);
        selectEnemy(null);
        selectWall(null);
        selectRaisedArea(null);
        selectPortal(null);
        selectFire(null);
        selectElevationTransition(transition.id);
      };
      if (transition.kind === "stairs") {
        return <rect
          key={transition.id}
          data-testid={`elevation-transition-${transition.id}`}
          x={transition.lower.x + 0.1}
          y={transition.lower.y + 0.1}
          width="0.8"
          height="0.8"
          fill="#64748b"
          stroke={selected ? "#fef08a" : "#e2e8f0"}
          strokeWidth={selected ? "0.18" : "0.1"}
          className={placementKind || enemyKind ? undefined : "cursor-pointer"}
          onPointerDown={selectTransition}
        />;
      }
      if (transition.kind === "ladder") {
        const horizontalEdge = transition.lower.x !== transition.upper.x;
        return <g
          key={transition.id}
          data-testid={`elevation-transition-${transition.id}`}
          className={placementKind || enemyKind ? undefined : "cursor-pointer"}
          onPointerDown={selectTransition}
        >
          <line
            x1={center.x + (horizontalEdge ? 0 : -0.32)}
            y1={center.y + (horizontalEdge ? -0.32 : 0)}
            x2={center.x + (horizontalEdge ? 0 : 0.32)}
            y2={center.y + (horizontalEdge ? 0.32 : 0)}
            stroke={selected ? "#fef08a" : "#f59e0b"}
            strokeWidth={selected ? "0.24" : "0.16"}
          />
          <circle cx={center.x} cy={center.y} r="0.14" fill="#0f172a" stroke="#fde68a" strokeWidth="0.06" />
        </g>;
      }
      return <g
        key={transition.id}
        data-testid={`elevation-transition-${transition.id}`}
        className={placementKind || enemyKind ? undefined : "cursor-pointer"}
        onPointerDown={selectTransition}
      >
        <line
          x1={transition.lower.x + 0.5}
          y1={transition.lower.y + 0.5}
          x2={transition.upper.x + 0.5}
          y2={transition.upper.y + 0.5}
          stroke={selected ? "#fef08a" : "#64748b"}
          strokeWidth={selected ? "0.48" : "0.36"}
        />
        <circle cx={transition.lower.x + 0.5} cy={transition.lower.y + 0.5} r="0.13" fill="#22d3ee" />
        <path d={`M ${transition.upper.x + 0.5} ${transition.upper.y + 0.5} l -0.18 0.12 l 0.06 -0.2 z`} fill="#ede9fe" />
      </g>;
    })}
    {elevationTransitionKind && <g data-testid="valid-elevation-edges" pointerEvents="none">
      {elevationEdgeCandidates.map((candidate) => {
        const active = candidate.key === elevationEdgePreview?.key;
        return <line
          key={candidate.key}
          data-testid={`valid-elevation-edge-${candidate.key}`}
          x1={candidate.edge.from.x}
          y1={candidate.edge.from.y}
          x2={candidate.edge.to.x}
          y2={candidate.edge.to.y}
          stroke={active ? "#fef08a" : "#4ade80"}
          strokeWidth={active ? "0.34" : "0.18"}
          strokeDasharray={active ? undefined : "0.22 0.12"}
          opacity={active ? 1 : 0.8}
        />;
      })}
      {elevationEdgePreview && <>
        <circle cx={elevationEdgePreview.lower.x + 0.5} cy={elevationEdgePreview.lower.y + 0.5} r="0.17" fill="#22d3ee" stroke="#cffafe" strokeWidth="0.07" />
        <circle cx={elevationEdgePreview.upper.x + 0.5} cy={elevationEdgePreview.upper.y + 0.5} r="0.17" fill="#a78bfa" stroke="#ede9fe" strokeWidth="0.07" />
        <line
          x1={elevationEdgePreview.lower.x + 0.5}
          y1={elevationEdgePreview.lower.y + 0.5}
          x2={elevationEdgePreview.upper.x + 0.5}
          y2={elevationEdgePreview.upper.y + 0.5}
          stroke="#fef08a"
          strokeWidth="0.1"
          strokeDasharray="0.16 0.1"
        />
        {elevationTransitionKind === "stairs" && <rect
          data-testid="stairs-placement-preview"
          x={elevationEdgePreview.lower.x + 0.1}
          y={elevationEdgePreview.lower.y + 0.1}
          width="0.8"
          height="0.8"
          fill="#64748b"
          fillOpacity="0.72"
          stroke="#fef08a"
          strokeWidth="0.12"
        />}
        {elevationTransitionKind === "ladder" && <g data-testid="ladder-placement-preview">
          <line
            x1={elevationEdgePreview.edge.from.x}
            y1={elevationEdgePreview.edge.from.y}
            x2={elevationEdgePreview.edge.to.x}
            y2={elevationEdgePreview.edge.to.y}
            stroke="#f59e0b"
            strokeWidth="0.28"
          />
          <circle cx={elevationEdgePreview.center.x} cy={elevationEdgePreview.center.y} r="0.2" fill="#0f172a" stroke="#fef08a" strokeWidth="0.08" />
          <text x={elevationEdgePreview.center.x} y={elevationEdgePreview.center.y + 0.11} textAnchor="middle" fill="#fef3c7" fontSize="0.28" fontWeight="bold">L</text>
        </g>}
        {elevationTransitionKind === "ramp" && rampPreview && <g data-testid="ramp-placement-preview">
          {rampPreview.path.slice(0, -1).map((cell) => <rect
            key={cellKey(cell)}
            x={cell.x + 0.08}
            y={cell.y + 0.08}
            width="0.84"
            height="0.84"
            fill={rampPreview.valid ? "#526875" : "#dc2626"}
            fillOpacity="0.5"
            stroke={rampPreview.valid ? "#9bc4cf" : "#fecaca"}
            strokeWidth="0.1"
          />)}
          <line
            x1={rampPreview.lower.x + 0.5}
            y1={rampPreview.lower.y + 0.5}
            x2={rampPreview.upper.x + 0.5}
            y2={rampPreview.upper.y + 0.5}
            stroke={rampPreview.valid ? "#fef08a" : "#f87171"}
            strokeWidth="0.16"
          />
          <text
            x={rampPreview.lower.x + 0.5}
            y={rampPreview.lower.y + 0.62}
            textAnchor="middle"
            fill={rampPreview.valid ? "#fef08a" : "#fee2e2"}
            fontSize="0.28"
            fontWeight="bold"
          >{Math.max(0, rampPreview.path.length - 1)}</text>
          <text
            data-testid="ramp-placement-preview-status"
            x={rampPreview.edge.center.x}
            y={rampPreview.edge.center.y - 0.35}
            textAnchor="middle"
            fill={rampPreview.valid ? "#d9f99d" : "#fecaca"}
            fontSize="0.3"
            fontWeight="bold"
          >{rampPreview.valid ? "Click to place ramp" : rampPreview.error}</text>
        </g>}
      </>}
    </g>}
    {(definition.drawnRaisedAreas ?? []).map((area) => {
      const selected = area.id === selectedRaisedAreaId;
      const level = terrain.drawnRaisedAreaLevels[area.id] ?? 1;
      const outlineColor = level >= 3 ? "#c084fc" : level === 2 ? "#22d3ee" : "#67e8f9";
      const selectArea = (event: ReactPointerEvent<SVGElement>) => {
        if (placementKind || enemyKind) return;
        event.stopPropagation();
        selectPlacement(null);
        selectEnemy(null);
        selectWall(null);
        selectPortal(null);
        selectFire(null);
        selectRaisedArea(area.id);
      };
      return <g key={area.id} data-elevation-level={level}>
        {area.segments.map((segment, index) => segment.kind === "quadratic"
          ? <g key={index}>
            <path data-testid={`drawn-raised-area-${area.id}-segment-${index}`} d={`M ${segment.from.x} ${segment.from.y} Q ${segment.control.x} ${segment.control.y} ${segment.to.x} ${segment.to.y}`} fill="none" stroke={selected ? "#fef08a" : outlineColor} strokeWidth={selected ? "0.34" : "0.24"} className={placementKind || enemyKind ? undefined : "cursor-pointer"} onPointerDown={selectArea} />
            {selected && <>
              <line x1={segment.from.x} y1={segment.from.y} x2={segment.control.x} y2={segment.control.y} stroke="#a78bfa" strokeWidth="0.08" strokeDasharray="0.3 0.2" pointerEvents="none" />
              <line x1={segment.control.x} y1={segment.control.y} x2={segment.to.x} y2={segment.to.y} stroke="#a78bfa" strokeWidth="0.08" strokeDasharray="0.3 0.2" pointerEvents="none" />
              <circle
                data-testid={`raised-area-${area.id}-segment-${index}-control-handle`}
                aria-label={`Reshape ${area.id} curve ${index + 1}`}
                cx={segment.control.x}
                cy={segment.control.y}
                r="0.32"
                fill="#7c3aed"
                stroke="#ede9fe"
                strokeWidth="0.1"
                className="cursor-move"
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  beginRaisedAreaControlDrag(area.id, index);
                }}
              />
            </>}
          </g>
          : <line key={index} data-testid={`drawn-raised-area-${area.id}-segment-${index}`} x1={segment.from.x} y1={segment.from.y} x2={segment.to.x} y2={segment.to.y} stroke={selected ? "#fef08a" : outlineColor} strokeWidth={selected ? "0.34" : "0.24"} className={placementKind || enemyKind ? undefined : "cursor-pointer"} onPointerDown={selectArea} />)}
        {selected && <text x={area.segments[0]?.from.x ?? 0} y={(area.segments[0]?.from.y ?? 0) - 0.45} fill="#fef08a" fontSize="0.45" fontWeight="bold" pointerEvents="none">Level {level}</text>}
      </g>;
    })}
    {terrain.walls.filter((wall) => !(definition.drawnWalls ?? []).some((drawnWall) => drawnWall.id === wall.id || (drawnWall.control && wall.id.startsWith(`${drawnWall.id}:curve:`)))).map((wall) => <line key={wall.id} x1={wall.from.x} y1={wall.from.y} x2={wall.to.x} y2={wall.to.y} stroke="#94a3b8" strokeWidth="0.22" />)}
    {(definition.drawnWalls ?? []).map((wall) => {
      const selected = wall.id === selectedWallId;
      const beginMove = (event: ReactPointerEvent<SVGElement>) => {
        if (placementKind || enemyKind) return;
        event.stopPropagation();
        const vertex = mapVertex(event);
        if (!vertex) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        selectPlacement(null);
        selectEnemy(null);
        selectPortal(null);
        selectFire(null);
        selectWall(wall.id);
        beginWallMove(wall.id, vertex);
      };
      return <g key={wall.id}>
        {wall.control ? <path
          data-testid={`drawn-wall-${wall.id}`}
          d={`M ${wall.from.x} ${wall.from.y} Q ${wall.control.x} ${wall.control.y} ${wall.to.x} ${wall.to.y}`}
          fill="none"
          stroke={selected ? "#fef08a" : "#94a3b8"}
          strokeWidth={selected ? "0.34" : "0.22"}
          className={placementKind || enemyKind ? undefined : "cursor-move"}
          onPointerDown={beginMove}
        /> : <line
          data-testid={`drawn-wall-${wall.id}`}
          x1={wall.from.x}
          y1={wall.from.y}
          x2={wall.to.x}
          y2={wall.to.y}
          stroke={selected ? "#fef08a" : "#94a3b8"}
          strokeWidth={selected ? "0.34" : "0.22"}
          className={placementKind || enemyKind ? undefined : "cursor-move"}
          onPointerDown={beginMove}
        />}
        {selected && wall.control && <g>
          <line x1={wall.from.x} y1={wall.from.y} x2={wall.control.x} y2={wall.control.y} stroke="#a78bfa" strokeWidth="0.08" strokeDasharray="0.3 0.2" pointerEvents="none" />
          <line x1={wall.control.x} y1={wall.control.y} x2={wall.to.x} y2={wall.to.y} stroke="#a78bfa" strokeWidth="0.08" strokeDasharray="0.3 0.2" pointerEvents="none" />
          <circle
            data-testid={`wall-${wall.id}-control-handle`}
            aria-label="Reshape curved wall"
            cx={wall.control.x}
            cy={wall.control.y}
            r="0.32"
            fill="#7c3aed"
            stroke="#ede9fe"
            strokeWidth="0.1"
            className="cursor-move"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              beginWallControlDrag(wall.id);
            }}
          />
        </g>}
        {selected && (["from", "to"] as const).map((endpoint) => <circle
          key={endpoint}
          data-testid={`wall-${wall.id}-${endpoint}-handle`}
          aria-label={`Resize wall ${endpoint} endpoint`}
          cx={wall[endpoint].x}
          cy={wall[endpoint].y}
          r="0.28"
          fill={endpoint === "from" ? "#22d3ee" : "#f59e0b"}
          stroke="#f8fafc"
          strokeWidth="0.09"
          className="cursor-move"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
            beginWallEndpointDrag(wall.id, endpoint);
          }}
        />)}
      </g>;
    })}
    {terrain.doors.filter((door) => door.portalType !== "iris-valve").map((door) => <line key={door.id} data-testid={drawnPortalIds.has(door.id) ? `wall-portal-${door.id}` : undefined} x1={door.from.x} y1={door.from.y} x2={door.to.x} y2={door.to.y} stroke={door.id === selectedPortalId ? "#fef08a" : "#fbbf24"} strokeWidth={door.id === selectedPortalId ? "0.46" : "0.32"} className={drawnPortalIds.has(door.id) && !placementKind && !enemyKind ? "cursor-move" : undefined} onPointerDown={(event) => {
      if (!drawnPortalIds.has(door.id) || placementKind || enemyKind) return;
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      selectPlacement(null);
      selectEnemy(null);
      selectWall(null);
      selectFire(null);
      selectPortal(door.id);
      beginWallPortalDrag(door.id);
    }} />)}
    {terrain.doors.filter((door) => door.portalType === "iris-valve").map((door) => {
      const center = { x: (door.from.x + door.to.x) / 2, y: (door.from.y + door.to.y) / 2 };
      return <g key={door.id} data-testid={drawnPortalIds.has(door.id) ? `wall-portal-${door.id}` : undefined} className={drawnPortalIds.has(door.id) && !placementKind && !enemyKind ? "cursor-move" : undefined} onPointerDown={(event) => {
        if (!drawnPortalIds.has(door.id) || placementKind || enemyKind) return;
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        selectPlacement(null);
        selectEnemy(null);
        selectWall(null);
        selectFire(null);
        selectPortal(door.id);
        beginWallPortalDrag(door.id);
      }}>
        <circle cx={center.x} cy={center.y} r="0.3" fill="#334155" stroke={door.id === selectedPortalId ? "#fef08a" : "#fbbf24"} strokeWidth={door.id === selectedPortalId ? "0.16" : "0.1"} />
        {[0, 60, 120].map((angle) => <line key={angle} x1={center.x - 0.25 * Math.cos(angle * Math.PI / 180)} y1={center.y - 0.25 * Math.sin(angle * Math.PI / 180)} x2={center.x + 0.25 * Math.cos(angle * Math.PI / 180)} y2={center.y + 0.25 * Math.sin(angle * Math.PI / 180)} stroke="#94a3b8" strokeWidth="0.035" />)}
      </g>;
    })}
    {terrain.terrainObjects.filter((object) => object.kind === "hatch").map((hatch) => <g key={hatch.id}>
      <rect x={hatch.position.x + 0.12} y={hatch.position.y + 0.12} width="0.76" height="0.76" rx="0.08" fill="#334155" stroke="#fbbf24" strokeWidth="0.1" />
      <line x1={hatch.position.x + 0.2} y1={hatch.position.y + 0.2} x2={hatch.position.x + 0.8} y2={hatch.position.y + 0.8} stroke="#94a3b8" strokeWidth="0.045" />
      <line x1={hatch.position.x + 0.8} y1={hatch.position.y + 0.2} x2={hatch.position.x + 0.2} y2={hatch.position.y + 0.8} stroke="#94a3b8" strokeWidth="0.045" />
    </g>)}
    {terrain.terrainObjects.filter((object) => object.kind === "terminal").map((object) => {
      if (object.visualKind !== "human") return <g key={object.id} aria-label={object.label}>
        <rect x={object.position.x + 0.15} y={object.position.y + 0.15} width="0.7" height="0.7" fill="#22d3ee" />
      </g>;
      const direction = facingVector(object.facing);
      return <g key={object.id} aria-label={`${object.label} · facing ${facingName(object.facing)}`}>
        <circle cx={object.position.x + 0.5} cy={object.position.y + 0.31} r="0.16" fill="#c084fc" stroke="#f3e8ff" strokeWidth="0.06" />
        <path d={`M ${object.position.x + 0.28} ${object.position.y + 0.8} Q ${object.position.x + 0.5} ${object.position.y + 0.44} ${object.position.x + 0.72} ${object.position.y + 0.8}`} fill="#a855f7" stroke="#f3e8ff" strokeWidth="0.06" />
        <line x1={object.position.x + 0.5} y1={object.position.y + 0.5} x2={object.position.x + 0.5 + direction.x * 0.4} y2={object.position.y + 0.5 + direction.y * 0.4} stroke="#fef08a" strokeWidth="0.1" />
        <circle cx={object.position.x + 0.5 + direction.x * 0.4} cy={object.position.y + 0.5 + direction.y * 0.4} r="0.08" fill="#fef08a" />
      </g>;
    })}
    {placementPreview?.kind === "terrain" && placementPreview.cells.map((cell) => <rect key={`placement-preview:${cell.x}:${cell.y}`} x={placementPreview.origin.x + cell.x} y={placementPreview.origin.y + cell.y} width="1" height="1"
      fill={placementPreview.valid ? "#94a3b8" : "#ef4444"} fillOpacity="0.28" stroke={placementPreview.valid ? "#e2e8f0" : "#fecaca"} strokeWidth="0.12" pointerEvents="none" />)}
    {placementPreview?.kind === "fire" && <circle cx={placementPreview.origin.x + 0.5} cy={placementPreview.origin.y + 0.5} r="0.34" fill={placementPreview.valid ? "#f97316" : "#ef4444"} fillOpacity="0.58" stroke={placementPreview.valid ? "#fed7aa" : "#fecaca"} strokeWidth="0.12" pointerEvents="none" />}
    {portalPreview && <g pointerEvents="none" data-testid="wall-portal-preview">
      <line x1={portalPreview.edge.from.x} y1={portalPreview.edge.from.y} x2={portalPreview.edge.to.x} y2={portalPreview.edge.to.y} stroke={portalPreview.valid ? "#86efac" : "#f87171"} strokeWidth="0.48" />
      {portalPreview.kind === "iris-valve" && <circle cx={portalPreview.center.x} cy={portalPreview.center.y} r="0.3" fill="#334155" stroke={portalPreview.valid ? "#86efac" : "#f87171"} strokeWidth="0.12" />}
    </g>}
    {wallDraft && <g pointerEvents="none" data-testid="wall-draft-preview">
      {wallDraft.curved
        ? <path d={`M ${wallDraft.from.x} ${wallDraft.from.y} Q ${(wallDraft.from.x + wallDraft.to.x) / 2} ${(wallDraft.from.y + wallDraft.to.y) / 2} ${wallDraft.to.x} ${wallDraft.to.y}`} fill="none" stroke="#fef08a" strokeWidth="0.3" strokeDasharray="0.35 0.2" />
        : <line x1={wallDraft.from.x} y1={wallDraft.from.y} x2={wallDraft.to.x} y2={wallDraft.to.y} stroke="#fef08a" strokeWidth="0.3" strokeDasharray="0.35 0.2" />}
      <circle cx={wallDraft.from.x} cy={wallDraft.from.y} r="0.22" fill="#22d3ee" stroke="#cffafe" strokeWidth="0.08" />
      <circle cx={wallDraft.to.x} cy={wallDraft.to.y} r="0.22" fill="#f59e0b" stroke="#fef3c7" strokeWidth="0.08" />
    </g>}
    {raisedAreaDraft && <g data-testid="raised-area-draft-preview">
      {raisedAreaPreview.cells.map((cell) => <rect key={cellKey(cell)} x={cell.x + 0.04} y={cell.y + 0.04} width="0.92" height="0.92" fill="#06b6d4" fillOpacity="0.34" stroke="#67e8f9" strokeWidth="0.06" pointerEvents="none" />)}
      {raisedAreaDraft.segments.map((segment, index) => segment.kind === "quadratic"
        ? <g key={index}>
          <path data-testid={`raised-area-draft-segment-${index}`} d={`M ${segment.from.x} ${segment.from.y} Q ${segment.control.x} ${segment.control.y} ${segment.to.x} ${segment.to.y}`} fill="none" stroke="#fef08a" strokeWidth="0.28" pointerEvents="none" />
          <line x1={segment.from.x} y1={segment.from.y} x2={segment.control.x} y2={segment.control.y} stroke="#a78bfa" strokeWidth="0.08" strokeDasharray="0.3 0.2" pointerEvents="none" />
          <line x1={segment.control.x} y1={segment.control.y} x2={segment.to.x} y2={segment.to.y} stroke="#a78bfa" strokeWidth="0.08" strokeDasharray="0.3 0.2" pointerEvents="none" />
          <circle
            data-testid={`raised-area-draft-segment-${index}-control-handle`}
            aria-label={`Reshape raised-area curve ${index + 1}`}
            cx={segment.control.x}
            cy={segment.control.y}
            r="0.32"
            fill="#7c3aed"
            stroke="#ede9fe"
            strokeWidth="0.1"
            className="cursor-move"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              beginRaisedAreaControlDrag(null, index);
            }}
          />
        </g>
        : <line key={index} data-testid={`raised-area-draft-segment-${index}`} x1={segment.from.x} y1={segment.from.y} x2={segment.to.x} y2={segment.to.y} stroke="#fef08a" strokeWidth="0.28" pointerEvents="none" />)}
      {raisedAreaPreview.segment && (raisedAreaPreview.segment.kind === "quadratic"
        ? <path d={`M ${raisedAreaPreview.segment.from.x} ${raisedAreaPreview.segment.from.y} Q ${raisedAreaPreview.segment.control.x} ${raisedAreaPreview.segment.control.y} ${raisedAreaPreview.segment.to.x} ${raisedAreaPreview.segment.to.y}`} fill="none" stroke="#fef08a" strokeWidth="0.28" strokeDasharray="0.35 0.2" pointerEvents="none" />
        : <line x1={raisedAreaPreview.segment.from.x} y1={raisedAreaPreview.segment.from.y} x2={raisedAreaPreview.segment.to.x} y2={raisedAreaPreview.segment.to.y} stroke="#fef08a" strokeWidth="0.28" strokeDasharray="0.35 0.2" pointerEvents="none" />)}
      <circle cx={raisedAreaDraft.start.x} cy={raisedAreaDraft.start.y} r="0.3" fill="#22d3ee" stroke="#ecfeff" strokeWidth="0.1" pointerEvents="none" />
      <circle cx={raisedAreaDraft.current.x} cy={raisedAreaDraft.current.y} r="0.22" fill="#f59e0b" stroke="#fef3c7" strokeWidth="0.08" pointerEvents="none" />
    </g>}
    {orderedPlacements.map((placement) => {
      const size = placementSize(placement);
      const selected = placement.id === selectedPlacementId;
      const raised = placement.terrainDefinitionId.startsWith("raised-area");
      return <rect key={`placement-control:${placement.id}`} x={placement.origin.x} y={placement.origin.y} width={size.width} height={size.height}
        fill={selected ? "#22d3ee" : "transparent"} fillOpacity={selected ? 0.16 : 0} stroke={selected ? "#fef08a" : raised ? "#67e8f9" : "transparent"} strokeOpacity={selected ? 1 : 0.72} strokeWidth={selected ? "0.24" : "0.12"}
        className={tacticalEditorMarkerInteractionEnabled(placementKind, enemyKind) ? "cursor-move" : undefined} onPointerDown={(event) => {
          if (!tacticalEditorMarkerInteractionEnabled(placementKind, enemyKind)) return;
          event.stopPropagation();
          const point = mapPoint(event);
          if (!point) return;
          selectFire(null);
          selectPlacement(placement.id);
          event.currentTarget.setPointerCapture(event.pointerId);
          beginDrag({ id: placement.id, offset: { x: point.x - placement.origin.x, y: point.y - placement.origin.y } });
        }} />;
    })}
    {definition.fireCells.map((cell) => {
      const selected = selectedFire && cellKey(selectedFire) === cellKey(cell);
      return <circle key={`fire:${cell.x}:${cell.y}`} cx={cell.x + 0.5} cy={cell.y + 0.5} r="0.32" fill="#f97316" stroke={selected ? "#fef08a" : "#fed7aa"} strokeWidth={selected ? "0.18" : "0.08"}
        className={tacticalEditorMarkerInteractionEnabled(placementKind, enemyKind) ? "cursor-pointer" : undefined} onPointerDown={(event) => {
          if (!tacticalEditorMarkerInteractionEnabled(placementKind, enemyKind)) return;
          event.stopPropagation();
          selectPlacement(null);
          selectEnemy(null);
          selectFire(cell);
        }} />;
    })}
    {enemyKind && enemyHover && <g pointerEvents="none">
      <circle cx={enemyHover.x + 0.5} cy={enemyHover.y + 0.5} r="0.38" fill="#ef4444" fillOpacity="0.35" stroke="#fecaca" strokeWidth="0.12" />
      <text x={enemyHover.x + 0.5} y={enemyHover.y + 0.62} textAnchor="middle" fill="#fee2e2" fontSize="0.34" fontWeight="bold">E</text>
      <line x1={enemyHover.x + 0.5} y1={enemyHover.y + 0.5} x2={enemyHover.x + 0.5} y2={enemyHover.y + 0.1} stroke="#fef08a" strokeWidth="0.1" />
      <circle cx={enemyHover.x + 0.5} cy={enemyHover.y + 0.1} r="0.08" fill="#fef08a" />
    </g>}
    {(definition.enemyPlacements ?? []).map((enemy) => {
      const selected = enemy.id === selectedEnemyId;
      const direction = facingVector(enemy.facing ?? "north");
      return <g key={enemy.id} data-testid={`enemy-marker-${enemy.id}`} aria-label={`${enemy.name} · facing ${facingName(enemy.facing ?? "north")}`} className={placementKind || enemyKind ? undefined : "cursor-move"} onPointerDown={(event) => {
        if (placementKind || enemyKind) return;
        event.stopPropagation();
        const point = mapPoint(event);
        if (!point) return;
        selectPlacement(null);
        selectFire(null);
        selectEnemy(enemy.id);
        event.currentTarget.setPointerCapture(event.pointerId);
        beginEnemyDrag({ id: enemy.id, offset: { x: point.x - enemy.position.x, y: point.y - enemy.position.y } });
      }}>
        <circle cx={enemy.position.x + 0.5} cy={enemy.position.y + 0.5} r="0.38" fill="#7f1d1d" stroke={selected ? "#fef08a" : "#f87171"} strokeWidth={selected ? "0.18" : "0.1"} />
        <text x={enemy.position.x + 0.5} y={enemy.position.y + 0.62} textAnchor="middle" fill="#fee2e2" fontSize="0.34" fontWeight="bold">E</text>
        <line x1={enemy.position.x + 0.5} y1={enemy.position.y + 0.5} x2={enemy.position.x + 0.5 + direction.x * 0.4} y2={enemy.position.y + 0.5 + direction.y * 0.4} stroke="#fef08a" strokeWidth="0.1" />
        <circle cx={enemy.position.x + 0.5 + direction.x * 0.4} cy={enemy.position.y + 0.5 + direction.y * 0.4} r="0.08" fill="#fef08a" />
      </g>;
    })}
    {tracingTemplateEditing && definition.tracingTemplate?.visible && !placementKind && !enemyKind && templateTopCenter && templateRotationHandle && <g data-testid="tracing-template-controls">
      <polygon
        data-testid="tracing-template-move-area"
        points={templateCorners.map(({ point }) => `${point.x},${point.y}`).join(" ")}
        fill="#22d3ee"
        fillOpacity="0.04"
        stroke="#67e8f9"
        strokeWidth="0.16"
        strokeDasharray="0.45 0.25"
        className="cursor-move"
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const point = localMapPoint(event);
          if (!point) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          beginTracingTemplateDrag("move", { x: point.x, y: point.y });
        }}
      />
      <line x1={templateTopCenter.x} y1={templateTopCenter.y} x2={templateRotationHandle.x} y2={templateRotationHandle.y} stroke="#67e8f9" strokeWidth="0.12" pointerEvents="none" />
      <circle
        data-testid="tracing-template-rotation-handle"
        cx={templateRotationHandle.x}
        cy={templateRotationHandle.y}
        r="0.34"
        fill="#a855f7"
        stroke="#f3e8ff"
        strokeWidth="0.1"
        className="cursor-grab"
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const point = localMapPoint(event);
          if (!point) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          beginTracingTemplateDrag("rotate", { x: point.x, y: point.y });
        }}
      />
      {templateCorners.map(({ corner, point }) => <circle
        key={corner}
        data-testid={`tracing-template-${corner}-handle`}
        aria-label={`Resize tracing template from ${corner}`}
        cx={point.x}
        cy={point.y}
        r="0.3"
        fill="#0e7490"
        stroke="#cffafe"
        strokeWidth="0.1"
        className="cursor-nwse-resize"
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const local = localMapPoint(event);
          if (!local) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          beginTracingTemplateDrag(corner, { x: local.x, y: local.y });
        }}
      />)}
    </g>}
  </svg>;
};

const TacticalScenarioEditorClient = () => {
  const [draft, setDraft] = useState<TacticalScenarioDefinitionFile>(freshDefaultDraft);
  const [baseline, setBaseline] = useState<TacticalScenarioDefinitionFile>(freshDefaultDraft);
  const [consoleVictory, setConsoleVictory] = useState<TacticalConsoleVictoryDefinitionFile>(freshDefaultConsoleVictory);
  const [consoleVictoryBaseline, setConsoleVictoryBaseline] = useState<TacticalConsoleVictoryDefinitionFile>(freshDefaultConsoleVictory);
  const [currentScenario, setCurrentScenario] = useState<ScenarioSummary>({ id: defaultTacticalScenarioDefinition.id, title: defaultTacticalScenarioDefinition.title, isDefault: true });
  const [availableScenarios, setAvailableScenarios] = useState<ScenarioSummary[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<TacticalTemplateAsset[]>([]);
  const [scenarioToLoad, setScenarioToLoad] = useState(defaultTacticalScenarioDefinition.id);
  const [saveAsName, setSaveAsName] = useState("");
  const [fileBusy, setFileBusy] = useState(false);
  const [fileMessage, setFileMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [templateMessage, setTemplateMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [playtest, setPlaytest] = useState<{ definition: TacticalScenarioDefinitionFile; consoleVictory: TacticalConsoleVictoryDefinitionFile; sandbox: AppStore } | null>(null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(null);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [selectedRaisedAreaId, setSelectedRaisedAreaId] = useState<string | null>(null);
  const [selectedElevationTransitionId, setSelectedElevationTransitionId] = useState<string | null>(null);
  const [selectedPortalId, setSelectedPortalId] = useState<string | null>(null);
  const [selectedFire, setSelectedFire] = useState<{ x: number; y: number } | null>(null);
  const [placementKind, setPlacementKind] = useState<string | null>(null);
  const [enemyKind, setEnemyKind] = useState<TacticalEnemyType | null>(null);
  const [placementHover, setPlacementHover] = useState<EditorMapPoint | null>(null);
  const [enemyHover, setEnemyHover] = useState<{ x: number; y: number } | null>(null);
  const [portalHover, setPortalHover] = useState<{ x: number; y: number } | null>(null);
  const [wallDraft, setWallDraft] = useState<{ from: { x: number; y: number }; to: { x: number; y: number }; curved: boolean; awaitingEnd: boolean } | null>(null);
  const [raisedAreaDraft, setRaisedAreaDraft] = useState<RaisedAreaDraft | null>(null);
  const [rampDraft, setRampDraft] = useState<RampDraft | null>(null);
  const [dragRaisedAreaControl, setDragRaisedAreaControl] = useState<RaisedAreaControlDrag | null>(null);
  const [dragWallEndpoint, setDragWallEndpoint] = useState<WallEndpointDrag | null>(null);
  const [dragWallMove, setDragWallMove] = useState<WallMoveDrag | null>(null);
  const [dragWallControl, setDragWallControl] = useState<WallControlDrag | null>(null);
  const [dragWallPortal, setDragWallPortal] = useState<WallPortalDrag | null>(null);
  const [dragTracingTemplate, setDragTracingTemplate] = useState<TracingTemplateTransformDrag | null>(null);
  const [tracingTemplateEditing, setTracingTemplateEditing] = useState(false);
  const [dragPlacement, setDragPlacement] = useState<{ id: string; offset: { x: number; y: number } } | null>(null);
  const [dragEnemy, setDragEnemy] = useState<{ id: string; offset: { x: number; y: number } } | null>(null);
  const [placementError, setPlacementError] = useState<string | null>(null);
  const [terrainPaletteLayout, setTerrainPaletteLayout] = useState<FloatingPluginHudLayout>({ visible: true, pinned: false, position: { x: 24, y: 64 } });
  const [enemyPaletteLayout, setEnemyPaletteLayout] = useState<FloatingPluginHudLayout>({ visible: true, pinned: false, position: { x: 24, y: 310 } });
  const [consoleEditorLayout, setConsoleEditorLayout] = useState<FloatingPluginHudLayout>({ visible: true, pinned: false, position: { x: 280, y: 64 } });
  const [enemyEditorLayout, setEnemyEditorLayout] = useState<FloatingPluginHudLayout>({ visible: true, pinned: false, position: { x: 280, y: 310 } });
  const [navigationLayout, setNavigationLayout] = useState<FloatingPluginHudLayout>({ visible: true, pinned: false, position: { x: 720, y: 24 } });
  const [tracingTemplateLayout, setTracingTemplateLayout] = useState<FloatingPluginHudLayout>({ visible: true, pinned: false, position: { x: 720, y: 180 } });
  const dirty = !definitionsMatch(draft, baseline) || JSON.stringify(consoleVictory) !== JSON.stringify(consoleVictoryBaseline);
  const refreshScenarioList = useCallback(async () => {
    const scenarios = await fetchScenarioList();
    setAvailableScenarios(scenarios);
    setScenarioToLoad((current) => scenarios.some((scenario) => scenario.id === current) ? current : scenarios[0]?.id ?? "");
  }, []);
  useEffect(() => {
    let cancelled = false;
    void fetchScenarioList().then((scenarios) => {
      if (cancelled) return;
      setAvailableScenarios(scenarios);
      setScenarioToLoad((current) => scenarios.some((scenario) => scenario.id === current) ? current : scenarios[0]?.id ?? "");
    }).catch((error) => {
      if (!cancelled) setFileMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not list scenario files." });
    });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/tactical/templates", { cache: "no-store" }).then(async (response) => {
      const body = await response.json() as { templates?: TacticalTemplateAsset[]; error?: string };
      if (!response.ok || !body.templates) throw new Error(body.error ?? "Could not list tracing templates.");
      if (!cancelled) setAvailableTemplates(body.templates);
    }).catch((error) => {
      if (!cancelled) setTemplateMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not list tracing templates." });
    });
    return () => { cancelled = true; };
  }, []);
  const applyTracingTemplateImage = async (imagePath: string) => {
    const naturalSize = await loadImageDimensions(imagePath);
    setDraft((current) => ({
      ...current,
      tracingTemplate: fitTacticalTracingTemplate(imagePath, naturalSize, current.map),
    }));
  };
  const selectTracingTemplate = async (imagePath: string) => {
    if (!imagePath || templateBusy) return;
    setTemplateBusy(true);
    setTemplateMessage(null);
    try {
      await applyTracingTemplateImage(imagePath);
      setTemplateMessage({ kind: "success", text: "Tracing template fitted to the map." });
    } catch (error) {
      setTemplateMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not load the tracing template." });
    } finally {
      setTemplateBusy(false);
    }
  };
  const uploadTracingTemplate = async (file: File) => {
    if (templateBusy) return;
    setTemplateBusy(true);
    setTemplateMessage(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/tactical/templates", { method: "POST", body: formData });
      const body = await response.json() as { template?: TacticalTemplateAsset; error?: string };
      if (!response.ok || !body.template) throw new Error(body.error ?? "Could not upload the tracing template.");
      setAvailableTemplates((current) => current.some((template) => template.id === body.template?.id) ? current : [...current, body.template!]);
      await applyTracingTemplateImage(body.template.imagePath);
      setTemplateMessage({ kind: "success", text: `${body.template.label} uploaded and fitted to the map.` });
    } catch (error) {
      setTemplateMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not upload the tracing template." });
    } finally {
      setTemplateBusy(false);
    }
  };
  const updateTracingTemplate = (update: Partial<TacticalScenarioTracingTemplate>) => {
    setDraft((current) => current.tracingTemplate
      ? { ...current, tracingTemplate: { ...current.tracingTemplate, ...update } }
      : current);
  };
  const updateTracingTemplateNumber = (field: "x" | "y" | "width" | "height" | "rotation", value: number) => {
    if (!Number.isFinite(value) || ((field === "width" || field === "height") && value <= 0)) return;
    setDraft((current) => {
      const template = current.tracingTemplate;
      if (!template) return current;
      let tracingTemplate = { ...template, [field]: value };
      if (template.lockAspectRatio && field === "width") tracingTemplate = { ...tracingTemplate, height: template.height * value / template.width };
      if (template.lockAspectRatio && field === "height") tracingTemplate = { ...tracingTemplate, width: template.width * value / template.height };
      return { ...current, tracingTemplate };
    });
  };
  const resetTracingTemplateFit = async () => {
    if (!draft.tracingTemplate || templateBusy) return;
    setTemplateBusy(true);
    setTemplateMessage(null);
    try {
      await applyTracingTemplateImage(draft.tracingTemplate.imagePath);
      setTemplateMessage({ kind: "success", text: "Tracing template reset and fitted to the map." });
    } catch (error) {
      setTemplateMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not reset the tracing template." });
    } finally {
      setTemplateBusy(false);
    }
  };
  const beginTracingTemplateDrag = (kind: "move" | "rotate" | TracingTemplateCorner, point: { x: number; y: number }) => {
    const template = draft.tracingTemplate;
    if (!template) return;
    if (kind === "move") {
      setDragTracingTemplate({ kind, start: point, original: { ...template } });
    } else if (kind === "rotate") {
      const center = tracingTemplateCenter(template);
      setDragTracingTemplate({
        kind,
        center,
        startAngle: Math.atan2(point.y - center.y, point.x - center.x),
        original: { ...template },
      });
    } else {
      setDragTracingTemplate({ kind: "resize", corner: kind, original: { ...template } });
    }
    setPlacementError(null);
  };
  const transformTracingTemplate = (point: { x: number; y: number }) => {
    if (!dragTracingTemplate) return;
    let tracingTemplate: TacticalScenarioTracingTemplate;
    if (dragTracingTemplate.kind === "move") {
      tracingTemplate = {
        ...dragTracingTemplate.original,
        x: dragTracingTemplate.original.x + point.x - dragTracingTemplate.start.x,
        y: dragTracingTemplate.original.y + point.y - dragTracingTemplate.start.y,
      };
    } else if (dragTracingTemplate.kind === "resize") {
      tracingTemplate = resizeTacticalTracingTemplate(dragTracingTemplate.original, dragTracingTemplate.corner, point);
    } else {
      const angle = Math.atan2(point.y - dragTracingTemplate.center.y, point.x - dragTracingTemplate.center.x);
      const rotation = dragTracingTemplate.original.rotation + (angle - dragTracingTemplate.startAngle) * 180 / Math.PI;
      tracingTemplate = {
        ...dragTracingTemplate.original,
        rotation: ((rotation + 180) % 360 + 360) % 360 - 180,
      };
    }
    setDraft((current) => current.tracingTemplate ? { ...current, tracingTemplate } : current);
  };
  const cancelTracingTemplateDrag = () => {
    if (!dragTracingTemplate) return;
    setDraft((current) => current.tracingTemplate
      ? { ...current, tracingTemplate: { ...dragTracingTemplate.original } }
      : current);
    setDragTracingTemplate(null);
  };
  const resolutionError = useMemo(() => {
    try {
      const terrain = resolveTacticalScenarioTerrain(draft);
      terrain.terrainObjects.filter((object) => object.kind === "terminal" && object.visualKind === "human").forEach((human) => validateTacticalInteractiveHumanCombatProfile(human.kind === "terminal" ? human.combatProfile ?? defaultTacticalInteractiveHumanCombatProfile : defaultTacticalInteractiveHumanCombatProfile));
      if (terrain.deploymentCells.length < 2) throw new Error("Define a crew deployment edge or place a Deployment Zone 9x9 before saving or playtesting.");
      const enemyIds = new Set<string>();
      const enemyCells = new Set<string>();
      (draft.enemyPlacements ?? []).forEach((enemy) => {
        const position = cellKey(enemy.position);
        if (!enemy.name.trim()) throw new Error(`Enemy ${enemy.id} requires a name.`);
        if (enemyIds.has(enemy.id)) throw new Error(`Duplicate enemy ID: ${enemy.id}.`);
        if (enemy.position.x < 0 || enemy.position.y < 0 || enemy.position.x >= draft.map.width || enemy.position.y >= draft.map.height) throw new Error(`Enemy ${enemy.name} is outside the map at ${position}.`);
        if (enemyCells.has(position)) throw new Error(`Two enemies occupy ${position}.`);
        if (terrain.objects.some((object) => cellKey(object.position) === position) || terrain.closeMachineryCells.some((cell) => cellKey(cell) === position)) throw new Error(`Enemy ${enemy.name} cannot occupy blocked terrain at ${position}.`);
        if (terrain.deploymentCells.some((cell) => cellKey(cell) === position)) throw new Error(`Enemy ${enemy.name} cannot occupy the crew deployment zone at ${position}.`);
        enemyIds.add(enemy.id);
        enemyCells.add(position);
      });
      if (consoleVictory.operations.length > 0) validateTacticalConsoleVictoryDefinition(consoleVictory, draft.terrainPlacements.filter(tacticalPlacementSupportsConsoleOperations).map((placement) => placement.id), draft.terrainPlacements.filter((placement) => placement.terrainDefinitionId === "interactive-human").map((placement) => placement.id));
      if (consoleVictory.operations.length > 0) buildDefaultTacticalScenario(undefined, draft, consoleVictory);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "The draft could not be resolved.";
    }
  }, [consoleVictory, draft]);
  const victoryTaskRequired = consoleVictory.operations.length === 0;
  const draftBlocked = Boolean(resolutionError) || victoryTaskRequired;
  const updateText = (field: "title" | "briefing" | "objective", value: string) => setDraft((current) => ({ ...current, [field]: value }));
  const updateDimension = (field: "width" | "height", value: string) => {
    const parsed = Number.parseInt(value, 10);
    setDraft((current) => ({ ...current, map: { ...current.map, [field]: Number.isFinite(parsed) ? parsed : 0 } }));
  };
  const toggleDeploymentEdge = (edge: TacticalDeploymentEdge) => {
    const currentEdges = draft.deploymentEdges ?? ["south"];
    const deploymentEdges = currentEdges.includes(edge) ? currentEdges.filter((item) => item !== edge) : [...currentEdges, edge];
    const candidate = { ...draft, deploymentEdges };
    try {
      const terrain = resolveTacticalScenarioTerrain(candidate);
      const deploymentCells = new Set(terrain.deploymentCells.map(cellKey));
      const enemy = (candidate.enemyPlacements ?? []).find((item) => deploymentCells.has(cellKey(item.position)));
      if (enemy) throw new Error(`Enemy ${enemy.name} cannot occupy the crew deployment zone at ${cellKey(enemy.position)}.`);
      setDraft(candidate);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That deployment edge is not valid.");
    }
  };
  const updatePlacements = (placements: TacticalTerrainPlacement[]) => {
    const candidate = { ...draft, terrainPlacements: placements };
    try {
      const terrain = resolveTacticalScenarioTerrain(candidate);
      const deploymentCells = new Set(terrain.deploymentCells.map(cellKey));
      const enemy = (candidate.enemyPlacements ?? []).find((item) => deploymentCells.has(cellKey(item.position)));
      if (enemy) throw new Error(`Enemy ${enemy.name} cannot occupy the crew deployment zone at ${cellKey(enemy.position)}.`);
      setDraft(candidate);
      setPlacementError(null);
      return true;
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That terrain placement is not valid.");
      return false;
    }
  };
  const moveTerrain = (id: string, origin: { x: number; y: number }) => {
    const placement = draft.terrainPlacements.find((item) => item.id === id);
    if (!placement || (placement.origin.x === origin.x && placement.origin.y === origin.y)) return;
    updatePlacements(draft.terrainPlacements.map((item) => item.id === id ? { ...item, origin } : item));
  };
  const beginWall = (from: { x: number; y: number }) => {
    setWallDraft({ from: gridPoint(from), to: gridPoint(from), curved: placementKind === CURVED_WALL_TOOL_ID, awaitingEnd: false });
    setSelectedPlacementId(null);
    setSelectedEnemyId(null);
    setSelectedWallId(null);
    setSelectedFire(null);
    setPlacementError(null);
  };
  const updateWall = (to: { x: number; y: number }) => {
    setWallDraft((current) => current ? { ...current, to: gridPoint(to) } : null);
  };
  const finishWall = (to: { x: number; y: number }) => {
    if (!wallDraft) return;
    const from = gridPoint(wallDraft.from);
    const snappedTo = gridPoint(to);
    setWallDraft(null);
    if (from.x === snappedTo.x && from.y === snappedTo.y) {
      setPlacementError("A wall must have different start and end points.");
      return;
    }
    let suffix = 1;
    let id = `drawn-wall-${suffix}`;
    while ((draft.drawnWalls ?? []).some((wall) => wall.id === id)) {
      suffix += 1;
      id = `drawn-wall-${suffix}`;
    }
    const wall: TacticalDrawnWall = {
      id,
      from,
      to: snappedTo,
      ...(wallDraft.curved ? { control: { x: (from.x + snappedTo.x) / 2, y: (from.y + snappedTo.y) / 2 } } : {}),
    };
    const candidate = { ...draft, drawnWalls: [...(draft.drawnWalls ?? []), wall] };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setSelectedWallId(id);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That wall is not valid.");
    }
  };
  const finishWallInteraction = (to: { x: number; y: number }) => {
    if (!wallDraft) return;
    const snappedTo = gridPoint(to);
    if (sameGridPoint(wallDraft.from, snappedTo)) {
      setWallDraft({ ...wallDraft, to: snappedTo, awaitingEnd: true });
      setPlacementError(null);
      return;
    }
    finishWall(snappedTo);
  };
  const addRaisedAreaVertex = (point: { x: number; y: number }) => {
    const snapped = gridPoint(point);
    if (!raisedAreaDraft) {
      setDragRaisedAreaControl(null);
      setRaisedAreaDraft({ start: snapped, current: snapped, hover: snapped, segments: [] });
      setSelectedPlacementId(null);
      setSelectedEnemyId(null);
      setSelectedWallId(null);
      setSelectedRaisedAreaId(null);
      setSelectedPortalId(null);
      setSelectedFire(null);
      setPlacementError(null);
      return;
    }
    if (sameGridPoint(snapped, raisedAreaDraft.current)) {
      if (sameGridPoint(snapped, raisedAreaDraft.start)) setPlacementError("Add at least three boundary segments before closing the raised area.");
      return;
    }
    const segment = raisedAreaSegment(
      raisedAreaDraft.current,
      snapped,
      placementKind === RAISED_AREA_CURVE_TOOL_ID,
      draft.map,
    );
    const segments = [...raisedAreaDraft.segments, segment];
    if (!sameGridPoint(snapped, raisedAreaDraft.start)) {
      setRaisedAreaDraft({ ...raisedAreaDraft, current: snapped, hover: snapped, segments });
      setPlacementError(null);
      return;
    }
    if (segments.length < 3) {
      setPlacementError("A raised area needs at least three boundary segments.");
      return;
    }
    const usedIds = new Set([
      ...draft.terrainPlacements.map((placement) => placement.id),
      ...(draft.drawnWalls ?? []).map((wall) => wall.id),
      ...(draft.drawnRaisedAreas ?? []).map((area) => area.id),
    ]);
    let suffix = 1;
    let id = `drawn-raised-area-${suffix}`;
    while (usedIds.has(id)) {
      suffix += 1;
      id = `drawn-raised-area-${suffix}`;
    }
    const area: TacticalDrawnRaisedArea = { id, segments };
    const candidate = { ...draft, drawnRaisedAreas: [...(draft.drawnRaisedAreas ?? []), area] };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setRaisedAreaDraft(null);
      setDragRaisedAreaControl(null);
      setSelectedRaisedAreaId(id);
      setPlacementKind(null);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That raised-area outline is not valid.");
    }
  };
  const hoverRaisedArea = (point: { x: number; y: number }) => {
    setRaisedAreaDraft((current) => current ? { ...current, hover: gridPoint(point) } : null);
  };
  const beginRaisedAreaControlDrag = (areaId: string | null, segmentIndex: number) => {
    const segment = areaId
      ? (draft.drawnRaisedAreas ?? []).find((area) => area.id === areaId)?.segments[segmentIndex]
      : raisedAreaDraft?.segments[segmentIndex];
    if (segment?.kind !== "quadratic") return;
    setDragRaisedAreaControl({ areaId, segmentIndex, original: { ...segment.control } });
    setPlacementError(null);
  };
  const reshapeRaisedAreaControl = (point: { x: number; y: number }) => {
    if (!dragRaisedAreaControl) return;
    const control = {
      x: Math.max(0, Math.min(draft.map.width, point.x)),
      y: Math.max(0, Math.min(draft.map.height, point.y)),
    };
    if (dragRaisedAreaControl.areaId) {
      const candidate: TacticalScenarioDefinitionFile = {
        ...draft,
        drawnRaisedAreas: (draft.drawnRaisedAreas ?? []).map((area) => area.id === dragRaisedAreaControl.areaId
          ? {
            ...area,
            segments: area.segments.map((segment, index) => index === dragRaisedAreaControl.segmentIndex && segment.kind === "quadratic"
              ? { ...segment, control }
              : segment),
          }
          : area),
      };
      try {
        resolveTacticalScenarioTerrain(candidate);
        setDraft(candidate);
        setPlacementError(null);
      } catch (error) {
        setPlacementError(error instanceof Error ? error.message : "That raised-area curve position is not valid.");
      }
    } else {
      setRaisedAreaDraft((current) => current ? {
        ...current,
        segments: current.segments.map((segment, index) => index === dragRaisedAreaControl.segmentIndex && segment.kind === "quadratic"
          ? { ...segment, control }
          : segment),
      } : null);
    }
  };
  const cancelRaisedAreaControlDrag = () => {
    if (!dragRaisedAreaControl) return;
    if (dragRaisedAreaControl.areaId) {
      setDraft((current) => ({
        ...current,
        drawnRaisedAreas: (current.drawnRaisedAreas ?? []).map((area) => area.id === dragRaisedAreaControl.areaId
          ? {
            ...area,
            segments: area.segments.map((segment, index) => index === dragRaisedAreaControl.segmentIndex && segment.kind === "quadratic"
              ? { ...segment, control: { ...dragRaisedAreaControl.original } }
              : segment),
          }
          : area),
      }));
    } else {
      setRaisedAreaDraft((current) => current ? {
        ...current,
        segments: current.segments.map((segment, index) => index === dragRaisedAreaControl.segmentIndex && segment.kind === "quadratic"
          ? { ...segment, control: { ...dragRaisedAreaControl.original } }
          : segment),
      } : null);
    }
    setDragRaisedAreaControl(null);
    setPlacementError(null);
  };
  const placeWallPortal = (point: { x: number; y: number }) => {
    const kind = wallPortalKindForTool(placementKind);
    if (!kind) return;
    const placement = tacticalWallPortalPlacementCandidate(draft.drawnWalls ?? [], point, kind);
    if (!placement) {
      setPlacementError("Move closer to a drawn wall to place the portal.");
      return;
    }
    if (!placement.available) {
      setPlacementError("That wall has no open one-square portal position near this point.");
      return;
    }
    const prefix = kind === "iris-valve" ? "wall-iris-valve" : "wall-door";
    const existingIds = new Set((draft.drawnWalls ?? []).flatMap((wall) => (wall.portals ?? []).map((portal) => portal.id)));
    let suffix = 1;
    let id = `${prefix}-${suffix}`;
    while (existingIds.has(id)) {
      suffix += 1;
      id = `${prefix}-${suffix}`;
    }
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      drawnWalls: (draft.drawnWalls ?? []).map((wall) => wall.id === placement.wallId
        ? { ...wall, portals: [...(wall.portals ?? []), { id, kind, position: placement.position }] }
        : wall),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setSelectedPlacementId(null);
      setSelectedEnemyId(null);
      setSelectedWallId(null);
      setSelectedPortalId(id);
      setSelectedFire(null);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That portal position is not valid.");
    }
  };
  const beginWallEndpointDrag = (id: string, endpoint: WallEndpoint) => {
    const wall = (draft.drawnWalls ?? []).find((candidate) => candidate.id === id);
    if (!wall) return;
    setSelectedWallId(id);
    setDragWallEndpoint({
      id,
      endpoint,
      original: {
        from: { ...wall.from },
        to: { ...wall.to },
        ...(wall.control ? { control: { ...wall.control } } : {}),
      },
    });
    setPlacementError(null);
  };
  const resizeWallEndpoint = (point: { x: number; y: number }) => {
    if (!dragWallEndpoint) return;
    const wall = (draft.drawnWalls ?? []).find((candidate) => candidate.id === dragWallEndpoint.id);
    if (!wall || (wall[dragWallEndpoint.endpoint].x === point.x && wall[dragWallEndpoint.endpoint].y === point.y)) return;
    const candidate = {
      ...draft,
      drawnWalls: (draft.drawnWalls ?? []).map((candidateWall) => candidateWall.id === wall.id
        ? { ...candidateWall, [dragWallEndpoint.endpoint]: gridPoint(point) }
        : candidateWall),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That wall endpoint is not valid.");
    }
  };
  const cancelWallEndpointDrag = () => {
    if (!dragWallEndpoint) return;
    setDraft((current) => ({
      ...current,
      drawnWalls: (current.drawnWalls ?? []).map((wall) => wall.id === dragWallEndpoint.id
        ? {
          ...wall,
          from: { ...dragWallEndpoint.original.from },
          to: { ...dragWallEndpoint.original.to },
          ...(dragWallEndpoint.original.control ? { control: { ...dragWallEndpoint.original.control } } : {}),
        }
        : wall),
    }));
    setDragWallEndpoint(null);
    setPlacementError(null);
  };
  const beginWallMove = (id: string, start: { x: number; y: number }) => {
    const wall = (draft.drawnWalls ?? []).find((candidate) => candidate.id === id);
    if (!wall) return;
    setSelectedWallId(id);
    setSelectedPortalId(null);
    setDragWallMove({
      id,
      start: gridPoint(start),
      original: {
        from: { ...wall.from },
        to: { ...wall.to },
        ...(wall.control ? { control: { ...wall.control } } : {}),
      },
    });
    setPlacementError(null);
  };
  const moveWall = (point: { x: number; y: number }) => {
    if (!dragWallMove) return;
    const delta = {
      x: point.x - dragWallMove.start.x,
      y: point.y - dragWallMove.start.y,
    };
    const from = {
      x: dragWallMove.original.from.x + delta.x,
      y: dragWallMove.original.from.y + delta.y,
    };
    const to = {
      x: dragWallMove.original.to.x + delta.x,
      y: dragWallMove.original.to.y + delta.y,
    };
    const control = dragWallMove.original.control ? {
      x: dragWallMove.original.control.x + delta.x,
      y: dragWallMove.original.control.y + delta.y,
    } : undefined;
    const currentWall = (draft.drawnWalls ?? []).find((wall) => wall.id === dragWallMove.id);
    if (!currentWall || (
      currentWall.from.x === from.x
      && currentWall.from.y === from.y
      && currentWall.to.x === to.x
      && currentWall.to.y === to.y
    )) return;
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      drawnWalls: (draft.drawnWalls ?? []).map((wall) => wall.id === dragWallMove.id
        ? { ...wall, from, to, ...(control ? { control } : {}) }
        : wall),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That wall position is not valid.");
    }
  };
  const cancelWallMove = () => {
    if (!dragWallMove) return;
    setDraft((current) => ({
      ...current,
      drawnWalls: (current.drawnWalls ?? []).map((wall) => wall.id === dragWallMove.id
        ? {
          ...wall,
          from: { ...dragWallMove.original.from },
          to: { ...dragWallMove.original.to },
          ...(dragWallMove.original.control ? { control: { ...dragWallMove.original.control } } : {}),
        }
        : wall),
    }));
    setDragWallMove(null);
    setPlacementError(null);
  };
  const beginWallControlDrag = (id: string) => {
    const wall = (draft.drawnWalls ?? []).find((candidate) => candidate.id === id);
    if (!wall?.control) return;
    setSelectedWallId(id);
    setDragWallControl({ id, original: { ...wall.control } });
    setPlacementError(null);
  };
  const reshapeWallControl = (point: { x: number; y: number }) => {
    if (!dragWallControl) return;
    const wall = (draft.drawnWalls ?? []).find((candidate) => candidate.id === dragWallControl.id);
    if (!wall?.control || (wall.control.x === point.x && wall.control.y === point.y)) return;
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      drawnWalls: (draft.drawnWalls ?? []).map((candidateWall) => candidateWall.id === dragWallControl.id
        ? { ...candidateWall, control: { x: point.x, y: point.y } }
        : candidateWall),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That curve position is not valid.");
    }
  };
  const cancelWallControlDrag = () => {
    if (!dragWallControl) return;
    setDraft((current) => ({
      ...current,
      drawnWalls: (current.drawnWalls ?? []).map((wall) => wall.id === dragWallControl.id
        ? { ...wall, control: { ...dragWallControl.original } }
        : wall),
    }));
    setDragWallControl(null);
    setPlacementError(null);
  };
  const beginWallPortalDrag = (portalId: string) => {
    const wall = (draft.drawnWalls ?? []).find((candidate) => (candidate.portals ?? []).some((portal) => portal.id === portalId));
    const portal = wall?.portals?.find((candidate) => candidate.id === portalId);
    if (!wall || !portal) return;
    setSelectedWallId(null);
    setSelectedRaisedAreaId(null);
    setSelectedPortalId(portalId);
    setDragWallPortal({ wallId: wall.id, portalId, originalPosition: portal.position });
    setPlacementError(null);
  };
  const moveWallPortal = (point: { x: number; y: number }) => {
    if (!dragWallPortal) return;
    const placement = tacticalWallPortalRepositionCandidate(
      draft.drawnWalls ?? [],
      dragWallPortal.wallId,
      dragWallPortal.portalId,
      point,
    );
    if (!placement || !placement.available) {
      setPlacementError("Keep the portal on an open one-square position on its wall.");
      return;
    }
    const wall = (draft.drawnWalls ?? []).find((candidate) => candidate.id === dragWallPortal.wallId);
    const portal = wall?.portals?.find((candidate) => candidate.id === dragWallPortal.portalId);
    if (!portal || Math.abs(portal.position - placement.position) < 1e-9) {
      setPlacementError(null);
      return;
    }
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      drawnWalls: (draft.drawnWalls ?? []).map((candidateWall) => candidateWall.id === dragWallPortal.wallId
        ? {
          ...candidateWall,
          portals: (candidateWall.portals ?? []).map((candidatePortal) => candidatePortal.id === dragWallPortal.portalId
            ? { ...candidatePortal, position: placement.position }
            : candidatePortal),
        }
        : candidateWall),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That portal position is not valid.");
    }
  };
  const cancelWallPortalDrag = () => {
    if (!dragWallPortal) return;
    setDraft((current) => ({
      ...current,
      drawnWalls: (current.drawnWalls ?? []).map((wall) => wall.id === dragWallPortal.wallId
        ? {
          ...wall,
          portals: (wall.portals ?? []).map((portal) => portal.id === dragWallPortal.portalId
            ? { ...portal, position: dragWallPortal.originalPosition }
            : portal),
        }
        : wall),
    }));
    setDragWallPortal(null);
    setPlacementError(null);
  };
  const beginOrFinishRamp = (point: EditorMapPoint) => {
    if (!rampDraft) {
      const candidates = tacticalElevationEdgeCandidates(draft);
      const edge = tacticalNearestElevationEdgeCandidate(candidates, point);
      if (!edge) {
        setPlacementError(candidates.length === 0
          ? "No unused adjacent-level edge is available for a ramp."
          : "Move closer to a highlighted edge to begin the ramp.");
        return;
      }
      setRampDraft({ edge });
      setPlacementHover(point);
      setSelectedPlacementId(null);
      setSelectedEnemyId(null);
      setSelectedWallId(null);
      setSelectedRaisedAreaId(null);
      setSelectedElevationTransitionId(null);
      setSelectedPortalId(null);
      setSelectedFire(null);
      setPlacementError(`Extend the ramp at least 2 squares outward, then click again.`);
      return;
    }
    try {
      const candidate = tacticalRampPlacementCandidate(draft, rampDraft.edge, point);
      setDraft(candidate.definition);
      setRampDraft(null);
      setSelectedElevationTransitionId(candidate.transition.id);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That ramp is not valid.");
    }
  };
  const placeTerrain = (origin: EditorMapPoint) => {
    if (!placementKind) return;
    const transitionKind = elevationTransitionKindForTool(placementKind);
    if (transitionKind) {
      if (transitionKind === "ramp") return;
      try {
        const candidate = tacticalElevationTransitionPlacementCandidate(draft, transitionKind, origin);
        setDraft(candidate.definition);
        setSelectedElevationTransitionId(candidate.transition.id);
        setSelectedPlacementId(null);
        setSelectedEnemyId(null);
        setSelectedWallId(null);
        setSelectedRaisedAreaId(null);
        setSelectedPortalId(null);
        setSelectedFire(null);
        setPlacementError(null);
      } catch (error) {
        setPlacementError(error instanceof Error ? error.message : "That elevation transition is not valid.");
      }
      return;
    }
    if (placementKind === FIRE_TOOL_ID) {
      const inBounds = origin.x >= 0 && origin.y >= 0 && origin.x < draft.map.width && origin.y < draft.map.height;
      if (!inBounds) {
        setPlacementError("Fire must be placed inside the map.");
        return;
      }
      if (draft.fireCells.some((cell) => cellKey(cell) === cellKey(origin))) {
        setPlacementError(`A fire already exists at ${cellKey(origin)}.`);
        return;
      }
      setDraft({ ...draft, fireCells: [...draft.fireCells, gridPoint(origin)] });
      setPlacementError(null);
      return;
    }
    let suffix = 1;
    let id = `${placementKind}-${suffix}`;
    while (draft.terrainPlacements.some((placement) => placement.id === id)) {
      suffix += 1;
      id = `${placementKind}-${suffix}`;
    }
    let lastError = "That terrain placement is not valid.";
    for (const placementCandidate of placementCandidates(placementKind, origin)) {
      const placement: TacticalTerrainPlacement = { id, terrainDefinitionId: placementKind, origin: placementCandidate.origin, rotation: placementCandidate.rotation };
      const candidate = { ...draft, terrainPlacements: [...draft.terrainPlacements, placement] };
      try {
        const terrain = resolveTacticalScenarioTerrain(candidate);
        const deploymentCells = new Set(terrain.deploymentCells.map(cellKey));
        const enemy = (candidate.enemyPlacements ?? []).find((item) => deploymentCells.has(cellKey(item.position)));
        if (enemy) throw new Error(`Enemy ${enemy.name} cannot occupy the crew deployment zone at ${cellKey(enemy.position)}.`);
        setDraft(candidate);
        setPlacementError(null);
        setSelectedPlacementId(id);
        setSelectedEnemyId(null);
        if (tacticalPlacementSupportsConsoleOperations(placement)) setConsoleEditorLayout((current) => ({ ...current, visible: true }));
        return;
      } catch (error) {
        lastError = error instanceof Error ? error.message : lastError;
      }
    }
    setPlacementError(lastError);
  };
  const enemyPositionError = (position: { x: number; y: number }, ignoredEnemyId?: string) => {
    const positionKey = cellKey(position);
    if (position.x < 0 || position.y < 0 || position.x >= draft.map.width || position.y >= draft.map.height) return "Enemies must be placed inside the map.";
    if ((draft.enemyPlacements ?? []).some((enemy) => enemy.id !== ignoredEnemyId && cellKey(enemy.position) === positionKey)) return `Another enemy already occupies ${positionKey}.`;
    const terrain = resolveTacticalScenarioTerrain(draft);
    if (terrain.objects.some((object) => cellKey(object.position) === positionKey) || terrain.closeMachineryCells.some((cell) => cellKey(cell) === positionKey)) return `An enemy cannot occupy blocked terrain at ${positionKey}.`;
    if (terrain.deploymentCells.some((cell) => cellKey(cell) === positionKey)) return `An enemy cannot occupy the crew deployment zone at ${positionKey}.`;
    return null;
  };
  const placeEnemy = (position: { x: number; y: number }) => {
    if (!enemyKind) return;
    const error = enemyPositionError(position);
    if (error) { setPlacementError(error); return; }
    let suffix = 1;
    let id = `${enemyKind}-${suffix}`;
    while ((draft.enemyPlacements ?? []).some((enemy) => enemy.id === id)) { suffix += 1; id = `${enemyKind}-${suffix}`; }
    const label = tacticalEnemyPalette.find((enemy) => enemy.id === enemyKind)?.label ?? "Enemy";
    const enemy: TacticalEnemyPlacement = { id, type: enemyKind, name: `${label} ${suffix}`, position: gridPoint(position), facing: "north", avatarPath: randomTacticalEnemyAvatarPath() };
    setDraft({ ...draft, enemyPlacements: [...(draft.enemyPlacements ?? []), enemy] });
    setSelectedPlacementId(null);
    setSelectedEnemyId(id);
    setSelectedFire(null);
    setPlacementError(null);
    setEnemyEditorLayout((current) => ({ ...current, visible: true }));
  };
  const moveEnemy = (id: string, position: { x: number; y: number }) => {
    const enemy = (draft.enemyPlacements ?? []).find((item) => item.id === id);
    if (!enemy || cellKey(enemy.position) === cellKey(position)) return;
    const error = enemyPositionError(position, id);
    if (error) { setPlacementError(error); return; }
    setDraft({ ...draft, enemyPlacements: (draft.enemyPlacements ?? []).map((item) => item.id === id ? { ...item, position: gridPoint(position) } : item) });
    setPlacementError(null);
  };
  const selectedPlacement = draft.terrainPlacements.find((placement) => placement.id === selectedPlacementId) ?? null;
  const selectedEnemy = (draft.enemyPlacements ?? []).find((enemy) => enemy.id === selectedEnemyId) ?? null;
  const selectedWall = (draft.drawnWalls ?? []).find((wall) => wall.id === selectedWallId) ?? null;
  const selectedRaisedArea = (draft.drawnRaisedAreas ?? []).find((area) => area.id === selectedRaisedAreaId) ?? null;
  const selectedElevationTransition = (draft.elevationTransitions ?? []).find((transition) => transition.id === selectedElevationTransitionId) ?? null;
  const selectedPortalWall = (draft.drawnWalls ?? []).find((wall) => (wall.portals ?? []).some((portal) => portal.id === selectedPortalId)) ?? null;
  const selectedPortal = selectedPortalWall?.portals?.find((portal) => portal.id === selectedPortalId) ?? null;
  const selectedHasTerminal = Boolean(selectedPlacement && tacticalPlacementSupportsConsoleOperations(selectedPlacement));
  const selectedIsInteractiveHuman = selectedPlacement?.terrainDefinitionId === "interactive-human";
  const selectTerrainPlacement = (id: string | null) => {
    setSelectedPlacementId(id);
    if (id) setSelectedEnemyId(null);
    if (id) setSelectedWallId(null);
    if (id) setSelectedRaisedAreaId(null);
    if (id) setSelectedElevationTransitionId(null);
    if (id) setSelectedPortalId(null);
    setSelectedOperationId(id ? consoleVictory.operations.find((operation) => operation.consolePlacementId === id)?.id ?? null : null);
    if (!id) return;
    const placement = draft.terrainPlacements.find((item) => item.id === id);
    if (placement && tacticalPlacementSupportsConsoleOperations(placement)) {
      setConsoleEditorLayout((current) => ({ ...current, visible: true }));
    }
  };
  const selectEnemy = (id: string | null) => {
    setSelectedEnemyId(id);
    if (!id) return;
    setSelectedPlacementId(null);
    setSelectedOperationId(null);
    setSelectedWallId(null);
    setSelectedRaisedAreaId(null);
    setSelectedElevationTransitionId(null);
    setSelectedPortalId(null);
    setEnemyEditorLayout((current) => ({ ...current, visible: true }));
  };
  const selectedConsoleOperations = selectedPlacement ? consoleVictory.operations.filter((operation) => operation.consolePlacementId === selectedPlacement.id) : [];
  const selectedOperation = consoleVictory.operations.find((operation) => operation.id === selectedOperationId) ?? null;
  const updateConsoleOperation = (id: string, update: (operation: TacticalConsoleOperation) => TacticalConsoleOperation) => setConsoleVictory((current) => ({ ...current, operations: current.operations.map((operation) => operation.id === id ? update(operation) : operation) }));
  const addConsoleOperation = () => {
    if (!selectedPlacement || !selectedHasTerminal) return;
    let suffix = selectedConsoleOperations.length + 1;
    let id = `${selectedPlacement.id}-operation-${suffix}`;
    while (consoleVictory.operations.some((operation) => operation.id === id)) { suffix += 1; id = `${selectedPlacement.id}-operation-${suffix}`; }
    const victoryExists = consoleVictory.operations.some((operation) => operation.result.type === "victory");
    const operation: TacticalConsoleOperation = {
      id,
      consolePlacementId: selectedPlacement.id,
      label: `${selectedIsInteractiveHuman ? "Interact with" : "Operate"} ${selectedPlacement.objectSettings?.terminal?.label ?? (selectedIsInteractiveHuman ? "Interactive Human" : "Console")}`,
      prerequisites: { mode: "all", operationIds: [] },
      checks: [{ id: `${id}-check-1`, skill: selectedIsInteractiveHuman ? "Persuade" : "Security", difficulty: "average", apCost: 6 }],
      criticalSuccessNextCheckModifier: 2,
      criticalFailureNextCheckModifier: -2,
      result: victoryExists ? { type: "unlock", operationIds: [] } : { type: "victory" },
      ...(selectedIsInteractiveHuman ? { successTransformation: "ally" as const, failureTransformation: "enemy" as const } : {}),
    };
    setConsoleVictory((current) => ({ ...current, operations: [...current.operations, operation] }));
    setSelectedOperationId(id);
  };
  const deleteSelectedOperation = () => {
    if (!selectedOperation) return;
    setConsoleVictory((current) => ({ ...current, operations: current.operations.filter((operation) => operation.id !== selectedOperation.id).map((operation) => ({
      ...operation,
      prerequisites: { ...operation.prerequisites, operationIds: operation.prerequisites.operationIds.filter((id) => id !== selectedOperation.id) },
      result: operation.result.type === "unlock" ? { ...operation.result, operationIds: operation.result.operationIds.filter((id) => id !== selectedOperation.id) } : operation.result,
    })) }));
    setSelectedOperationId(null);
  };
  const selectedIsLiquidHydrogen = selectedPlacement?.terrainDefinitionId.startsWith("liquid-hydrogen-") ?? false;
  const updateSelectedTerminal = (settings: { label?: string; terminalKind?: TacticalTerminalKind; facing?: TacticalTerrainPlacement["rotation"]; operational?: boolean; completesScenario?: boolean; combatProfile?: TacticalInteractiveHumanCombatProfile }) => {
    if (!selectedPlacement || !selectedHasTerminal) return;
    updatePlacements(draft.terrainPlacements.map((placement) => placement.id === selectedPlacement.id ? {
      ...placement,
      objectSettings: {
        ...placement.objectSettings,
        terminal: { ...placement.objectSettings?.terminal, ...settings },
      },
    } : placement));
  };
  const selectedHumanCombatProfile = selectedPlacement?.objectSettings?.terminal?.combatProfile ?? defaultTacticalInteractiveHumanCombatProfile;
  const updateSelectedHumanCombatProfile = (settings: Partial<TacticalInteractiveHumanCombatProfile>) => updateSelectedTerminal({ combatProfile: { ...selectedHumanCombatProfile, skills: selectedHumanCombatProfile.skills.map((skill) => ({ ...skill })), ...settings } });
  const rotateSelectedPlacement = () => {
    if (!selectedPlacement) return;
    const rotation = ((selectedPlacement.rotation + 90) % 360) as TacticalTerrainPlacement["rotation"];
    updatePlacements(draft.terrainPlacements.map((placement) => placement.id === selectedPlacement.id ? { ...placement, rotation } : placement));
  };
  const updateSelectedLiquidHydrogen = (filled: boolean) => {
    if (!selectedPlacement || !selectedIsLiquidHydrogen) return;
    updatePlacements(draft.terrainPlacements.map((placement) => placement.id === selectedPlacement.id ? { ...placement, terrainSettings: { ...placement.terrainSettings, filled } } : placement));
  };
  const removePlacementConsoleOperations = useCallback((placementId: string) => {
    setConsoleVictory((current) => removeConsolePlacementOperations(current, placementId));
    setSelectedOperationId(null);
  }, []);
  const deleteSelectedPlacement = () => {
    if (!selectedPlacement) return;
    if (updatePlacements(draft.terrainPlacements.filter((placement) => placement.id !== selectedPlacement.id))) {
      removePlacementConsoleOperations(selectedPlacement.id);
      setSelectedPlacementId(null);
    }
  };
  const deleteSelectedFire = () => {
    if (!selectedFire) return;
    setDraft((current) => ({ ...current, fireCells: current.fireCells.filter((cell) => cellKey(cell) !== cellKey(selectedFire)) }));
    setSelectedFire(null);
    setPlacementError(null);
  };
  const updateSelectedEnemyName = (name: string) => {
    if (!selectedEnemy) return;
    setDraft((current) => ({ ...current, enemyPlacements: (current.enemyPlacements ?? []).map((enemy) => enemy.id === selectedEnemy.id ? { ...enemy, name } : enemy) }));
  };
  const rotateSelectedEnemy = () => {
    if (!selectedEnemy) return;
    const facings = ["north", "east", "south", "west"] as const;
    const facing = facings[(facings.indexOf(selectedEnemy.facing ?? "north") + 1) % facings.length];
    setDraft((current) => ({ ...current, enemyPlacements: (current.enemyPlacements ?? []).map((enemy) => enemy.id === selectedEnemy.id ? { ...enemy, facing } : enemy) }));
  };
  const deleteSelectedEnemy = () => {
    if (!selectedEnemy) return;
    setDraft((current) => ({ ...current, enemyPlacements: (current.enemyPlacements ?? []).filter((enemy) => enemy.id !== selectedEnemy.id) }));
    setSelectedEnemyId(null);
    setPlacementError(null);
  };
  const deleteSelectedWall = () => {
    if (!selectedWall) return;
    const candidate = {
      ...draft,
      drawnWalls: (draft.drawnWalls ?? []).filter((wall) => wall.id !== selectedWall.id),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setSelectedWallId(null);
      setDragWallEndpoint(null);
      setDragWallMove(null);
      setDragWallControl(null);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That wall cannot be deleted.");
    }
  };
  const deleteSelectedRaisedArea = () => {
    if (!selectedRaisedArea) return;
    try {
      const candidate = removeDrawnRaisedAreaCandidate(draft, selectedRaisedArea.id);
      setDraft(candidate.definition);
      setSelectedRaisedAreaId(null);
      setDragRaisedAreaControl(null);
      setPlacementError(candidate.removedTransitionIds.length > 0
        ? `Deleted the raised area and ${candidate.removedTransitionIds.length} attached elevation ${candidate.removedTransitionIds.length === 1 ? "transition" : "transitions"}.`
        : null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That raised area cannot be deleted.");
    }
  };
  const deleteSelectedPortal = () => {
    if (!selectedPortal || !selectedPortalWall) return;
    const candidate = {
      ...draft,
      drawnWalls: (draft.drawnWalls ?? []).map((wall) => wall.id === selectedPortalWall.id
        ? { ...wall, portals: (wall.portals ?? []).filter((portal) => portal.id !== selectedPortal.id) }
        : wall),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setSelectedPortalId(null);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That portal cannot be deleted.");
    }
  };
  const deleteSelectedElevationTransition = () => {
    if (!selectedElevationTransition) return;
    const candidate = {
      ...draft,
      elevationTransitions: (draft.elevationTransitions ?? []).filter((transition) => transition.id !== selectedElevationTransition.id),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setSelectedElevationTransitionId(null);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That elevation transition cannot be deleted.");
    }
  };
  useEffect(() => {
    const deleteSelection = (event: KeyboardEvent) => {
      if (event.key !== "Delete") return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (selectedPlacement) {
        const candidate = { ...draft, terrainPlacements: draft.terrainPlacements.filter((placement) => placement.id !== selectedPlacement.id) };
        try {
          resolveTacticalScenarioTerrain(candidate);
          setDraft(candidate);
          removePlacementConsoleOperations(selectedPlacement.id);
          setSelectedPlacementId(null);
          setPlacementError(null);
        } catch (error) {
          setPlacementError(error instanceof Error ? error.message : "That terrain placement cannot be deleted.");
        }
      } else if (selectedEnemy) {
        setDraft((current) => ({ ...current, enemyPlacements: (current.enemyPlacements ?? []).filter((enemy) => enemy.id !== selectedEnemy.id) }));
        setSelectedEnemyId(null);
        setPlacementError(null);
      } else if (selectedRaisedArea) {
        try {
          const candidate = removeDrawnRaisedAreaCandidate(draft, selectedRaisedArea.id);
          setDraft(candidate.definition);
          setSelectedRaisedAreaId(null);
          setDragRaisedAreaControl(null);
          setPlacementError(candidate.removedTransitionIds.length > 0
            ? `Deleted the raised area and ${candidate.removedTransitionIds.length} attached elevation ${candidate.removedTransitionIds.length === 1 ? "transition" : "transitions"}.`
            : null);
        } catch (error) {
          setPlacementError(error instanceof Error ? error.message : "That raised area cannot be deleted.");
        }
      } else if (selectedWall) {
        const candidate = { ...draft, drawnWalls: (draft.drawnWalls ?? []).filter((wall) => wall.id !== selectedWall.id) };
        try {
          resolveTacticalScenarioTerrain(candidate);
          setDraft(candidate);
          setSelectedWallId(null);
          setDragWallEndpoint(null);
          setDragWallMove(null);
          setDragWallControl(null);
          setPlacementError(null);
        } catch (error) {
          setPlacementError(error instanceof Error ? error.message : "That wall cannot be deleted.");
        }
      } else if (selectedPortal && selectedPortalWall) {
        const candidate = {
          ...draft,
          drawnWalls: (draft.drawnWalls ?? []).map((wall) => wall.id === selectedPortalWall.id
            ? { ...wall, portals: (wall.portals ?? []).filter((portal) => portal.id !== selectedPortal.id) }
            : wall),
        };
        try {
          resolveTacticalScenarioTerrain(candidate);
          setDraft(candidate);
          setSelectedPortalId(null);
          setPlacementError(null);
        } catch (error) {
          setPlacementError(error instanceof Error ? error.message : "That portal cannot be deleted.");
        }
      } else if (selectedElevationTransition) {
        const candidate = {
          ...draft,
          elevationTransitions: (draft.elevationTransitions ?? []).filter((transition) => transition.id !== selectedElevationTransition.id),
        };
        try {
          resolveTacticalScenarioTerrain(candidate);
          setDraft(candidate);
          setSelectedElevationTransitionId(null);
          setPlacementError(null);
        } catch (error) {
          setPlacementError(error instanceof Error ? error.message : "That elevation transition cannot be deleted.");
        }
      } else if (selectedFire) {
        setDraft((current) => ({ ...current, fireCells: current.fireCells.filter((cell) => cellKey(cell) !== cellKey(selectedFire)) }));
        setSelectedFire(null);
        setPlacementError(null);
      } else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", deleteSelection);
    return () => window.removeEventListener("keydown", deleteSelection);
  }, [draft, removePlacementConsoleOperations, selectedElevationTransition, selectedEnemy, selectedFire, selectedPlacement, selectedPortal, selectedPortalWall, selectedRaisedArea, selectedWall]);
  useEffect(() => {
    if (!raisedAreaDraft) return;
    const cancelRaisedArea = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setRaisedAreaDraft(null);
      setDragRaisedAreaControl(null);
      setPlacementError(null);
      event.preventDefault();
    };
    window.addEventListener("keydown", cancelRaisedArea);
    return () => window.removeEventListener("keydown", cancelRaisedArea);
  }, [raisedAreaDraft]);
  useEffect(() => {
    if (!rampDraft) return;
    const cancelRamp = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setRampDraft(null);
      setPlacementError(null);
      event.preventDefault();
    };
    window.addEventListener("keydown", cancelRamp);
    return () => window.removeEventListener("keydown", cancelRamp);
  }, [rampDraft]);
  useEffect(() => {
    if (!isRaisedAreaTool(placementKind)) {
      setRaisedAreaDraft(null);
      setDragRaisedAreaControl(null);
    }
  }, [placementKind]);
  useEffect(() => {
    if (placementKind !== RAMP_TOOL_ID) setRampDraft(null);
  }, [placementKind]);
  const beginPlaytest = () => {
    if (draftBlocked || draft.map.width < 1 || draft.map.height < 1) return;
    setPlaytest({ definition: cloneTacticalScenarioDefinition(draft), consoleVictory: cloneTacticalConsoleVictoryDefinition(consoleVictory), sandbox: createAppStore(store.getState()) });
  };
  const clearEditorSelection = () => {
    setSelectedPlacementId(null);
    setSelectedOperationId(null);
    setSelectedEnemyId(null);
    setSelectedWallId(null);
    setSelectedRaisedAreaId(null);
    setSelectedElevationTransitionId(null);
    setSelectedPortalId(null);
    setSelectedFire(null);
    setPlacementKind(null);
    setEnemyKind(null);
    setPlacementHover(null);
    setEnemyHover(null);
    setPortalHover(null);
    setWallDraft(null);
    setRaisedAreaDraft(null);
    setRampDraft(null);
    setDragRaisedAreaControl(null);
    setDragWallEndpoint(null);
    setDragWallMove(null);
    setDragWallControl(null);
    setDragWallPortal(null);
    setDragTracingTemplate(null);
    setTracingTemplateEditing(false);
    setDragPlacement(null);
    setDragEnemy(null);
    setPlacementError(null);
  };
  const loadScenario = async () => {
    if (!scenarioToLoad || fileBusy) return;
    if (dirty && !window.confirm("Load another scenario and discard the unsaved changes in this draft?")) return;
    setFileBusy(true);
    setFileMessage(null);
    try {
      const response = await fetch(`/api/tactical/scenarios/${encodeURIComponent(scenarioToLoad)}`, { cache: "no-store" });
      const body = await response.json() as { definition?: TacticalScenarioDefinitionFile; consoleVictory?: TacticalConsoleVictoryDefinitionFile; error?: string };
      if (!response.ok || !body.definition || !body.consoleVictory) throw new Error(body.error ?? "Could not load the scenario.");
      const loaded = cloneTacticalScenarioDefinition(body.definition);
      const loadedConsoleVictory = cloneTacticalConsoleVictoryDefinition(body.consoleVictory);
      resolveTacticalScenarioTerrain(loaded);
      validateTacticalConsoleVictoryDefinition(loadedConsoleVictory, loaded.terrainPlacements.filter(tacticalPlacementSupportsConsoleOperations).map((placement) => placement.id), loaded.terrainPlacements.filter((placement) => placement.terrainDefinitionId === "interactive-human").map((placement) => placement.id));
      const summary = availableScenarios.find((scenario) => scenario.id === loaded.id) ?? { id: loaded.id, title: loaded.title, isDefault: loaded.id === defaultTacticalScenarioDefinition.id };
      setDraft(loaded);
      setBaseline(cloneTacticalScenarioDefinition(loaded));
      setConsoleVictory(loadedConsoleVictory);
      setConsoleVictoryBaseline(cloneTacticalConsoleVictoryDefinition(loadedConsoleVictory));
      setCurrentScenario(summary);
      clearEditorSelection();
      setFileMessage({ kind: "success", text: `Loaded ${loaded.title}.` });
    } catch (error) {
      setFileMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not load the scenario." });
    } finally {
      setFileBusy(false);
    }
  };
  const saveScenarioAs = async () => {
    if (!saveAsName.trim() || fileBusy || draftBlocked) return;
    setFileBusy(true);
    setFileMessage(null);
    try {
      const definition = {
        ...draft,
        enemyPlacements: (draft.enemyPlacements ?? []).map((enemy) => ({ ...enemy, position: gridPoint(enemy.position) })),
        fireCells: draft.fireCells.map(gridPoint),
        smokeCells: draft.smokeCells.map(gridPoint),
      };
      const response = await fetch("/api/tactical/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: saveAsName, definition, consoleVictory }),
      });
      const body = await response.json() as { scenario?: ScenarioSummary; definition?: TacticalScenarioDefinitionFile; consoleVictory?: TacticalConsoleVictoryDefinitionFile; error?: string };
      if (!response.ok || !body.scenario || !body.definition || !body.consoleVictory) throw new Error(body.error ?? "Could not save the scenario.");
      const saved = cloneTacticalScenarioDefinition(body.definition);
      const savedConsoleVictory = cloneTacticalConsoleVictoryDefinition(body.consoleVictory);
      setDraft(saved);
      setBaseline(cloneTacticalScenarioDefinition(saved));
      setConsoleVictory(savedConsoleVictory);
      setConsoleVictoryBaseline(cloneTacticalConsoleVictoryDefinition(savedConsoleVictory));
      setCurrentScenario(body.scenario);
      setScenarioToLoad(body.scenario.id);
      setSaveAsName("");
      await refreshScenarioList();
      setFileMessage({ kind: "success", text: `Saved ${body.scenario.id}.json.` });
    } catch (error) {
      setFileMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not save the scenario." });
    } finally {
      setFileBusy(false);
    }
  };
  const saveScenario = async () => {
    if (currentScenario.isDefault || !dirty || fileBusy || draftBlocked) return;
    setFileBusy(true);
    setFileMessage(null);
    try {
      const definition = {
        ...draft,
        enemyPlacements: (draft.enemyPlacements ?? []).map((enemy) => ({ ...enemy, position: gridPoint(enemy.position) })),
        fireCells: draft.fireCells.map(gridPoint),
        smokeCells: draft.smokeCells.map(gridPoint),
      };
      const response = await fetch(`/api/tactical/scenarios/${encodeURIComponent(currentScenario.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ definition, consoleVictory }),
      });
      const body = await response.json() as { scenario?: ScenarioSummary; definition?: TacticalScenarioDefinitionFile; consoleVictory?: TacticalConsoleVictoryDefinitionFile; error?: string };
      if (!response.ok || !body.scenario || !body.definition || !body.consoleVictory) throw new Error(body.error ?? "Could not save the scenario.");
      const saved = cloneTacticalScenarioDefinition(body.definition);
      const savedConsoleVictory = cloneTacticalConsoleVictoryDefinition(body.consoleVictory);
      setDraft(saved);
      setBaseline(cloneTacticalScenarioDefinition(saved));
      setConsoleVictory(savedConsoleVictory);
      setConsoleVictoryBaseline(cloneTacticalConsoleVictoryDefinition(savedConsoleVictory));
      setCurrentScenario(body.scenario);
      await refreshScenarioList();
      setFileMessage({ kind: "success", text: `Saved changes to ${body.scenario.id}.json.` });
    } catch (error) {
      setFileMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not save the scenario." });
    } finally {
      setFileBusy(false);
    }
  };

  if (playtest) return <Provider store={playtest.sandbox}>
    <TacticalMapPageClient draftPlaytest={{ definition: playtest.definition, consoleVictory: playtest.consoleVictory, onExit: () => setPlaytest(null) }} />
  </Provider>;

  return <main className="flex h-screen w-screen flex-col overflow-hidden bg-[#050a12] font-mono text-slate-100">
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-cyan-800 bg-slate-950 px-5">
      <div>
        <div className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-100">Scenario Editor</div>
        <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">{currentScenario.title} · {currentScenario.isDefault ? "immutable source" : "saved scenario"} · editable draft</div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${dirty ? "border-amber-400 text-amber-200" : "border-slate-600 text-slate-400"}`}>{dirty ? "Unsaved draft" : "Unchanged"}</span>
      </div>
    </header>
    <div className="grid min-h-0 flex-1 grid-cols-[21rem_1fr]">
      <aside className="overflow-y-auto border-r border-cyan-900 bg-[#071019] p-4">
        <div className="mb-4 border border-slate-700 bg-slate-950/70 p-3 text-[10px] text-slate-400">
          Changes exist only in this draft. Playtesting uses a separate temporary game store and cannot overwrite the active tactical session.
        </div>
        <div className="mb-4 border border-cyan-800 bg-slate-950/70 p-3">
          <div className="mb-2 text-[9px] font-bold uppercase tracking-wider text-cyan-200">Scenario files</div>
          <label className="mb-2 block text-[9px] font-bold uppercase tracking-wider text-slate-400">Load scenario
            <select aria-label="Load scenario" value={scenarioToLoad} onChange={(event) => setScenarioToLoad(event.target.value)} disabled={fileBusy || availableScenarios.length === 0} className="mt-1 h-9 w-full border border-slate-600 bg-slate-950 px-2 text-xs normal-case tracking-normal text-slate-100 outline-none focus:border-cyan-400 disabled:opacity-40">
              {availableScenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.title}{scenario.isDefault ? " (default)" : ""}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => void loadScenario()} disabled={fileBusy || !scenarioToLoad} className="mb-3 h-8 w-full border border-cyan-500 text-[9px] font-bold uppercase tracking-wider text-cyan-100 disabled:opacity-40">Load scenario</button>
          {currentScenario.isDefault && <div className="mb-3 text-[9px] text-amber-300">The default scenario cannot be overwritten. Use Save As.</div>}
          <label className="mb-2 block text-[9px] font-bold uppercase tracking-wider text-slate-400">New scenario name
            <input aria-label="New scenario name" value={saveAsName} onChange={(event) => setSaveAsName(event.target.value)} placeholder="Boarding action" className="mt-1 h-9 w-full border border-slate-600 bg-slate-950 px-2 text-xs normal-case tracking-normal text-slate-100 outline-none placeholder:text-slate-700 focus:border-cyan-400" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void saveScenario()} disabled={fileBusy || currentScenario.isDefault || !dirty || draftBlocked} className="h-8 border border-emerald-400 text-[9px] font-bold uppercase tracking-wider text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40">Save changes</button>
            <button type="button" onClick={() => void saveScenarioAs()} disabled={fileBusy || !saveAsName.trim() || draftBlocked} className="h-8 border border-emerald-500 text-[9px] font-bold uppercase tracking-wider text-emerald-100 disabled:opacity-40">Save as new scenario</button>
          </div>
          <div className="mt-2 text-[9px] text-slate-500">Save As creates a new JSON file and never overwrites an existing scenario.</div>
          {fileMessage && <div role="status" className={`mt-2 border p-2 text-[10px] ${fileMessage.kind === "error" ? "border-red-500/70 bg-red-950/60 text-red-100" : "border-emerald-500/70 bg-emerald-950/50 text-emerald-100"}`}>{fileMessage.text}</div>}
        </div>
        <label className="mb-3 block text-[9px] font-bold uppercase tracking-wider text-cyan-200">Title
          <input value={draft.title} onChange={(event) => updateText("title", event.target.value)} className="mt-1 h-9 w-full border border-slate-600 bg-slate-950 px-2 text-xs normal-case tracking-normal text-slate-100 outline-none focus:border-cyan-400" />
        </label>
        <label className="mb-3 block text-[9px] font-bold uppercase tracking-wider text-cyan-200">Briefing
          <textarea value={draft.briefing} onChange={(event) => updateText("briefing", event.target.value)} rows={4} className="mt-1 w-full resize-none border border-slate-600 bg-slate-950 p-2 text-xs normal-case tracking-normal text-slate-100 outline-none focus:border-cyan-400" />
        </label>
        <label className="mb-3 block text-[9px] font-bold uppercase tracking-wider text-cyan-200">Objective
          <textarea value={draft.objective} onChange={(event) => updateText("objective", event.target.value)} rows={3} className="mt-1 w-full resize-none border border-slate-600 bg-slate-950 p-2 text-xs normal-case tracking-normal text-slate-100 outline-none focus:border-cyan-400" />
        </label>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <label className="text-[9px] font-bold uppercase tracking-wider text-cyan-200">Map width
            <input type="number" min="1" value={draft.map.width} onChange={(event) => updateDimension("width", event.target.value)} className="mt-1 h-9 w-full border border-slate-600 bg-slate-950 px-2 text-xs text-slate-100 outline-none focus:border-cyan-400" />
          </label>
          <label className="text-[9px] font-bold uppercase tracking-wider text-cyan-200">Map height
            <input type="number" min="1" value={draft.map.height} onChange={(event) => updateDimension("height", event.target.value)} className="mt-1 h-9 w-full border border-slate-600 bg-slate-950 px-2 text-xs text-slate-100 outline-none focus:border-cyan-400" />
          </label>
        </div>
        <div className="mb-4 border-t border-slate-700 pt-3">
          <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-emerald-200">Crew deployment edges</div>
          <div className="mb-2 text-[9px] normal-case text-slate-500">Each selected edge allows setup within six squares of that edge.</div>
          <div className="grid grid-cols-4 gap-1">
            {(["north", "east", "south", "west"] as const).map((edge) => {
              const selected = (draft.deploymentEdges ?? ["south"]).includes(edge);
              return <button key={edge} type="button" aria-pressed={selected} onClick={() => toggleDeploymentEdge(edge)} className={`h-8 border text-[8px] font-bold uppercase ${selected ? "border-emerald-300 bg-emerald-300/20 text-emerald-50" : "border-slate-700 text-slate-400"}`}>{edge}</button>;
            })}
          </div>
        </div>
        <div className="mb-4 border-t border-slate-700 pt-3">
          <div className="mb-2 text-[9px] font-bold uppercase tracking-wider text-cyan-200">Terrain placements</div>
          {draft.terrainPlacements.map((placement) => <button type="button" key={placement.id} onClick={() => { selectTerrainPlacement(placement.id); setSelectedFire(null); setPlacementKind(null); setPlacementError(null); }} className={`mb-2 block w-full border p-2 text-left text-[10px] ${placement.id === selectedPlacementId ? "border-cyan-300 bg-cyan-950/60 text-cyan-100" : "border-slate-700 bg-slate-950/70 text-slate-300"}`}>
            <div className="font-bold text-slate-100">{placement.id}</div>
            <div>{placement.terrainDefinitionId} · {placement.origin.x},{placement.origin.y} · {placement.rotation}°</div>
          </button>)}
        </div>
        {selectedRaisedArea && <div className="mb-4 border border-cyan-600 bg-slate-950/70 p-3">
          <div className="mb-2 text-[9px] font-bold uppercase tracking-wider text-cyan-200">Selected raised area</div>
          <div className="mb-1 text-[10px] font-bold text-slate-100">{selectedRaisedArea.id}</div>
          <div className="mb-3 text-[10px] text-slate-400">{selectedRaisedArea.segments.length} boundary segments</div>
          <button type="button" onClick={deleteSelectedRaisedArea} className="h-8 w-full border border-red-400 text-[9px] font-bold uppercase text-red-100">Delete raised area</button>
        </div>}
        {selectedWall && <div className="mb-4 border border-amber-600 bg-slate-950/70 p-3">
          <div className="mb-2 text-[9px] font-bold uppercase tracking-wider text-amber-200">Selected wall</div>
          <div className="mb-1 text-[10px] font-bold text-slate-100">{selectedWall.id}</div>
          <div className="mb-3 text-[10px] text-slate-400">
            {selectedWall.from.x},{selectedWall.from.y} to {selectedWall.to.x},{selectedWall.to.y}
          </div>
          {(selectedWall.portals?.length ?? 0) > 0 && <div className="mb-3 border border-red-700/70 bg-red-950/40 p-2 text-[9px] text-red-200">
            Deleting this wall also removes {selectedWall.portals?.length} attached {selectedWall.portals?.length === 1 ? "portal" : "portals"}.
          </div>}
          <button type="button" onClick={deleteSelectedWall} className="h-8 w-full border border-red-400 text-[9px] font-bold uppercase text-red-100">Delete wall</button>
        </div>}
        {selectedPortal && selectedPortalWall && <div className="mb-4 border border-amber-500 bg-slate-950/70 p-3">
          <div className="mb-2 text-[9px] font-bold uppercase tracking-wider text-amber-200">Selected portal</div>
          <div className="mb-1 text-[10px] font-bold text-slate-100">{selectedPortal.id}</div>
          <div className="mb-3 text-[10px] text-slate-400">
            {selectedPortal.kind === "iris-valve" ? "Wall Iris Valve" : "Door"} on {selectedPortalWall.id}
          </div>
          <button type="button" onClick={deleteSelectedPortal} className="h-8 w-full border border-red-400 text-[9px] font-bold uppercase text-red-100">Delete portal</button>
        </div>}
        {selectedElevationTransition && <div className="mb-4 border border-purple-500 bg-slate-950/70 p-3">
          <div className="mb-2 text-[9px] font-bold uppercase tracking-wider text-purple-200">Selected elevation transition</div>
          <div className="mb-1 text-[10px] font-bold text-slate-100">{selectedElevationTransition.id}</div>
          <div className="mb-3 text-[10px] text-slate-400">
            {selectedElevationTransition.kind} · lower {selectedElevationTransition.lower.x},{selectedElevationTransition.lower.y} · upper {selectedElevationTransition.upper.x},{selectedElevationTransition.upper.y}
          </div>
          <button type="button" onClick={deleteSelectedElevationTransition} className="h-8 w-full border border-red-400 text-[9px] font-bold uppercase text-red-100">Delete transition</button>
        </div>}
        {selectedPlacement && <div className="mb-4 border border-cyan-700 bg-slate-950/70 p-3">
          <div className="mb-2 text-[9px] font-bold uppercase tracking-wider text-cyan-200">Selected placement</div>
          <div className="mb-2 text-[10px] text-slate-300">{selectedPlacement.id}</div>
          <div className="mb-2 grid grid-cols-2 gap-2">
            {(["x", "y"] as const).map((axis) => <label key={axis} className="text-[9px] font-bold uppercase tracking-wider text-cyan-200">{axis}
              <input type="number" value={selectedPlacement.origin[axis]} onChange={(event) => moveTerrain(selectedPlacement.id, { ...selectedPlacement.origin, [axis]: Number.parseInt(event.target.value, 10) || 0 })} className="mt-1 h-8 w-full border border-slate-600 bg-slate-950 px-2 text-xs text-slate-100 outline-none focus:border-cyan-400" />
            </label>)}
          </div>
          {selectedIsLiquidHydrogen && <div className="mb-3 border-t border-slate-700 pt-3">
            <label className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-cyan-200">
              <input type="checkbox" checked={selectedPlacement.terrainSettings?.filled ?? true} onChange={(event) => updateSelectedLiquidHydrogen(event.target.checked)} /> Filled with liquid hydrogen
            </label>
          </div>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={rotateSelectedPlacement} className="h-8 border border-amber-400 text-[9px] font-bold uppercase text-amber-100">Rotate 90°</button>
            <button type="button" onClick={deleteSelectedPlacement} className="h-8 border border-red-400 text-[9px] font-bold uppercase text-red-100">Delete</button>
          </div>
        </div>}
        {selectedFire && <div className="mb-4 border border-orange-500 bg-slate-950/70 p-3">
          <div className="mb-2 text-[9px] font-bold uppercase tracking-wider text-orange-200">Selected fire</div>
          <div className="mb-3 text-[10px] text-slate-300">Square {selectedFire.x},{selectedFire.y}</div>
          <button type="button" onClick={deleteSelectedFire} className="h-8 w-full border border-red-400 text-[9px] font-bold uppercase text-red-100">Delete fire</button>
        </div>}
        {placementError && <div className="mb-3 border border-amber-500/70 bg-amber-950/60 p-2 text-[10px] text-amber-100">{placementError}</div>}
        {victoryTaskRequired && <div className="mb-3 border border-amber-500/70 bg-amber-950/60 p-2 text-[10px] text-amber-100">This draft has no victory task. Select a console and add a victory task before saving or playtesting.</div>}
        {resolutionError && <div className="mb-3 border border-red-500/70 bg-red-950/60 p-2 text-[10px] text-red-100">{resolutionError}</div>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={!dirty} onClick={() => { setDraft(cloneTacticalScenarioDefinition(baseline)); setConsoleVictory(cloneTacticalConsoleVictoryDefinition(consoleVictoryBaseline)); clearEditorSelection(); }} className="h-9 border border-slate-500 text-[9px] font-bold uppercase tracking-wider text-slate-200 disabled:cursor-not-allowed disabled:opacity-40">Discard draft</button>
          <button type="button" disabled={draftBlocked || draft.map.width < 1 || draft.map.height < 1} onClick={beginPlaytest} className="h-9 border border-emerald-400 text-[9px] font-bold uppercase tracking-wider text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40">Playtest draft</button>
        </div>
      </aside>
      <section className="relative min-h-0 overflow-hidden">
        <PluginHudLayer hiddenHuds={[
          ...(terrainPaletteLayout.visible ? [] : [{ id: "terrain-palette", title: "Terrain Palette" }]),
          ...(enemyPaletteLayout.visible ? [] : [{ id: "enemy-palette", title: "Enemy Palette" }]),
          ...(selectedHasTerminal && !consoleEditorLayout.visible ? [{ id: "console-editor", title: selectedIsInteractiveHuman ? "Human Interaction Editor" : "Console Editor" }] : []),
          ...(selectedEnemy && !enemyEditorLayout.visible ? [{ id: "enemy-editor", title: "Enemy Editor" }] : []),
          ...(navigationLayout.visible ? [] : [{ id: "navigation", title: "Navigation" }]),
          ...(tracingTemplateLayout.visible ? [] : [{ id: "tracing-template", title: "Tracing Template" }]),
        ]} onRestoreHud={(id) => {
          if (id === "console-editor") setConsoleEditorLayout((current) => ({ ...current, visible: true }));
          else if (id === "enemy-editor") setEnemyEditorLayout((current) => ({ ...current, visible: true }));
          else if (id === "enemy-palette") setEnemyPaletteLayout((current) => ({ ...current, visible: true }));
          else if (id === "navigation") setNavigationLayout((current) => ({ ...current, visible: true }));
          else if (id === "tracing-template") setTracingTemplateLayout((current) => ({ ...current, visible: true }));
          else setTerrainPaletteLayout((current) => ({ ...current, visible: true }));
        }} className="p-5">
          <div className="absolute left-7 top-7 z-10 border border-cyan-700 bg-slate-950/90 px-3 py-2 text-[9px] uppercase tracking-wider text-cyan-100">Draft preview · {draft.map.width}×{draft.map.height}</div>
          <div className="h-full w-full overflow-hidden border border-cyan-900 bg-black shadow-[0_0_30px_rgba(8,145,178,0.12)]">
            <DraftPreview definition={draft} selectedPlacementId={selectedPlacementId} selectedEnemyId={selectedEnemyId} selectedWallId={selectedWallId} selectedRaisedAreaId={selectedRaisedAreaId} selectedElevationTransitionId={selectedElevationTransitionId} selectedPortalId={selectedPortalId} selectedFire={selectedFire} placementKind={placementKind} enemyKind={enemyKind} placementHover={placementHover} enemyHover={enemyHover} portalHover={portalHover} wallDraft={wallDraft} raisedAreaDraft={raisedAreaDraft} rampDraft={rampDraft} dragRaisedAreaControl={dragRaisedAreaControl} dragWallEndpoint={dragWallEndpoint} dragWallMove={dragWallMove} dragWallControl={dragWallControl} dragWallPortal={dragWallPortal} dragTracingTemplate={dragTracingTemplate} tracingTemplateEditing={tracingTemplateEditing} dragPlacement={dragPlacement} dragEnemy={dragEnemy} selectPlacement={selectTerrainPlacement} selectEnemy={selectEnemy} selectWall={(id) => { setSelectedWallId(id); if (id) { setSelectedRaisedAreaId(null); setSelectedElevationTransitionId(null); setSelectedPortalId(null); } }} selectRaisedArea={(id) => { setSelectedRaisedAreaId(id); if (id) { setSelectedWallId(null); setSelectedElevationTransitionId(null); setSelectedPortalId(null); } }} selectElevationTransition={(id) => { setSelectedElevationTransitionId(id); if (id) { setSelectedWallId(null); setSelectedRaisedAreaId(null); setSelectedPortalId(null); } }} selectPortal={setSelectedPortalId} selectFire={setSelectedFire} hoverPlacement={setPlacementHover} hoverEnemy={setEnemyHover} hoverPortal={setPortalHover} beginWall={beginWall} updateWall={updateWall} finishWall={finishWall} finishWallInteraction={finishWallInteraction} cancelWall={() => setWallDraft(null)} addRaisedAreaVertex={addRaisedAreaVertex} hoverRaisedArea={hoverRaisedArea} beginOrFinishRamp={beginOrFinishRamp} beginRaisedAreaControlDrag={beginRaisedAreaControlDrag} reshapeRaisedAreaControl={reshapeRaisedAreaControl} finishRaisedAreaControlDrag={() => setDragRaisedAreaControl(null)} cancelRaisedAreaControlDrag={cancelRaisedAreaControlDrag} placeWallPortal={placeWallPortal} beginWallEndpointDrag={beginWallEndpointDrag} resizeWallEndpoint={resizeWallEndpoint} finishWallEndpointDrag={() => setDragWallEndpoint(null)} cancelWallEndpointDrag={cancelWallEndpointDrag} beginWallMove={beginWallMove} moveWall={moveWall} finishWallMove={() => setDragWallMove(null)} cancelWallMove={cancelWallMove} beginWallControlDrag={beginWallControlDrag} reshapeWallControl={reshapeWallControl} finishWallControlDrag={() => setDragWallControl(null)} cancelWallControlDrag={cancelWallControlDrag} beginWallPortalDrag={beginWallPortalDrag} moveWallPortal={moveWallPortal} finishWallPortalDrag={() => setDragWallPortal(null)} cancelWallPortalDrag={cancelWallPortalDrag} beginTracingTemplateDrag={beginTracingTemplateDrag} transformTracingTemplate={transformTracingTemplate} finishTracingTemplateDrag={() => setDragTracingTemplate(null)} cancelTracingTemplateDrag={cancelTracingTemplateDrag} beginDrag={setDragPlacement} beginEnemyDrag={setDragEnemy} endDrag={() => { setDragPlacement(null); setDragEnemy(null); }} placeTerrain={placeTerrain} placeEnemy={placeEnemy} moveTerrain={moveTerrain} moveEnemy={moveEnemy} />
          </div>
          <TacticalNavigationHud layout={navigationLayout} mode="editor" onLayoutChange={setNavigationLayout} />
          <FloatingPluginHud title="Tracing Template" layout={tracingTemplateLayout} onLayoutChange={setTracingTemplateLayout} className="w-72 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
            <div className="max-h-[70vh] overflow-y-auto py-1 pr-1">
              <div className="mb-2 normal-case text-(--hud-text-dim)">Editor-only reference image rendered beneath the grid.</div>
              <label className="mb-2 block font-bold text-cyan-200">Template image
                <select
                  aria-label="Template image"
                  value={draft.tracingTemplate?.imagePath ?? ""}
                  disabled={templateBusy}
                  onChange={(event) => void selectTracingTemplate(event.target.value)}
                  className="mt-1 h-8 w-full border border-(--hud-border) bg-slate-950 px-2 text-[9px] normal-case text-slate-100 disabled:opacity-40"
                >
                  <option value="">Choose an image</option>
                  {draft.tracingTemplate && !availableTemplates.some((template) => template.imagePath === draft.tracingTemplate?.imagePath) && <option value={draft.tracingTemplate.imagePath}>Current template</option>}
                  {availableTemplates.map((template) => <option key={template.id} value={template.imagePath}>{template.label}{template.source === "uploaded" ? " (uploaded)" : ""}</option>)}
                </select>
              </label>
              <label className="mb-2 block border border-cyan-600 px-2 py-2 text-center font-bold text-cyan-100">
                {templateBusy ? "Working…" : "Upload image"}
                <input
                  aria-label="Upload tracing template"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={templateBusy}
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void uploadTracingTemplate(file);
                  }}
                />
              </label>
              {draft.tracingTemplate && <>
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={tracingTemplateEditing}
                    disabled={!draft.tracingTemplate.visible}
                    onClick={() => {
                      setTracingTemplateEditing((current) => !current);
                      setPlacementKind(null);
                      setEnemyKind(null);
                      setWallDraft(null);
                      setPlacementHover(null);
                      setEnemyHover(null);
                    }}
                    className={`h-8 border font-bold disabled:opacity-40 ${tracingTemplateEditing ? "border-cyan-200 bg-cyan-300/20 text-cyan-50" : "border-cyan-600 text-cyan-100"}`}
                  >
                    {tracingTemplateEditing ? "Finish adjusting" : "Adjust on map"}
                  </button>
                  <button type="button" disabled={templateBusy} onClick={() => void resetTracingTemplateFit()} className="h-8 border border-amber-500 font-bold text-amber-100 disabled:opacity-40">Reset to fit</button>
                </div>
                <div className="mb-2 grid grid-cols-2 gap-2">
                  {(["x", "y", "width", "height", "rotation"] as const).map((field) => <label key={field} className="font-bold text-cyan-200">{field}
                    <input
                      aria-label={`Template ${field}`}
                      type="number"
                      min={field === "width" || field === "height" ? 0.25 : undefined}
                      step="0.1"
                      value={Number(draft.tracingTemplate?.[field].toFixed(3))}
                      onChange={(event) => updateTracingTemplateNumber(field, Number.parseFloat(event.target.value))}
                      className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-2 text-[9px] normal-case text-slate-100"
                    />
                  </label>)}
                  <label className="flex items-end">
                    <span className="flex h-7 w-full items-center gap-2 border border-(--hud-border) px-2 font-bold text-cyan-200">
                      <input type="checkbox" checked={draft.tracingTemplate.lockAspectRatio} onChange={(event) => updateTracingTemplate({ lockAspectRatio: event.target.checked })} />
                      Lock ratio
                    </span>
                  </label>
                </div>
                <label className="mb-2 block font-bold text-cyan-200">Opacity · {Math.round(draft.tracingTemplate.opacity * 100)}%
                  <input aria-label="Template opacity" type="range" min="0" max="1" step="0.05" value={draft.tracingTemplate.opacity} onChange={(event) => updateTracingTemplate({ opacity: Number.parseFloat(event.target.value) })} className="mt-1 w-full" />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex h-8 items-center gap-2 border border-(--hud-border) px-2 font-bold text-cyan-200">
                    <input
                      type="checkbox"
                      checked={draft.tracingTemplate.visible}
                      onChange={(event) => {
                        updateTracingTemplate({ visible: event.target.checked });
                        if (!event.target.checked) setTracingTemplateEditing(false);
                      }}
                    />
                    Visible
                  </label>
                  <button type="button" onClick={() => { setDraft((current) => ({ ...current, tracingTemplate: undefined })); setTracingTemplateEditing(false); }} className="h-8 border border-red-500 font-bold text-red-100">Remove</button>
                </div>
              </>}
              {templateMessage && <div role="status" className={`mt-2 border p-2 normal-case ${templateMessage.kind === "error" ? "border-red-500/70 bg-red-950/60 text-red-100" : "border-emerald-500/70 bg-emerald-950/50 text-emerald-100"}`}>{templateMessage.text}</div>}
            </div>
          </FloatingPluginHud>
          <FloatingPluginHud title="Terrain Palette" layout={terrainPaletteLayout} onLayoutChange={setTerrainPaletteLayout} className="w-56 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
            <div aria-label="Terrain options" className="grid max-h-[65vh] grid-cols-2 gap-1.5 overflow-y-auto overscroll-contain py-1 pr-1">
              <button type="button" aria-pressed={placementKind === null && enemyKind === null} onClick={() => { setPlacementKind(null); setEnemyKind(null); setWallDraft(null); setRaisedAreaDraft(null); setPlacementHover(null); setEnemyHover(null); setPlacementError(null); }} className={`min-h-10 border px-2 py-2 text-[8px] font-bold uppercase tracking-wider ${placementKind === null && enemyKind === null ? "border-cyan-200 bg-cyan-300/20 text-cyan-50" : "border-(--hud-border) text-(--hud-text) hover:border-(--hud-accent)"}`}>Pointer</button>
              <button type="button" aria-pressed={placementKind === FIRE_TOOL_ID} onClick={() => { setPlacementKind(FIRE_TOOL_ID); setEnemyKind(null); setSelectedPlacementId(null); setSelectedEnemyId(null); setSelectedFire(null); setRaisedAreaDraft(null); setPlacementHover(null); setEnemyHover(null); setPlacementError(null); }} className={`min-h-10 border px-2 py-2 text-[8px] font-bold uppercase tracking-wider ${placementKind === FIRE_TOOL_ID ? "border-orange-200 bg-orange-300/20 text-orange-50" : "border-(--hud-border) text-orange-200 hover:border-orange-300"}`}>Fire</button>
              <button type="button" aria-pressed={placementKind === WALL_TOOL_ID} onClick={() => { setPlacementKind(WALL_TOOL_ID); setEnemyKind(null); setSelectedPlacementId(null); setSelectedEnemyId(null); setSelectedWallId(null); setSelectedFire(null); setWallDraft(null); setRaisedAreaDraft(null); setPlacementHover(null); setEnemyHover(null); setPlacementError(null); }} className={`min-h-10 border px-2 py-2 text-[8px] font-bold uppercase tracking-wider ${placementKind === WALL_TOOL_ID ? "border-slate-100 bg-slate-300/20 text-white" : "border-(--hud-border) text-slate-200 hover:border-slate-100"}`}>Wall</button>
              <button type="button" aria-pressed={placementKind === CURVED_WALL_TOOL_ID} onClick={() => { setPlacementKind(CURVED_WALL_TOOL_ID); setEnemyKind(null); setSelectedPlacementId(null); setSelectedEnemyId(null); setSelectedWallId(null); setSelectedPortalId(null); setSelectedFire(null); setWallDraft(null); setRaisedAreaDraft(null); setPlacementHover(null); setEnemyHover(null); setPlacementError(null); }} className={`min-h-10 border px-2 py-2 text-[8px] font-bold uppercase tracking-wider ${placementKind === CURVED_WALL_TOOL_ID ? "border-purple-200 bg-purple-300/20 text-purple-50" : "border-(--hud-border) text-purple-200 hover:border-purple-200"}`}>Curved Wall</button>
              <button type="button" aria-pressed={placementKind === RAISED_AREA_TOOL_ID} onClick={() => { setPlacementKind(RAISED_AREA_TOOL_ID); setEnemyKind(null); setSelectedPlacementId(null); setSelectedEnemyId(null); setSelectedWallId(null); setSelectedPortalId(null); setSelectedFire(null); setWallDraft(null); setPlacementError(null); }} className={`min-h-10 border px-2 py-2 text-[8px] font-bold uppercase tracking-wider ${placementKind === RAISED_AREA_TOOL_ID ? "border-cyan-200 bg-cyan-300/20 text-cyan-50" : "border-(--hud-border) text-cyan-200 hover:border-cyan-200"}`}>Raised Area</button>
              <button type="button" aria-pressed={placementKind === RAISED_AREA_CURVE_TOOL_ID} onClick={() => { setPlacementKind(RAISED_AREA_CURVE_TOOL_ID); setEnemyKind(null); setSelectedPlacementId(null); setSelectedEnemyId(null); setSelectedWallId(null); setSelectedPortalId(null); setSelectedFire(null); setWallDraft(null); setPlacementError(null); }} className={`min-h-10 border px-2 py-2 text-[8px] font-bold uppercase tracking-wider ${placementKind === RAISED_AREA_CURVE_TOOL_ID ? "border-purple-200 bg-purple-300/20 text-purple-50" : "border-(--hud-border) text-purple-200 hover:border-purple-200"}`}>Raised Curve</button>
              {raisedAreaDraft && <div className="col-span-2 border border-cyan-700 bg-cyan-950/40 p-2 normal-case leading-relaxed text-cyan-100">
                Click grid vertices to continue. Switch between Raised Area and Raised Curve for each segment. Click the cyan starting point to close.
                <button type="button" onClick={() => { setRaisedAreaDraft(null); setDragRaisedAreaControl(null); setPlacementError(null); }} className="mt-2 h-7 w-full border border-red-400 font-bold uppercase text-red-100">Cancel outline</button>
              </div>}
              {([
                { id: STAIRS_TOOL_ID, label: "Stairs", color: "cyan" },
                { id: LADDER_TOOL_ID, label: "Ladder", color: "amber" },
                { id: RAMP_TOOL_ID, label: "Ramp", color: "purple" },
              ] as const).map((tool) => <button
                type="button"
                key={tool.id}
                aria-pressed={placementKind === tool.id}
                onClick={() => {
                  setPlacementKind(tool.id);
                  setEnemyKind(null);
                  setSelectedPlacementId(null);
                  setSelectedEnemyId(null);
                  setSelectedWallId(null);
                  setSelectedRaisedAreaId(null);
                  setSelectedElevationTransitionId(null);
                  setSelectedPortalId(null);
                  setSelectedFire(null);
                  setWallDraft(null);
                  setRaisedAreaDraft(null);
                  setRampDraft(null);
                  setPlacementHover(null);
                  setEnemyHover(null);
                  setPlacementError(null);
                }}
                className={`min-h-10 border px-2 py-2 text-[8px] font-bold uppercase tracking-wider ${placementKind === tool.id ? "border-fuchsia-200 bg-fuchsia-300/20 text-fuchsia-50" : "border-(--hud-border) text-fuchsia-200 hover:border-fuchsia-200"}`}
              >{tool.label}</button>)}
              {rampDraft && <div className="col-span-2 border border-purple-600 bg-purple-950/40 p-2 normal-case leading-relaxed text-purple-100">
                Move straight outward over at least two lower-level squares, then click to place the ramp.
                <button type="button" onClick={() => { setRampDraft(null); setPlacementError(null); }} className="mt-2 h-7 w-full border border-red-400 font-bold uppercase text-red-100">Cancel ramp</button>
              </div>}
              <button type="button" aria-pressed={placementKind === DOOR_TOOL_ID} onClick={() => { setPlacementKind(DOOR_TOOL_ID); setEnemyKind(null); setSelectedPlacementId(null); setSelectedEnemyId(null); setSelectedWallId(null); setSelectedPortalId(null); setSelectedFire(null); setPortalHover(null); setPlacementError(null); }} className={`min-h-10 border px-2 py-2 text-[8px] font-bold uppercase tracking-wider ${placementKind === DOOR_TOOL_ID ? "border-emerald-200 bg-emerald-300/20 text-emerald-50" : "border-(--hud-border) text-emerald-200 hover:border-emerald-200"}`}>Door</button>
              <button type="button" aria-pressed={placementKind === WALL_IRIS_TOOL_ID} onClick={() => { setPlacementKind(WALL_IRIS_TOOL_ID); setEnemyKind(null); setSelectedPlacementId(null); setSelectedEnemyId(null); setSelectedWallId(null); setSelectedPortalId(null); setSelectedFire(null); setPortalHover(null); setPlacementError(null); }} className={`min-h-10 border px-2 py-2 text-[8px] font-bold uppercase tracking-wider ${placementKind === WALL_IRIS_TOOL_ID ? "border-amber-200 bg-amber-300/20 text-amber-50" : "border-(--hud-border) text-amber-200 hover:border-amber-200"}`}>Wall Iris Valve</button>
              {tacticalTerrainPalette.map((item) => <button type="button" aria-pressed={placementKind === item.id} key={item.id} onClick={() => { setPlacementKind(item.id); setEnemyKind(null); setSelectedPlacementId(null); setSelectedEnemyId(null); setSelectedPortalId(null); setSelectedFire(null); setPlacementHover(null); setEnemyHover(null); setPortalHover(null); setPlacementError(null); }} className={`min-h-10 border px-2 py-2 text-[8px] font-bold uppercase tracking-wider ${placementKind === item.id ? "border-amber-200 bg-amber-300/20 text-amber-50" : "border-(--hud-border) text-(--hud-text) hover:border-(--hud-accent)"}`}>{item.label}</button>)}
            </div>
          </FloatingPluginHud>
          <FloatingPluginHud title="Enemy Palette" layout={enemyPaletteLayout} onLayoutChange={setEnemyPaletteLayout} className="w-56 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
            <div aria-label="Enemy options" className="grid grid-cols-1 gap-1.5 py-1">
              <button type="button" aria-pressed={placementKind === null && enemyKind === null} onClick={() => { setPlacementKind(null); setEnemyKind(null); setPlacementHover(null); setEnemyHover(null); setPlacementError(null); }} className={`min-h-9 border px-2 py-2 font-bold ${placementKind === null && enemyKind === null ? "border-cyan-200 bg-cyan-300/20 text-cyan-50" : "border-(--hud-border) text-(--hud-text)"}`}>Pointer</button>
              {tacticalEnemyPalette.map((enemy) => <button type="button" key={enemy.id} aria-pressed={enemyKind === enemy.id} onClick={() => { setEnemyKind(enemy.id); setPlacementKind(null); setSelectedPlacementId(null); setSelectedOperationId(null); setSelectedEnemyId(null); setSelectedFire(null); setPlacementHover(null); setEnemyHover(null); setPlacementError(null); }} className={`min-h-11 border px-2 py-2 text-left ${enemyKind === enemy.id ? "border-red-200 bg-red-300/20 text-red-50" : "border-(--hud-border) text-(--hud-text) hover:border-red-300"}`}>
                <span className="block font-bold">{enemy.label}</span><span className="mt-1 block normal-case text-(--hud-text-dim)">{enemy.equipment}</span>
              </button>)}
            </div>
          </FloatingPluginHud>
          {selectedPlacement && selectedHasTerminal && <FloatingPluginHud title={selectedIsInteractiveHuman ? "Human Interaction Editor" : "Console Editor"} layout={consoleEditorLayout} onLayoutChange={setConsoleEditorLayout} className="w-80 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
            <div className="max-h-[70vh] overflow-y-auto overscroll-contain py-1 pr-1">
              <div className="mb-2 text-[8px] text-(--hud-text-dim)">{selectedPlacement.id}</div>
              <label className="mb-2 block font-bold text-cyan-200">{selectedIsInteractiveHuman ? "Human name" : "Console name"}
                <input value={selectedPlacement.objectSettings?.terminal?.label ?? (selectedIsInteractiveHuman ? "Interactive Human" : selectedPlacement.terrainDefinitionId === "console-1x1" ? "Console" : "Control Room Console")} onChange={(event) => updateSelectedTerminal({ label: event.target.value })} className="mt-1 h-8 w-full border border-(--hud-border) bg-slate-950 px-2 text-[10px] normal-case text-slate-100 outline-none focus:border-cyan-400" />
              </label>
              {selectedIsInteractiveHuman && <button type="button" aria-label="Rotate interactive human 90 degrees" onClick={() => updateSelectedTerminal({ facing: ((((selectedPlacement.objectSettings?.terminal?.facing ?? 0) + 90) % 360) as TacticalTerrainPlacement["rotation"]) })} className="mb-3 h-8 w-full border border-purple-400 font-bold text-purple-100">Facing {facingName((((selectedPlacement.objectSettings?.terminal?.facing ?? 0) + selectedPlacement.rotation) % 360) as TacticalTerrainPlacement["rotation"])} · Rotate 90°</button>}
              <div className={`mb-3 grid items-end gap-2 ${selectedIsInteractiveHuman ? "grid-cols-1" : "grid-cols-[1fr_auto]"}`}>
                {!selectedIsInteractiveHuman && <label className="block font-bold text-cyan-200">Console type
                  <select value={selectedPlacement.objectSettings?.terminal?.terminalKind ?? "generic"} onChange={(event) => updateSelectedTerminal({ terminalKind: event.target.value as TacticalTerminalKind })} className="mt-1 h-8 w-full border border-(--hud-border) bg-slate-950 px-2 text-[9px] normal-case text-slate-100">
                    {(["generic", "navigation", "engineering", "security", "communications"] as const).map((kind) => <option key={kind} value={kind}>{kind}</option>)}
                  </select>
                </label>}
                <label className="flex h-8 items-center gap-1 border border-(--hud-border) px-2 font-bold text-cyan-200">
                  <input type="checkbox" checked={selectedPlacement.objectSettings?.terminal?.operational ?? true} onChange={(event) => updateSelectedTerminal({ operational: event.target.checked })} /> Operational
                </label>
              </div>

              {selectedIsInteractiveHuman && <details className="mb-3 border border-purple-500/60" open>
                <summary className="cursor-pointer px-2 py-1.5 font-bold text-purple-200">Combat profile after transformation</summary>
                <div className="grid grid-cols-2 gap-2 border-t border-purple-500/40 p-2">
                  <label className="font-bold text-purple-200">Weapon
                    <select value={selectedHumanCombatProfile.weaponId} onChange={(event) => updateSelectedHumanCombatProfile({ weaponId: event.target.value as TacticalHumanWeaponId })} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[8px] normal-case text-slate-100">{tacticalHumanWeaponOptions.map((weapon) => <option key={weapon.id} value={weapon.id}>{weapon.label}</option>)}</select>
                  </label>
                  <label className="font-bold text-purple-200">Weapon skill
                    <input type="number" value={selectedHumanCombatProfile.weaponSkill} onChange={(event) => updateSelectedHumanCombatProfile({ weaponSkill: Number.parseInt(event.target.value, 10) || 0 })} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[9px] text-slate-100" />
                  </label>
                  <label className="font-bold text-purple-200">Armor
                    <select value={selectedHumanCombatProfile.armorId} onChange={(event) => updateSelectedHumanCombatProfile({ armorId: event.target.value as TacticalHumanArmorId })} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[8px] normal-case text-slate-100">{tacticalHumanArmorOptions.map((armor) => <option key={armor.id} value={armor.id}>{armor.label}</option>)}</select>
                  </label>
                  <label className="font-bold text-purple-200">Melee weapon
                    <input value={selectedHumanCombatProfile.meleeWeaponName} onChange={(event) => updateSelectedHumanCombatProfile({ meleeWeaponName: event.target.value })} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[9px] normal-case text-slate-100" />
                  </label>
                  <label className="font-bold text-purple-200">Melee penetration
                    <input type="number" value={selectedHumanCombatProfile.meleePenetration} onChange={(event) => updateSelectedHumanCombatProfile({ meleePenetration: Number.parseInt(event.target.value, 10) || 0 })} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[9px] text-slate-100" />
                  </label>
                  <label className="font-bold text-purple-200">Melee rating
                    <input type="number" value={selectedHumanCombatProfile.meleeRating} onChange={(event) => updateSelectedHumanCombatProfile({ meleeRating: Number.parseInt(event.target.value, 10) || 0 })} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[9px] text-slate-100" />
                  </label>
                  <label className="font-bold text-purple-200">Morale
                    <input type="number" value={selectedHumanCombatProfile.moraleFactor} onChange={(event) => updateSelectedHumanCombatProfile({ moraleFactor: Number.parseInt(event.target.value, 10) || 0 })} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[9px] text-slate-100" />
                  </label>
                  <label className="font-bold text-purple-200">Leadership
                    <input type="number" value={selectedHumanCombatProfile.leadershipRating} onChange={(event) => updateSelectedHumanCombatProfile({ leadershipRating: Number.parseInt(event.target.value, 10) || 0 })} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[9px] text-slate-100" />
                  </label>
                  <div className="col-span-2 border-t border-purple-500/40 pt-2">
                    <div className="mb-1 flex items-center justify-between"><span className="font-bold text-purple-200">Skills</span><button type="button" onClick={() => updateSelectedHumanCombatProfile({ skills: [...selectedHumanCombatProfile.skills, { name: "Skill", level: 0 }] })} className="border border-emerald-600 px-2 py-1 text-emerald-100">Add skill</button></div>
                    {selectedHumanCombatProfile.skills.map((skill, index) => <div key={`${index}:${skill.name}`} className="mb-1 grid grid-cols-[1fr_3rem_auto] gap-1">
                      <input aria-label={`Combat skill ${index + 1}`} value={skill.name} onChange={(event) => updateSelectedHumanCombatProfile({ skills: selectedHumanCombatProfile.skills.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) })} className="h-7 border border-(--hud-border) bg-slate-950 px-1 text-[9px] normal-case text-slate-100" />
                      <input aria-label={`Combat skill level ${index + 1}`} type="number" value={skill.level} onChange={(event) => updateSelectedHumanCombatProfile({ skills: selectedHumanCombatProfile.skills.map((item, itemIndex) => itemIndex === index ? { ...item, level: Number.parseInt(event.target.value, 10) || 0 } : item) })} className="h-7 border border-(--hud-border) bg-slate-950 px-1 text-[9px] text-slate-100" />
                      <button type="button" onClick={() => updateSelectedHumanCombatProfile({ skills: selectedHumanCombatProfile.skills.filter((_, itemIndex) => itemIndex !== index) })} className="border border-red-600 px-1 text-red-200">Remove</button>
                    </div>)}
                  </div>
                </div>
              </details>}

              <div className="border-t border-(--hud-border) pt-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-cyan-200">{selectedIsInteractiveHuman ? "Tasks involving this person" : "Tasks at this console"}</div>
                    <div className="mt-1 normal-case text-(--hud-text-dim)">A task is what a character can perform {selectedIsInteractiveHuman ? "with this person" : "at this console"}.</div>
                  </div>
                  <button type="button" onClick={addConsoleOperation} className="shrink-0 border border-emerald-500 px-2 py-1.5 font-bold text-emerald-100">{victoryTaskRequired ? "Add victory task" : "Add operation"}</button>
                </div>
                {selectedConsoleOperations.length === 0 && <div className="mb-2 border border-amber-500/70 bg-amber-950/50 p-2 normal-case text-amber-100">This {selectedIsInteractiveHuman ? "person" : "console"} has no task. Add a victory task before saving or playtesting.</div>}
                <div className="mb-2 flex flex-wrap gap-1">
                  {selectedConsoleOperations.map((operation) => <button type="button" key={operation.id} onClick={() => setSelectedOperationId(operation.id)} className={`border px-2 py-1.5 normal-case ${selectedOperationId === operation.id ? "border-amber-300 bg-amber-950/50 text-amber-100" : "border-(--hud-border) text-(--hud-text)"}`}>{operation.label}</button>)}
                </div>

                {selectedOperation?.consolePlacementId === selectedPlacement.id && <div className="border border-amber-700/70 p-2">
                  <label className="mb-2 block font-bold text-amber-200">Task name
                    <input value={selectedOperation.label} onChange={(event) => updateConsoleOperation(selectedOperation.id, (operation) => ({ ...operation, label: event.target.value }))} className="mt-1 h-8 w-full border border-(--hud-border) bg-slate-950 px-2 text-[10px] normal-case text-slate-100" />
                  </label>
                  <div className="mb-1 font-bold text-amber-200">Required checks, in order</div>
                  {selectedOperation.checks.map((check, index) => <div key={check.id} className="mb-2 border border-(--hud-border) p-1.5">
                    <div className="mb-1 text-(--hud-text-dim)">Check {index + 1}</div>
                    <label className="mb-1 block font-bold text-amber-200">Skill
                      <input aria-label={`Skill for check ${index + 1}`} list="interaction-skill-options" value={check.skill} onChange={(event) => updateConsoleOperation(selectedOperation.id, (operation) => ({ ...operation, checks: operation.checks.map((item) => item.id === check.id ? { ...item, skill: event.target.value } : item) }))} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[9px] normal-case text-slate-100" />
                    </label>
                    <div className="grid grid-cols-[1fr_4rem] gap-1">
                      <label className="font-bold text-amber-200">Difficulty
                        <select aria-label={`Difficulty for check ${index + 1}`} value={check.difficulty} onChange={(event) => updateConsoleOperation(selectedOperation.id, (operation) => ({ ...operation, checks: operation.checks.map((item) => item.id === check.id ? { ...item, difficulty: event.target.value as TravellerTaskDifficulty } : item) }))} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[8px] text-slate-100">
                          {TRAVELLER_TASK_DIFFICULTIES.map((difficulty) => <option key={difficulty.id} value={difficulty.id}>{difficulty.label} {difficulty.target}+</option>)}
                        </select>
                      </label>
                      <label className="font-bold text-amber-200">AP cost
                        <input aria-label={`AP cost for check ${index + 1}`} type="number" min="1" max="6" value={check.apCost} onChange={(event) => updateConsoleOperation(selectedOperation.id, (operation) => ({ ...operation, checks: operation.checks.map((item) => item.id === check.id ? { ...item, apCost: Number.parseInt(event.target.value, 10) || 1 } : item) }))} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[8px] text-slate-100" />
                      </label>
                    </div>
                    <div className="mt-1 grid grid-cols-3 gap-1">
                      <button type="button" disabled={index === 0} onClick={() => updateConsoleOperation(selectedOperation.id, (operation) => { const checks = [...operation.checks]; [checks[index - 1], checks[index]] = [checks[index], checks[index - 1]]; return { ...operation, checks }; })} className="border border-(--hud-border) disabled:opacity-30">Up</button>
                      <button type="button" disabled={index === selectedOperation.checks.length - 1} onClick={() => updateConsoleOperation(selectedOperation.id, (operation) => { const checks = [...operation.checks]; [checks[index], checks[index + 1]] = [checks[index + 1], checks[index]]; return { ...operation, checks }; })} className="border border-(--hud-border) disabled:opacity-30">Down</button>
                      <button type="button" disabled={selectedOperation.checks.length === 1} onClick={() => updateConsoleOperation(selectedOperation.id, (operation) => ({ ...operation, checks: operation.checks.filter((item) => item.id !== check.id) }))} className="border border-red-600 text-red-200 disabled:opacity-30">Remove</button>
                    </div>
                  </div>)}
                  <button type="button" onClick={() => updateConsoleOperation(selectedOperation.id, (operation) => { const suffix = operation.checks.length + 1; return { ...operation, checks: [...operation.checks, { id: `${operation.id}-check-${suffix}`, skill: selectedIsInteractiveHuman ? "Persuade" : "Security", difficulty: "average", apCost: 6 }] }; })} className="mb-2 w-full border border-emerald-600 py-1.5 text-emerald-100">Add task check</button>
                  {selectedIsInteractiveHuman && <div className="mb-2 grid grid-cols-2 gap-2 border border-purple-500/60 p-2">
                    <label className="font-bold text-purple-200">Success becomes
                      <select value={selectedOperation.successTransformation ?? "none"} onChange={(event) => updateConsoleOperation(selectedOperation.id, (operation) => ({ ...operation, successTransformation: event.target.value === "none" ? undefined : event.target.value as "ally" | "enemy" }))} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[8px] text-slate-100"><option value="none">No transformation</option><option value="ally">Ally</option><option value="enemy">Enemy</option></select>
                    </label>
                    <label className="font-bold text-purple-200">Failure becomes
                      <select value={selectedOperation.failureTransformation ?? "none"} onChange={(event) => updateConsoleOperation(selectedOperation.id, (operation) => ({ ...operation, failureTransformation: event.target.value === "none" ? undefined : event.target.value as "ally" | "enemy" }))} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[8px] text-slate-100"><option value="none">No transformation</option><option value="ally">Ally</option><option value="enemy">Enemy</option></select>
                    </label>
                    <div className="col-span-2 normal-case text-(--hud-text-dim)">A transformation resolves this interaction permanently. The new combatant waits for its side’s next phase.</div>
                  </div>}
                  <label className="mb-2 block font-bold text-amber-200">When all checks succeed
                    <select value={selectedOperation.result.type} onChange={(event) => { const victory = event.target.value === "victory"; setConsoleVictory((current) => ({ ...current, operations: current.operations.map((operation) => operation.id === selectedOperation.id ? { ...operation, result: victory ? { type: "victory" } : { type: "unlock", operationIds: [] } } : victory ? { ...operation, prerequisites: { ...operation.prerequisites, operationIds: operation.prerequisites.operationIds.filter((id) => id !== selectedOperation.id) } } : operation) })); }} className="mt-1 h-8 w-full border border-(--hud-border) bg-slate-950 px-2 text-[9px] text-slate-100"><option value="victory">Win the scenario</option><option value="unlock">Unlock other tasks</option></select>
                  </label>

                  <details className="mb-2 border border-(--hud-border)">
                    <summary className="cursor-pointer px-2 py-1.5 font-bold text-(--hud-text-dim)">Advanced chaining and critical effects</summary>
                    <div className="border-t border-(--hud-border) p-2">
                      <label className="mb-2 block font-bold text-amber-200">Available after
                        <select value={selectedOperation.prerequisites.mode} onChange={(event) => updateConsoleOperation(selectedOperation.id, (operation) => ({ ...operation, prerequisites: { ...operation.prerequisites, mode: event.target.value as "any" | "all" } }))} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[8px] text-slate-100"><option value="any">Any selected task</option><option value="all">All selected tasks</option></select>
                      </label>
                      <div className="mb-2 max-h-24 overflow-y-auto border border-(--hud-border) p-1">
                        {consoleVictory.operations.filter((operation) => operation.id !== selectedOperation.id && operation.result.type === "unlock").map((candidate) => <label key={candidate.id} className="mb-1 flex items-center gap-1 normal-case text-(--hud-text)"><input type="checkbox" checked={selectedOperation.prerequisites.operationIds.includes(candidate.id)} onChange={(event) => { const checked = event.target.checked; setConsoleVictory((current) => ({ ...current, operations: current.operations.map((operation) => {
                          if (operation.id === selectedOperation.id) return { ...operation, prerequisites: { ...operation.prerequisites, operationIds: checked ? [...new Set([...operation.prerequisites.operationIds, candidate.id])] : operation.prerequisites.operationIds.filter((id) => id !== candidate.id) } };
                          if (operation.id === candidate.id && operation.result.type === "unlock") return { ...operation, result: { ...operation.result, operationIds: checked ? [...new Set([...operation.result.operationIds, selectedOperation.id])] : operation.result.operationIds.filter((id) => id !== selectedOperation.id) } };
                          return operation;
                        }) })); }} /> {candidate.label}</label>)}
                        {consoleVictory.operations.filter((operation) => operation.id !== selectedOperation.id && operation.result.type === "unlock").length === 0 && <div className="normal-case text-(--hud-text-dim)">No predecessor tasks are available.</div>}
                      </div>
                      {selectedOperation.result.type === "unlock" && <div className="mb-2">
                        <div className="mb-1 font-bold text-amber-200">Tasks unlocked</div>
                        <div className="max-h-24 overflow-y-auto border border-(--hud-border) p-1">{consoleVictory.operations.filter((operation) => operation.id !== selectedOperation.id).map((candidate) => <label key={candidate.id} className="mb-1 flex items-center gap-1 normal-case text-(--hud-text)"><input type="checkbox" checked={selectedOperation.result.type === "unlock" && selectedOperation.result.operationIds.includes(candidate.id)} onChange={(event) => { const checked = event.target.checked; setConsoleVictory((current) => ({ ...current, operations: current.operations.map((operation) => {
                          if (operation.id === selectedOperation.id && operation.result.type === "unlock") return { ...operation, result: { ...operation.result, operationIds: checked ? [...new Set([...operation.result.operationIds, candidate.id])] : operation.result.operationIds.filter((id) => id !== candidate.id) } };
                          if (operation.id === candidate.id) return { ...operation, prerequisites: { ...operation.prerequisites, operationIds: checked ? [...new Set([...operation.prerequisites.operationIds, selectedOperation.id])] : operation.prerequisites.operationIds.filter((id) => id !== selectedOperation.id) } };
                          return operation;
                        }) })); }} /> {candidate.label}</label>)}</div>
                      </div>}
                      <div className="grid grid-cols-2 gap-1">
                        <label className="font-bold text-amber-200">Critical success next DM<input type="number" value={selectedOperation.criticalSuccessNextCheckModifier ?? 0} onChange={(event) => updateConsoleOperation(selectedOperation.id, (operation) => ({ ...operation, criticalSuccessNextCheckModifier: Number.parseInt(event.target.value, 10) || 0 }))} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[9px] text-slate-100" /></label>
                        <label className="font-bold text-amber-200">Critical failure next DM<input type="number" value={selectedOperation.criticalFailureNextCheckModifier ?? 0} onChange={(event) => updateConsoleOperation(selectedOperation.id, (operation) => ({ ...operation, criticalFailureNextCheckModifier: Number.parseInt(event.target.value, 10) || 0 }))} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[9px] text-slate-100" /></label>
                      </div>
                    </div>
                  </details>
                  <button type="button" onClick={deleteSelectedOperation} className="w-full border border-red-500 py-1.5 font-bold text-red-100">Delete task</button>
                </div>}
              </div>
              <datalist id="interaction-skill-options">{INTERACTION_SKILLS.map((skill) => <option key={skill} value={skill} />)}</datalist>
            </div>
          </FloatingPluginHud>}
          {selectedEnemy && <FloatingPluginHud title="Enemy Editor" layout={enemyEditorLayout} onLayoutChange={setEnemyEditorLayout} className="w-64 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
            <div className="py-1">
              <div className="mb-3 flex gap-2">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden border border-red-500/60 bg-black">
                  <Image src={selectedEnemy.avatarPath} alt="" fill sizes="64px" className="object-cover" />
                </div>
                <div className="min-w-0 normal-case">
                  <div className="truncate font-bold text-red-100">{tacticalEnemyPalette.find((enemy) => enemy.id === selectedEnemy.type)?.label}</div>
                  <div className="mt-1 text-(--hud-text-dim)">{tacticalEnemyPalette.find((enemy) => enemy.id === selectedEnemy.type)?.equipment}</div>
                  <div className="mt-1 text-(--hud-text-dim)">Square {selectedEnemy.position.x}, {selectedEnemy.position.y}</div>
                </div>
              </div>
              <label className="mb-3 block font-bold text-red-200">Enemy name
                <input value={selectedEnemy.name} onChange={(event) => updateSelectedEnemyName(event.target.value)} className="mt-1 h-8 w-full border border-(--hud-border) bg-slate-950 px-2 text-[10px] normal-case text-slate-100 outline-none focus:border-red-400" />
              </label>
              <button type="button" aria-label="Rotate enemy 90 degrees" onClick={rotateSelectedEnemy} className="mb-3 h-8 w-full border border-amber-400 font-bold text-amber-100">Facing {facingName(selectedEnemy.facing ?? "north")} · Rotate 90°</button>
              <button type="button" onClick={deleteSelectedEnemy} className="w-full border border-red-500 py-1.5 font-bold text-red-100">Delete enemy</button>
              <div className="mt-2 normal-case text-(--hud-text-dim)">You can also press Delete while this enemy is selected.</div>
            </div>
          </FloatingPluginHud>}
        </PluginHudLayer>
      </section>
    </div>
  </main>;
};

export default TacticalScenarioEditorClient;
