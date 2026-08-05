"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import {
  resolveTacticalScenarioTerrain,
  tacticalTerrainPalette,
  type TacticalEnemyType,
  type TacticalNaturalTerrainPlacement,
  type TacticalScenarioDefinitionFile,
  type TacticalTerrainPlacement,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { tacticalDrawnRaisedAreaCells } from "@/plugins/characterCombat/tacticalDrawnRaisedAreas";
import {
  tacticalElevationEdgeCandidates,
  tacticalLadderMountForEdge,
  tacticalNearestElevationEdgeCandidate,
  tacticalRampPlacementPreview,
} from "@/plugins/characterCombat/tacticalElevationTransitions";
import { tacticalNaturalTerrainFootprintCells } from "@/plugins/characterCombat/tacticalNaturalTerrain";
import { useTacticalEditorAreaCells } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorAreaCells";
import { useTacticalEditorViewport } from "@/plugins/characterCombat/editor/components/TacticalEditorViewport";
import TacticalEditorTerrainCellsLayer from "@/plugins/characterCombat/editor/components/TacticalEditorTerrainCellsLayer";
import TacticalEditorElevationLayer from "@/plugins/characterCombat/editor/components/TacticalEditorElevationLayer";
import TacticalEditorTracingTemplateLayer from "@/plugins/characterCombat/editor/components/TacticalEditorTracingTemplateLayer";
import TacticalEditorLegacyCircleLayer from "@/plugins/characterCombat/editor/components/TacticalEditorLegacyCircleLayer";
import TacticalEditorNaturalTerrainLayer from "@/plugins/characterCombat/editor/components/TacticalEditorNaturalTerrainLayer";
import TacticalEditorWallsLayer from "@/plugins/characterCombat/editor/components/TacticalEditorWallsLayer";
import TacticalEditorWallPortalsLayer from "@/plugins/characterCombat/editor/components/TacticalEditorWallPortalsLayer";
import TacticalEditorObjectsLayer from "@/plugins/characterCombat/editor/components/TacticalEditorObjectsLayer";
import TacticalEditorPlacementPreviewLayer, {
  type TacticalEditorPlacementPreview,
} from "@/plugins/characterCombat/editor/components/TacticalEditorPlacementPreviewLayer";
import {
  TacticalEditorBoundaryDraftPreview,
  TacticalEditorCircleDraftPreview,
  TacticalEditorRectangleDraftPreview,
  type TacticalEditorPortalPreview,
  type TacticalEditorRectanglePreview,
} from "@/plugins/characterCombat/editor/components/TacticalEditorDrawingPreviewLayer";
import {
  panTacticalEditorCamera,
  snapTacticalEditorPoint,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorCamera";
import type {
  AreaAnchorDrag,
  AreaCubicControlDrag,
  CircleDraft,
  CirclePrimitiveDrag,
  ConstrainedAreaDrag,
  EditorMapPoint,
  NaturalTerrainDrag,
  RaisedAreaControlDrag,
  RaisedAreaDraft,
  RampDraft,
  TracingTemplateCorner,
  TracingTemplateTransformDrag,
  WallControlDrag,
  WallEndpoint,
  WallEndpointDrag,
  WallMoveDrag,
  WallPortalDrag,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";
import {
  CIRCLE_AREA_TOOL_ID,
  CIRCLE_TOOL_ID,
  CURVED_WALL_TOOL_ID,
  FIRE_TOOL_ID,
  PEN_AREA_TOOL_ID,
  RAMP_TOOL_ID,
  RECTANGLE_AREA_TOOL_ID,
  WALL_TOOL_ID,
  areaSegmentSvgPath,
  cellKey,
  defaultNaturalTerrainRadius,
  elevationTransitionKindForTool,
  facingName,
  facingVector,
  gridPoint,
  isAreaTool,
  naturalTerrainKindForTool,
  penAreaSegment,
  placementCandidates,
  sameGridPoint,
  tacticalEditorMarkerInteractionEnabled,
  tacticalEditorPortalPlacementCandidate,
  wallPortalKindForTool,
  type EditorPanDrag,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

const localMapPoint = (event: {
  currentTarget: EventTarget & SVGElement;
  clientX: number;
  clientY: number;
}) => {
  const svg = event.currentTarget instanceof SVGSVGElement
    ? event.currentTarget
    : event.currentTarget.ownerSVGElement;
  const matrix = svg?.getScreenCTM();
  if (!svg || !matrix) return null;
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(matrix.inverse());
};

const DraftPreview = ({ definition, handToolActive, nodeEditActive, selectedAreaAnchor, selectedPlacementId, selectedEnemyId, selectedWallId, selectedRaisedAreaId, selectedPrimitiveId, selectedNaturalTerrainId, selectedElevationTransitionId, selectedPortalId, selectedFire, placementKind, enemyKind, placementHover, enemyHover, portalHover, wallDraft, raisedAreaDraft, circleDraft, rampDraft, dragRaisedAreaControl, dragAreaAnchor, dragAreaCubicControl, dragConstrainedArea, dragCirclePrimitive, dragNaturalTerrain, dragWallEndpoint, dragWallMove, dragWallControl, dragWallPortal, dragTracingTemplate, tracingTemplateEditing, dragPlacement, dragEnemy, selectPlacement, selectEnemy, selectWall, selectRaisedArea, selectAreaAnchor, insertAreaAnchor, selectPrimitive, selectNaturalTerrain, selectElevationTransition, selectPortal, selectFire, hoverPlacement, hoverEnemy, hoverPortal, beginWall, updateWall, finishWall, finishWallInteraction, cancelWall, beginCircle, updateCircle, finishCircle, cancelCircle, beginCirclePrimitiveDrag, updateCirclePrimitiveDrag, finishCirclePrimitiveDrag, beginNaturalTerrainDrag, updateNaturalTerrainDrag, finishNaturalTerrainDrag, createRectangleArea, commitPenNode, closePenArea, hoverRaisedArea, beginOrFinishRamp, beginRaisedAreaControlDrag, reshapeRaisedAreaControl, finishRaisedAreaControlDrag, cancelRaisedAreaControlDrag, beginAreaAnchorDrag, moveAreaAnchor, finishAreaAnchorDrag, cancelAreaAnchorDrag, beginAreaCubicControlDrag, moveAreaCubicControl, finishAreaCubicControlDrag, cancelAreaCubicControlDrag, beginConstrainedAreaDrag, updateConstrainedAreaDrag, finishConstrainedAreaDrag, cancelConstrainedAreaDrag, placeWallPortal, beginWallEndpointDrag, resizeWallEndpoint, finishWallEndpointDrag, cancelWallEndpointDrag, beginWallMove, moveWall, finishWallMove, cancelWallMove, beginWallControlDrag, reshapeWallControl, finishWallControlDrag, cancelWallControlDrag, beginWallPortalDrag, moveWallPortal, finishWallPortalDrag, cancelWallPortalDrag, beginTracingTemplateDrag, transformTracingTemplate, finishTracingTemplateDrag, cancelTracingTemplateDrag, beginDrag, beginEnemyDrag, endDrag, placeTerrain, placeEnemy, moveTerrain, moveEnemy }: {
  definition: TacticalScenarioDefinitionFile;
  handToolActive: boolean;
  nodeEditActive: boolean;
  selectedAreaAnchor: { areaId: string; anchorIndex: number } | null;
  selectedPlacementId: string | null;
  selectedEnemyId: string | null;
  selectedWallId: string | null;
  selectedRaisedAreaId: string | null;
  selectedPrimitiveId: string | null;
  selectedNaturalTerrainId: string | null;
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
  circleDraft: CircleDraft | null;
  rampDraft: RampDraft | null;
  dragRaisedAreaControl: RaisedAreaControlDrag | null;
  dragAreaAnchor: AreaAnchorDrag | null;
  dragAreaCubicControl: AreaCubicControlDrag | null;
  dragConstrainedArea: ConstrainedAreaDrag | null;
  dragCirclePrimitive: CirclePrimitiveDrag | null;
  dragNaturalTerrain: NaturalTerrainDrag | null;
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
  selectAreaAnchor: (selection: { areaId: string; anchorIndex: number } | null) => void;
  insertAreaAnchor: (areaId: string, segmentIndex: number, point: { x: number; y: number }) => void;
  selectPrimitive: (id: string | null) => void;
  selectNaturalTerrain: (id: string | null) => void;
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
  beginCircle: (point: { x: number; y: number }) => void;
  updateCircle: (point: { x: number; y: number }) => void;
  finishCircle: (point: { x: number; y: number }) => void;
  cancelCircle: () => void;
  beginCirclePrimitiveDrag: (id: string, kind: CirclePrimitiveDrag["kind"]) => void;
  updateCirclePrimitiveDrag: (point: { x: number; y: number }) => void;
  finishCirclePrimitiveDrag: () => void;
  beginNaturalTerrainDrag: (id: string, kind: NaturalTerrainDrag["kind"], point?: { x: number; y: number }) => void;
  updateNaturalTerrainDrag: (point: { x: number; y: number }) => void;
  finishNaturalTerrainDrag: () => void;
  createRectangleArea: (from: { x: number; y: number }, to: { x: number; y: number }) => void;
  commitPenNode: (anchor: { x: number; y: number }, handle: { x: number; y: number }) => void;
  closePenArea: () => void;
  hoverRaisedArea: (point: { x: number; y: number }) => void;
  beginOrFinishRamp: (point: EditorMapPoint) => void;
  beginRaisedAreaControlDrag: (owner: RaisedAreaControlDrag["owner"], segmentIndex: number) => void;
  reshapeRaisedAreaControl: (point: { x: number; y: number }) => void;
  finishRaisedAreaControlDrag: () => void;
  cancelRaisedAreaControlDrag: () => void;
  beginAreaAnchorDrag: (id: string, anchorIndex: number) => void;
  moveAreaAnchor: (point: { x: number; y: number }) => void;
  finishAreaAnchorDrag: () => void;
  cancelAreaAnchorDrag: () => void;
  beginAreaCubicControlDrag: (id: string, segmentIndex: number, control: AreaCubicControlDrag["control"]) => void;
  moveAreaCubicControl: (point: { x: number; y: number }) => void;
  finishAreaCubicControlDrag: () => void;
  cancelAreaCubicControlDrag: () => void;
  beginConstrainedAreaDrag: (id: string, kind: ConstrainedAreaDrag["kind"], point: { x: number; y: number }) => void;
  updateConstrainedAreaDrag: (point: { x: number; y: number }) => void;
  finishConstrainedAreaDrag: () => void;
  cancelConstrainedAreaDrag: () => void;
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
  const editorViewport = useTacticalEditorViewport();
  const previewRef = useRef<SVGSVGElement>(null);
  const [panDrag, setPanDrag] = useState<EditorPanDrag | null>(null);
  const [rectangleDraft, setRectangleDraft] = useState<{ pointerId: number; start: { x: number; y: number }; current: { x: number; y: number } } | null>(null);
  const [penNodeDrag, setPenNodeDrag] = useState<{ pointerId: number; anchor: { x: number; y: number }; handle: { x: number; y: number } } | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);
  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName))) return;
      setSpacePressed(true);
      event.preventDefault();
    };
    const keyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpacePressed(false);
    };
    const loseFocus = () => setSpacePressed(false);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", loseFocus);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", loseFocus);
    };
  }, []);
  const panByPixels = editorViewport?.panByPixels;
  const zoomAt = editorViewport?.zoomAt;
  useEffect(() => {
    const svg = previewRef.current;
    if (!svg || !panByPixels || !zoomAt) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const bounds = svg.getBoundingClientRect();
      if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        panByPixels(
          event.shiftKey
            ? { x: -event.deltaY, y: 0 }
            : { x: -event.deltaX, y: -event.deltaY },
          { width: bounds.width, height: bounds.height },
        );
        return;
      }
      const anchor = localMapPoint({
        currentTarget: svg,
        clientX: event.clientX,
        clientY: event.clientY,
      });
      if (anchor) zoomAt(anchor, Math.exp(-event.deltaY * 0.002));
    };
    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [panByPixels, zoomAt]);
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
  const { drawnAreaCells, terrainRegionCells } = useTacticalEditorAreaCells(definition);
  if (!editorViewport) throw new Error("The tactical editor preview requires an editor viewport provider.");
  const nearestElevationEdgePreview = placementHover
    ? tacticalNearestElevationEdgeCandidate(elevationEdgeCandidates, placementHover)
    : null;
  const elevationEdgePreview = rampDraft?.edge ?? nearestElevationEdgePreview;
  const rampPreview = rampDraft && placementHover
    ? tacticalRampPlacementPreview(definition, rampDraft.edge, placementHover)
    : null;
  const ladderMountPreview = elevationTransitionKindForTool(placementKind) === "ladder"
    && elevationEdgePreview
    ? tacticalLadderMountForEdge(definition, elevationEdgePreview)
    : null;

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
    if (raisedAreaDraft
      && isAreaTool(placementKind)
      && Math.hypot(local.x - raisedAreaDraft.start.x, local.y - raisedAreaDraft.start.y) <= 0.35) {
      return gridPoint(raisedAreaDraft.start);
    }
    return snapTacticalEditorPoint(local, editorViewport.snapMode, definition.map);
  };
  const rectangleEndPoint = (start: { x: number; y: number }, point: { x: number; y: number }, constrain: boolean) => {
    if (!constrain) return point;
    const size = Math.max(Math.abs(point.x - start.x), Math.abs(point.y - start.y));
    return {
      x: Math.max(0, Math.min(definition.map.width, start.x + (point.x < start.x ? -size : size))),
      y: Math.max(0, Math.min(definition.map.height, start.y + (point.y < start.y ? -size : size))),
    };
  };
  const raisedAreaPreview = (() => {
    if (!raisedAreaDraft) return { segment: null, cells: [] };
    const anchor = penNodeDrag?.anchor ?? raisedAreaDraft.hover;
    if (sameGridPoint(raisedAreaDraft.current, anchor)) return { segment: null, cells: [] };
    const draggedHandle = penNodeDrag && Math.hypot(
      penNodeDrag.handle.x - penNodeDrag.anchor.x,
      penNodeDrag.handle.y - penNodeDrag.anchor.y,
    ) >= 0.1;
    const incomingControl = draggedHandle && penNodeDrag ? {
      x: penNodeDrag.anchor.x * 2 - penNodeDrag.handle.x,
      y: penNodeDrag.anchor.y * 2 - penNodeDrag.handle.y,
    } : null;
    const segment = penAreaSegment(raisedAreaDraft.current, anchor, raisedAreaDraft.outgoingControl, incomingControl);
    const segments = [...raisedAreaDraft.segments, segment];
    if (!sameGridPoint(anchor, raisedAreaDraft.start)) {
      segments.push({ kind: "line", from: gridPoint(anchor), to: gridPoint(raisedAreaDraft.start) });
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
  const placementPreview: TacticalEditorPlacementPreview | null = (() => {
    if (!placementKind || !placementHover) return null;
    if (placementKind === FIRE_TOOL_ID) {
      const valid = placementHover.x >= 0
        && placementHover.y >= 0
        && placementHover.x < definition.map.width
        && placementHover.y < definition.map.height
        && !definition.fireCells.some((cell) => cellKey(cell) === cellKey(placementHover));
      return { kind: "fire" as const, origin: placementHover, cells: [{ x: 0, y: 0 }], valid };
    }
    const naturalKind = naturalTerrainKindForTool(placementKind);
    if (naturalKind) {
      const placement: TacticalNaturalTerrainPlacement = {
        id: "__natural-terrain-preview__",
        kind: naturalKind,
        position: gridPoint(placementHover),
        radius: defaultNaturalTerrainRadius(naturalKind),
      };
      const cells = tacticalNaturalTerrainFootprintCells(
        placement,
        definition.map.width,
        definition.map.height,
      );
      try {
        resolveTacticalScenarioTerrain({
          ...definition,
          naturalTerrainPlacements: [...(definition.naturalTerrainPlacements ?? []), placement],
        });
        if (placement.kind === "tree" && (definition.enemyPlacements ?? [])
          .some((enemy) => cellKey(enemy.position) === cellKey(placement.position))) {
          throw new Error("A tree cannot overlap an enemy.");
        }
        return { kind: "natural" as const, placement, cells, valid: true };
      } catch {
        return { kind: "natural" as const, placement, cells, valid: false };
      }
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
  const portalPreview: TacticalEditorPortalPreview | null = (() => {
    if (!portalKind || !portalHover) return null;
    const candidate = tacticalEditorPortalPlacementCandidate(definition, portalHover, portalKind);
    if (!candidate || !candidate.available) return candidate ? { ...candidate, valid: false } : null;
    const previewId = "__wall-portal-preview__";
    const circleOwner = (definition.drawnTerrainPrimitives ?? [])
      .some((primitive) => primitive.id === candidate.wallId);
    const areaOwner = (definition.drawnAreas ?? [])
      .some((area) => area.id === candidate.wallId);
    const previewDefinition: TacticalScenarioDefinitionFile = {
      ...definition,
      ...(circleOwner
        ? {
          drawnTerrainPrimitives: (definition.drawnTerrainPrimitives ?? [])
            .map((primitive) => primitive.id === candidate.wallId
              ? { ...primitive, portals: [...(primitive.portals ?? []), { id: previewId, kind: portalKind, position: candidate.position }] }
              : primitive),
        }
        : areaOwner
          ? {
            drawnAreas: (definition.drawnAreas ?? []).map((area) => area.id === candidate.wallId
              ? { ...area, portals: [...(area.portals ?? []), { id: previewId, kind: portalKind, position: candidate.position }] }
              : area),
          }
        : {
          drawnWalls: (definition.drawnWalls ?? []).map((wall) => wall.id === candidate.wallId
            ? { ...wall, portals: [...(wall.portals ?? []), { id: previewId, kind: portalKind, position: candidate.position }] }
            : wall),
        }),
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
  const rectanglePreview: TacticalEditorRectanglePreview | null = rectangleDraft ? {
    x: Math.min(rectangleDraft.start.x, rectangleDraft.current.x),
    y: Math.min(rectangleDraft.start.y, rectangleDraft.current.y),
    width: Math.abs(rectangleDraft.current.x - rectangleDraft.start.x),
    height: Math.abs(rectangleDraft.current.y - rectangleDraft.start.y),
  } : null;
  return <svg
    ref={previewRef}
    viewBox={`${editorViewport.viewBox.x} ${editorViewport.viewBox.y} ${editorViewport.viewBox.width} ${editorViewport.viewBox.height}`}
    preserveAspectRatio="xMidYMid meet"
    className={`h-full w-full touch-none bg-[#050a12] ${panDrag || spacePressed || handToolActive ? "cursor-grab" : placementKind || enemyKind ? "cursor-crosshair" : ""}`}
    aria-label="Scenario draft map preview"
    data-zoom-percent={editorViewport.zoomPercent}
    onPointerDown={(event) => {
      if (event.button === 1 || (event.button === 0 && (spacePressed || handToolActive))) {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        const bounds = event.currentTarget.getBoundingClientRect();
        setPanDrag({
          pointerId: event.pointerId,
          start: { x: event.clientX, y: event.clientY },
          camera: editorViewport.camera,
          viewport: { width: bounds.width, height: bounds.height },
        });
        return;
      }
      if (wallPortalKindForTool(placementKind)) {
        const local = localMapPoint(event);
        if (local) placeWallPortal({ x: local.x, y: local.y });
        return;
      }
      if (placementKind === RECTANGLE_AREA_TOOL_ID) {
        const vertex = mapVertex(event);
        if (!vertex) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setRectangleDraft({ pointerId: event.pointerId, start: vertex, current: vertex });
        return;
      }
      if (isAreaTool(placementKind)) {
        const vertex = mapVertex(event);
        if (!vertex) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setPenNodeDrag({ pointerId: event.pointerId, anchor: vertex, handle: vertex });
        return;
      }
      if (placementKind === CIRCLE_TOOL_ID || placementKind === CIRCLE_AREA_TOOL_ID) {
        const vertex = mapVertex(event);
        if (!vertex) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        beginCircle(vertex);
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
        selectPrimitive(null);
        selectNaturalTerrain(null);
        selectElevationTransition(null);
        selectPortal(null);
        selectFire(null);
      }
    }}
    onPointerMove={(event) => {
      if (panDrag && event.pointerId === panDrag.pointerId) {
        editorViewport.setCamera(panTacticalEditorCamera(
          panDrag.camera,
          { x: event.clientX - panDrag.start.x, y: event.clientY - panDrag.start.y },
          panDrag.viewport,
          definition.map,
        ));
        return;
      }
      if (dragTracingTemplate) {
        const local = localMapPoint(event);
        if (local) transformTracingTemplate({ x: local.x, y: local.y });
        return;
      }
      if (dragConstrainedArea) {
        const vertex = mapVertex(event);
        if (vertex) updateConstrainedAreaDrag(vertex);
        return;
      }
      if (dragRaisedAreaControl) {
        const local = localMapPoint(event);
        if (local) reshapeRaisedAreaControl({ x: local.x, y: local.y });
        return;
      }
      if (dragAreaAnchor) {
        const vertex = mapVertex(event);
        if (vertex) moveAreaAnchor(vertex);
        return;
      }
      if (dragAreaCubicControl) {
        const local = localMapPoint(event);
        if (local) moveAreaCubicControl({ x: local.x, y: local.y });
        return;
      }
      if (dragCirclePrimitive) {
        const vertex = mapVertex(event);
        if (vertex) updateCirclePrimitiveDrag(vertex);
        return;
      }
      if (dragNaturalTerrain) {
        const local = localMapPoint(event);
        if (local) updateNaturalTerrainDrag({ x: local.x, y: local.y });
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
      if (rectangleDraft && event.pointerId === rectangleDraft.pointerId) {
        const vertex = mapVertex(event);
        if (vertex) setRectangleDraft({
          ...rectangleDraft,
          current: rectangleEndPoint(rectangleDraft.start, vertex, event.shiftKey),
        });
        return;
      }
      if (penNodeDrag && event.pointerId === penNodeDrag.pointerId) {
        const local = localMapPoint(event);
        if (local) setPenNodeDrag({ ...penNodeDrag, handle: { x: local.x, y: local.y } });
        return;
      }
      if (circleDraft) {
        const vertex = mapVertex(event);
        if (vertex) updateCircle(vertex);
        return;
      }
      if (isAreaTool(placementKind)) {
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
      if (panDrag && event.pointerId === panDrag.pointerId) {
        setPanDrag(null);
        return;
      }
      if (dragTracingTemplate) {
        const local = localMapPoint(event);
        if (local) transformTracingTemplate({ x: local.x, y: local.y });
        finishTracingTemplateDrag();
        return;
      }
      if (dragConstrainedArea) {
        const vertex = mapVertex(event);
        if (vertex) updateConstrainedAreaDrag(vertex);
        finishConstrainedAreaDrag();
        return;
      }
      if (dragRaisedAreaControl) {
        const local = localMapPoint(event);
        if (local) reshapeRaisedAreaControl({ x: local.x, y: local.y });
        finishRaisedAreaControlDrag();
        return;
      }
      if (dragAreaAnchor) {
        const vertex = mapVertex(event);
        if (vertex) moveAreaAnchor(vertex);
        finishAreaAnchorDrag();
        return;
      }
      if (dragAreaCubicControl) {
        const local = localMapPoint(event);
        if (local) moveAreaCubicControl({ x: local.x, y: local.y });
        finishAreaCubicControlDrag();
        return;
      }
      if (dragCirclePrimitive) {
        const vertex = mapVertex(event);
        if (vertex) updateCirclePrimitiveDrag(vertex);
        finishCirclePrimitiveDrag();
        return;
      }
      if (dragNaturalTerrain) {
        const local = localMapPoint(event);
        if (local) updateNaturalTerrainDrag({ x: local.x, y: local.y });
        finishNaturalTerrainDrag();
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
      if (rectangleDraft && event.pointerId === rectangleDraft.pointerId) {
        const vertex = mapVertex(event);
        const end = vertex ? rectangleEndPoint(rectangleDraft.start, vertex, event.shiftKey) : rectangleDraft.current;
        createRectangleArea(rectangleDraft.start, end);
        setRectangleDraft(null);
        return;
      }
      if (penNodeDrag && event.pointerId === penNodeDrag.pointerId) {
        const local = localMapPoint(event);
        commitPenNode(penNodeDrag.anchor, local ? { x: local.x, y: local.y } : penNodeDrag.handle);
        setPenNodeDrag(null);
        return;
      }
      if (circleDraft) {
        const vertex = mapVertex(event);
        if (vertex) finishCircle(vertex);
        else cancelCircle();
        return;
      }
      endDrag();
    }} onDoubleClick={(event) => {
      if (placementKind !== PEN_AREA_TOOL_ID || !raisedAreaDraft) return;
      event.preventDefault();
      closePenArea();
      setPenNodeDrag(null);
    }} onPointerCancel={() => { setPanDrag(null); setRectangleDraft(null); setPenNodeDrag(null); cancelTracingTemplateDrag(); cancelConstrainedAreaDrag(); cancelRaisedAreaControlDrag(); cancelAreaAnchorDrag(); cancelAreaCubicControlDrag(); finishCirclePrimitiveDrag(); finishNaturalTerrainDrag(); cancelCircle(); cancelWallControlDrag(); cancelWallPortalDrag(); cancelWallMove(); cancelWallEndpointDrag(); cancelWall(); endDrag(); }}>
    <defs>
      <pattern id="draft-grid" width="1" height="1" patternUnits="userSpaceOnUse">
        <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#29434d" strokeWidth="0.04" />
      </pattern>
    </defs>
    <TacticalEditorTracingTemplateLayer
      template={definition.tracingTemplate}
      editing={tracingTemplateEditing}
      interactionDisabled={Boolean(placementKind || enemyKind)}
      onBeginDrag={(kind, event) => {
        const point = localMapPoint(event);
        if (!point) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        beginTracingTemplateDrag(kind, { x: point.x, y: point.y });
      }}
    />
    <rect x="0" y="0" width={definition.map.width} height={definition.map.height} fill="url(#draft-grid)" />
    <TacticalEditorRectangleDraftPreview preview={rectanglePreview} />
    <TacticalEditorTerrainCellsLayer terrain={terrain} />
    <TacticalEditorElevationLayer
      terrain={terrain}
      selectedElevationTransitionId={selectedElevationTransitionId}
      interactionDisabled={Boolean(placementKind || enemyKind)}
      elevationTransitionKind={elevationTransitionKind}
      elevationEdgeCandidates={elevationEdgeCandidates}
      elevationEdgePreview={elevationEdgePreview}
      ladderMountPreview={ladderMountPreview}
      rampPreview={rampPreview}
      onSelectTransition={(id) => {
        selectPlacement(null);
        selectEnemy(null);
        selectWall(null);
        selectRaisedArea(null);
        selectPortal(null);
        selectFire(null);
        selectElevationTransition(id);
      }}
    />
    <TacticalEditorCircleDraftPreview draft={circleDraft} />
    <TacticalEditorLegacyCircleLayer
      primitives={definition.drawnTerrainPrimitives ?? []}
      selectedPrimitiveId={selectedPrimitiveId}
      interactionDisabled={Boolean(placementKind || enemyKind)}
      onSelectPrimitive={(id) => {
        selectPlacement(null);
        selectEnemy(null);
        selectWall(null);
        selectRaisedArea(null);
        selectElevationTransition(null);
        selectPortal(null);
        selectFire(null);
        selectPrimitive(id);
      }}
      onBeginDrag={beginCirclePrimitiveDrag}
    />
    {(definition.drawnAreas ?? []).map((area) => {
      const selected = area.id === selectedRaisedAreaId;
      const areaGeometry = area.geometry;
      const fill = area.surface === "grass" ? "#3f7d20"
        : area.surface === "sand" ? "#c2a15a"
        : area.surface === "water" ? "#2563a8"
        : area.surface === "close-machinery" ? "#b45309"
        : area.surface === "liquid-hydrogen" ? "#0284c7"
        : "transparent";
      const outline = selected ? "#fef08a" : area.boundary === "wall" ? "#e2e8f0" : "#67e8f9";
      const cells = drawnAreaCells.get(area) ?? [];
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
      const insertAnchor = (event: ReactMouseEvent<SVGElement>, segmentIndex: number) => {
        if (!nodeEditActive || !selected || areaGeometry) return;
        const point = localMapPoint(event);
        if (!point) return;
        event.preventDefault();
        event.stopPropagation();
        insertAreaAnchor(area.id, segmentIndex, point);
      };
      return <g key={area.id} data-testid={`drawn-area-${area.id}`} data-elevation-level={area.elevation} data-boundary={area.boundary} data-deployment={area.deployment ? "crew" : "none"}>
        {area.surface !== "none" && cells.map((cell) => <rect
          key={cellKey(cell)}
          x={cell.x}
          y={cell.y}
          width="1"
          height="1"
          fill={fill}
          fillOpacity={area.surface === "liquid-hydrogen" && area.settings?.filled === false ? "0.08" : "0.3"}
          pointerEvents="none"
        />)}
        {area.segments.map((segment, index) => segment.kind !== "line"
          ? <g key={index}>
            <path data-testid={`drawn-area-${area.id}-segment-${index}`} d={areaSegmentSvgPath(segment)} fill="none" stroke={outline} strokeWidth={selected ? "0.38" : area.boundary === "wall" ? "0.32" : "0.2"} className={placementKind || enemyKind ? undefined : "cursor-pointer"} onPointerDown={selectArea} onDoubleClick={(event) => insertAnchor(event, index)} />
            {selected && !areaGeometry && segment.kind === "quadratic" && <circle
              data-testid={`drawn-area-${area.id}-segment-${index}-control-handle`}
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
                beginRaisedAreaControlDrag({ kind: "area", id: area.id }, index);
              }}
            />}
            {selected && !areaGeometry && segment.kind === "cubic" && <g>
              <line x1={segment.from.x} y1={segment.from.y} x2={segment.control1.x} y2={segment.control1.y} stroke="#a78bfa" strokeWidth="0.1" strokeDasharray="0.3 0.2" pointerEvents="none" />
              <line x1={segment.to.x} y1={segment.to.y} x2={segment.control2.x} y2={segment.control2.y} stroke="#a78bfa" strokeWidth="0.1" strokeDasharray="0.3 0.2" pointerEvents="none" />
              {(["control1", "control2"] as const).map((control) => <circle
                key={control}
                data-testid={`drawn-area-${area.id}-segment-${index}-${control}-handle`}
                aria-label={`Move ${area.id} curve ${index + 1} ${control === "control1" ? "outgoing" : "incoming"} handle`}
                cx={segment[control].x}
                cy={segment[control].y}
                r="0.28"
                fill="#7c3aed"
                stroke="#ede9fe"
                strokeWidth="0.1"
                className="cursor-move"
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  beginAreaCubicControlDrag(area.id, index, control);
                }}
              />)}
            </g>}
          </g>
          : <line key={index} data-testid={`drawn-area-${area.id}-segment-${index}`} x1={segment.from.x} y1={segment.from.y} x2={segment.to.x} y2={segment.to.y} stroke={outline} strokeWidth={selected ? "0.38" : area.boundary === "wall" ? "0.32" : "0.2"} className={placementKind || enemyKind ? undefined : "cursor-pointer"} onPointerDown={selectArea} onDoubleClick={(event) => insertAnchor(event, index)} />)}
        {selected && !areaGeometry && area.segments.map((segment, index) => {
          const anchorSelected = nodeEditActive && selectedAreaAnchor?.areaId === area.id && selectedAreaAnchor.anchorIndex === index;
          return <circle
          key={`anchor:${index}`}
          data-testid={`drawn-area-${area.id}-anchor-${index}`}
          aria-label={`Move ${area.id} point ${index + 1}`}
          cx={segment.from.x}
          cy={segment.from.y}
          r="0.3"
          fill={anchorSelected ? "#f59e0b" : "#0891b2"}
          stroke={anchorSelected ? "#fef3c7" : "#ecfeff"}
          strokeWidth={anchorSelected ? "0.16" : "0.1"}
          className="cursor-move"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
            if (nodeEditActive) selectAreaAnchor({ areaId: area.id, anchorIndex: index });
            beginAreaAnchorDrag(area.id, index);
          }}
        />;})}
        {selected && areaGeometry?.kind === "circle" && <>
          <line
            x1={areaGeometry.center.x}
            y1={areaGeometry.center.y}
            x2={areaGeometry.center.x + areaGeometry.radius}
            y2={areaGeometry.center.y}
            stroke="#fef08a"
            strokeWidth="0.1"
            strokeDasharray="0.3 0.2"
            pointerEvents="none"
          />
          <circle
            data-testid={`drawn-area-${area.id}-circle-center-handle`}
            aria-label={`Move ${area.id} circle`}
            cx={areaGeometry.center.x}
            cy={areaGeometry.center.y}
            r="0.32"
            fill="#0891b2"
            stroke="#ecfeff"
            strokeWidth="0.1"
            className="cursor-move"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              beginConstrainedAreaDrag(area.id, "circle-center", areaGeometry.center);
            }}
          />
          <circle
            data-testid={`drawn-area-${area.id}-circle-radius-handle`}
            aria-label={`Resize ${area.id} circle`}
            cx={areaGeometry.center.x + areaGeometry.radius}
            cy={areaGeometry.center.y}
            r="0.32"
            fill="#d97706"
            stroke="#fef3c7"
            strokeWidth="0.1"
            className="cursor-ew-resize"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              beginConstrainedAreaDrag(area.id, "circle-radius", { x: areaGeometry.center.x + areaGeometry.radius, y: areaGeometry.center.y });
            }}
          />
        </>}
        {selected && areaGeometry?.kind === "rectangle" && <>
          <circle
            data-testid={`drawn-area-${area.id}-rectangle-center-handle`}
            aria-label={`Move ${area.id} rectangle`}
            cx={areaGeometry.x + areaGeometry.width / 2}
            cy={areaGeometry.y + areaGeometry.height / 2}
            r="0.32"
            fill="#0891b2"
            stroke="#ecfeff"
            strokeWidth="0.1"
            className="cursor-move"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              beginConstrainedAreaDrag(area.id, "rectangle-center", { x: areaGeometry.x + areaGeometry.width / 2, y: areaGeometry.y + areaGeometry.height / 2 });
            }}
          />
          {([
            ["top-left", areaGeometry.x, areaGeometry.y],
            ["top-right", areaGeometry.x + areaGeometry.width, areaGeometry.y],
            ["bottom-right", areaGeometry.x + areaGeometry.width, areaGeometry.y + areaGeometry.height],
            ["bottom-left", areaGeometry.x, areaGeometry.y + areaGeometry.height],
          ] as const).map(([corner, x, y]) => <rect
            key={corner}
            data-testid={`drawn-area-${area.id}-rectangle-${corner}-handle`}
            aria-label={`Resize ${area.id} rectangle ${corner}`}
            x={x - 0.28}
            y={y - 0.28}
            width="0.56"
            height="0.56"
            fill="#d97706"
            stroke="#fef3c7"
            strokeWidth="0.1"
            className="cursor-nwse-resize"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              beginConstrainedAreaDrag(area.id, `rectangle-${corner}` as ConstrainedAreaDrag["kind"], { x, y });
            }}
          />)}
        </>}
        {selected && <text x={area.segments[0]?.from.x ?? 0} y={(area.segments[0]?.from.y ?? 0) - 0.45} fill="#fef08a" fontSize="0.42" fontWeight="bold" pointerEvents="none">{area.surface} · level {area.elevation} · {area.boundary}</text>}
      </g>;
    })}
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
        {area.segments.map((segment, index) => segment.kind !== "line"
          ? <g key={index}>
            <path data-testid={`drawn-raised-area-${area.id}-segment-${index}`} d={areaSegmentSvgPath(segment)} fill="none" stroke={selected ? "#fef08a" : outlineColor} strokeWidth={selected ? "0.34" : "0.24"} className={placementKind || enemyKind ? undefined : "cursor-pointer"} onPointerDown={selectArea} />
            {selected && segment.kind === "quadratic" && <>
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
                  beginRaisedAreaControlDrag({ kind: "raised", id: area.id }, index);
                }}
              />
            </>}
          </g>
          : <line key={index} data-testid={`drawn-raised-area-${area.id}-segment-${index}`} x1={segment.from.x} y1={segment.from.y} x2={segment.to.x} y2={segment.to.y} stroke={selected ? "#fef08a" : outlineColor} strokeWidth={selected ? "0.34" : "0.24"} className={placementKind || enemyKind ? undefined : "cursor-pointer"} onPointerDown={selectArea} />)}
        {selected && <text x={area.segments[0]?.from.x ?? 0} y={(area.segments[0]?.from.y ?? 0) - 0.45} fill="#fef08a" fontSize="0.45" fontWeight="bold" pointerEvents="none">Level {level}</text>}
      </g>;
    })}
    {(definition.drawnTerrainRegions ?? []).map((region) => {
      const selected = region.id === selectedRaisedAreaId;
      const fill = region.kind === "close-machinery" ? "#b45309"
        : region.kind === "liquid-hydrogen" ? "#0284c7"
        : region.kind === "grass" ? "#3f7d20"
        : region.kind === "sand" ? "#c2a15a"
        : "#2563a8";
      const outline = region.kind === "close-machinery" ? "#fbbf24"
        : region.kind === "liquid-hydrogen" ? "#7dd3fc"
        : region.kind === "grass" ? "#65a30d"
        : region.kind === "sand" ? "#f2d28b"
        : "#60a5fa";
      const label = region.kind === "close-machinery" ? "Closed machinery"
        : region.kind === "liquid-hydrogen"
          ? `Liquid hydrogen · ${region.settings?.filled === false ? "empty" : "filled"}`
          : region.kind === "grass" ? "Grass" : region.kind === "sand" ? "Sand" : "Water";
      const flatSurface = region.kind === "grass" || region.kind === "sand" || region.kind === "water";
      const cells = terrainRegionCells.get(region) ?? [];
      const selectRegion = (event: ReactPointerEvent<SVGElement>) => {
        if (placementKind || enemyKind) return;
        event.stopPropagation();
        selectPlacement(null);
        selectEnemy(null);
        selectWall(null);
        selectRaisedArea(null);
        selectElevationTransition(null);
        selectPortal(null);
        selectFire(null);
        selectRaisedArea(region.id);
      };
      return <g key={region.id} data-testid={`drawn-terrain-region-${region.id}`}>
        {cells.map((cell) => <rect
          key={cellKey(cell)}
          x={cell.x + (flatSurface ? 0 : 0.04)}
          y={cell.y + (flatSurface ? 0 : 0.04)}
          width={flatSurface ? "1" : "0.92"}
          height={flatSurface ? "1" : "0.92"}
          fill={fill}
          fillOpacity={region.kind === "liquid-hydrogen" && region.settings?.filled === false ? "0.08" : "0.28"}
          stroke={outline}
          strokeWidth={flatSurface ? "0" : "0.04"}
          pointerEvents="none"
        />)}
        {region.segments.map((segment, index) => segment.kind !== "line"
          ? <g key={index}>
            <path data-testid={`drawn-terrain-region-${region.id}-segment-${index}`} d={areaSegmentSvgPath(segment)} fill="none" stroke={selected ? "#fef08a" : outline} strokeWidth={selected ? "0.34" : "0.24"} className={placementKind || enemyKind ? undefined : "cursor-pointer"} onPointerDown={selectRegion} />
            {selected && segment.kind === "quadratic" && <>
              <line x1={segment.from.x} y1={segment.from.y} x2={segment.control.x} y2={segment.control.y} stroke="#a78bfa" strokeWidth="0.08" strokeDasharray="0.3 0.2" pointerEvents="none" />
              <line x1={segment.control.x} y1={segment.control.y} x2={segment.to.x} y2={segment.to.y} stroke="#a78bfa" strokeWidth="0.08" strokeDasharray="0.3 0.2" pointerEvents="none" />
              <circle
                data-testid={`terrain-region-${region.id}-segment-${index}-control-handle`}
                aria-label={`Reshape ${region.id} curve ${index + 1}`}
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
                  beginRaisedAreaControlDrag({ kind: "terrain-region", id: region.id }, index);
                }}
              />
            </>}
          </g>
          : <line key={index} data-testid={`drawn-terrain-region-${region.id}-segment-${index}`} x1={segment.from.x} y1={segment.from.y} x2={segment.to.x} y2={segment.to.y} stroke={selected ? "#fef08a" : outline} strokeWidth={selected ? "0.34" : "0.24"} className={placementKind || enemyKind ? undefined : "cursor-pointer"} onPointerDown={selectRegion} />)}
        {selected && <text x={region.segments[0]?.from.x ?? 0} y={(region.segments[0]?.from.y ?? 0) - 0.45} fill="#fef08a" fontSize="0.42" fontWeight="bold" pointerEvents="none">
          {label}
        </text>}
      </g>;
    })}
    <TacticalEditorNaturalTerrainLayer
      placements={definition.naturalTerrainPlacements ?? []}
      map={definition.map}
      selectedNaturalTerrainId={selectedNaturalTerrainId}
      interactionDisabled={Boolean(placementKind || enemyKind)}
      onBeginPositionDrag={(id, event) => {
        const point = localMapPoint(event);
        selectPlacement(null);
        selectEnemy(null);
        selectWall(null);
        selectRaisedArea(null);
        selectPrimitive(null);
        selectElevationTransition(null);
        selectPortal(null);
        selectFire(null);
        selectNaturalTerrain(id);
        beginNaturalTerrainDrag(id, "position", point ? { x: point.x, y: point.y } : undefined);
      }}
      onBeginRadiusDrag={(id) => beginNaturalTerrainDrag(id, "radius")}
    />
    <TacticalEditorWallsLayer
      resolvedWalls={terrain.walls}
      drawnWalls={definition.drawnWalls ?? []}
      circlePrimitives={definition.drawnTerrainPrimitives ?? []}
      selectedWallId={selectedWallId}
      interactionDisabled={Boolean(placementKind || enemyKind)}
      onBeginMove={(id, event) => {
        const vertex = mapVertex(event);
        if (!vertex) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        selectPlacement(null);
        selectEnemy(null);
        selectPortal(null);
        selectFire(null);
        selectWall(id);
        beginWallMove(id, vertex);
      }}
      onBeginControlDrag={beginWallControlDrag}
      onBeginEndpointDrag={beginWallEndpointDrag}
    />
    <TacticalEditorWallPortalsLayer
      doors={terrain.doors}
      drawnWalls={definition.drawnWalls ?? []}
      drawnAreas={definition.drawnAreas ?? []}
      circlePrimitives={definition.drawnTerrainPrimitives ?? []}
      selectedPortalId={selectedPortalId}
      interactionDisabled={Boolean(placementKind || enemyKind)}
      onBeginPortalDrag={(id) => {
        selectPlacement(null);
        selectEnemy(null);
        selectWall(null);
        selectFire(null);
        selectPortal(id);
        beginWallPortalDrag(id);
      }}
    />
    <TacticalEditorObjectsLayer objects={terrain.terrainObjects} />
    <TacticalEditorPlacementPreviewLayer preview={placementPreview} />
    <TacticalEditorBoundaryDraftPreview portal={portalPreview} wall={wallDraft} />
    {raisedAreaDraft && <g data-testid="raised-area-draft-preview">
      {raisedAreaPreview.cells.map((cell) => <rect key={cellKey(cell)} x={cell.x + 0.04} y={cell.y + 0.04} width="0.92" height="0.92" fill="#06b6d4" fillOpacity="0.34" stroke="#67e8f9" strokeWidth="0.06" pointerEvents="none" />)}
      {raisedAreaDraft.segments.map((segment, index) => segment.kind === "cubic"
        ? <g key={index}>
          <path data-testid={`raised-area-draft-segment-${index}`} d={areaSegmentSvgPath(segment)} fill="none" stroke="#fef08a" strokeWidth="0.28" pointerEvents="none" />
          <line x1={segment.from.x} y1={segment.from.y} x2={segment.control1.x} y2={segment.control1.y} stroke="#a78bfa" strokeWidth="0.08" strokeDasharray="0.3 0.2" pointerEvents="none" />
          <line x1={segment.control2.x} y1={segment.control2.y} x2={segment.to.x} y2={segment.to.y} stroke="#a78bfa" strokeWidth="0.08" strokeDasharray="0.3 0.2" pointerEvents="none" />
          <circle cx={segment.control1.x} cy={segment.control1.y} r="0.22" fill="#7c3aed" stroke="#ede9fe" strokeWidth="0.08" pointerEvents="none" />
          <circle cx={segment.control2.x} cy={segment.control2.y} r="0.22" fill="#7c3aed" stroke="#ede9fe" strokeWidth="0.08" pointerEvents="none" />
        </g>
        : segment.kind === "quadratic" ? <g key={index}>
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
              beginRaisedAreaControlDrag({ kind: "draft" }, index);
            }}
          />
        </g>
        : <line key={index} data-testid={`raised-area-draft-segment-${index}`} x1={segment.from.x} y1={segment.from.y} x2={segment.to.x} y2={segment.to.y} stroke="#fef08a" strokeWidth="0.28" pointerEvents="none" />)}
      {raisedAreaPreview.segment && (raisedAreaPreview.segment.kind !== "line"
        ? <path d={areaSegmentSvgPath(raisedAreaPreview.segment)} fill="none" stroke="#fef08a" strokeWidth="0.28" strokeDasharray="0.35 0.2" pointerEvents="none" />
        : <line x1={raisedAreaPreview.segment.from.x} y1={raisedAreaPreview.segment.from.y} x2={raisedAreaPreview.segment.to.x} y2={raisedAreaPreview.segment.to.y} stroke="#fef08a" strokeWidth="0.28" strokeDasharray="0.35 0.2" pointerEvents="none" />)}
      {penNodeDrag && Math.hypot(penNodeDrag.handle.x - penNodeDrag.anchor.x, penNodeDrag.handle.y - penNodeDrag.anchor.y) >= 0.1 && <g pointerEvents="none">
        <line x1={penNodeDrag.anchor.x * 2 - penNodeDrag.handle.x} y1={penNodeDrag.anchor.y * 2 - penNodeDrag.handle.y} x2={penNodeDrag.handle.x} y2={penNodeDrag.handle.y} stroke="#a78bfa" strokeWidth="0.1" strokeDasharray="0.3 0.2" />
        <circle cx={penNodeDrag.handle.x} cy={penNodeDrag.handle.y} r="0.22" fill="#7c3aed" stroke="#ede9fe" strokeWidth="0.08" />
        <circle cx={penNodeDrag.anchor.x * 2 - penNodeDrag.handle.x} cy={penNodeDrag.anchor.y * 2 - penNodeDrag.handle.y} r="0.22" fill="#7c3aed" stroke="#ede9fe" strokeWidth="0.08" />
      </g>}
      <circle cx={raisedAreaDraft.start.x} cy={raisedAreaDraft.start.y} r="0.3" fill="#22d3ee" stroke="#ecfeff" strokeWidth="0.1" pointerEvents="none" />
      <circle cx={raisedAreaDraft.current.x} cy={raisedAreaDraft.current.y} r="0.22" fill="#f59e0b" stroke="#fef3c7" strokeWidth="0.08" pointerEvents="none" />
    </g>}
    {orderedPlacements.map((placement) => {
      const size = placementSize(placement);
      const selected = placement.id === selectedPlacementId;
      return <rect key={`placement-control:${placement.id}`} data-testid={`terrain-placement-control-${placement.id}`} data-rotation={placement.rotation} x={placement.origin.x} y={placement.origin.y} width={size.width} height={size.height}
        fill={selected ? "#22d3ee" : "transparent"} fillOpacity={selected ? 0.16 : 0} stroke={selected ? "#fef08a" : "transparent"} strokeOpacity={selected ? 1 : 0.72} strokeWidth={selected ? "0.24" : "0.12"}
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
        selectPlacement(null);
        selectFire(null);
        selectEnemy(enemy.id);
        const point = mapPoint(event);
        if (!point) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        beginEnemyDrag({ id: enemy.id, offset: { x: point.x - enemy.position.x, y: point.y - enemy.position.y } });
      }}>
        <circle cx={enemy.position.x + 0.5} cy={enemy.position.y + 0.5} r="0.58" fill="transparent" pointerEvents="all" />
        <circle cx={enemy.position.x + 0.5} cy={enemy.position.y + 0.5} r="0.38" fill="#7f1d1d" stroke={selected ? "#fef08a" : "#f87171"} strokeWidth={selected ? "0.18" : "0.1"} />
        <text x={enemy.position.x + 0.5} y={enemy.position.y + 0.62} textAnchor="middle" fill="#fee2e2" fontSize="0.34" fontWeight="bold">E</text>
        <line x1={enemy.position.x + 0.5} y1={enemy.position.y + 0.5} x2={enemy.position.x + 0.5 + direction.x * 0.4} y2={enemy.position.y + 0.5 + direction.y * 0.4} stroke="#fef08a" strokeWidth="0.1" />
        <circle cx={enemy.position.x + 0.5 + direction.x * 0.4} cy={enemy.position.y + 0.5 + direction.y * 0.4} r="0.08" fill="#fef08a" />
      </g>;
    })}
  </svg>;
};

export default DraftPreview;
