"use client";

import { useCallback, type Dispatch, type PointerEvent as ReactPointerEvent, type SetStateAction } from "react";
import type { TacticalEditorCamera } from "@/plugins/characterCombat/editor/lib/tacticalEditorCamera";
import type { TacticalEditorDraftPreviewProps } from "@/plugins/characterCombat/editor/lib/tacticalEditorDraftPreviewProps";
import type { EditorMapPoint } from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";
import {
  tacticalEditorLocalMapPoint,
  type TacticalEditorClientPointer,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorPointerCoordinates";
import {
  CIRCLE_AREA_TOOL_ID,
  CIRCLE_TOOL_ID,
  CURVED_WALL_TOOL_ID,
  RAMP_TOOL_ID,
  RECTANGLE_AREA_TOOL_ID,
  WALL_TOOL_ID,
  isAreaTool,
  wallPortalKindForTool,
  type EditorPanDrag,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

type PointerDownProps = Pick<TacticalEditorDraftPreviewProps,
  | "handToolActive"
  | "placementKind"
  | "enemyKind"
  | "wallDraft"
  | "placeWallPortal"
  | "beginCircle"
  | "beginWall"
  | "finishWall"
  | "beginOrFinishRamp"
  | "placeEnemy"
  | "placeTerrain"
  | "selectPlacement"
  | "selectEnemy"
  | "selectWall"
  | "selectRaisedArea"
  | "selectPrimitive"
  | "selectNaturalTerrain"
  | "selectElevationTransition"
  | "selectPortal"
  | "selectFire"
>;

type UseTacticalEditorCanvasPointerDownOptions = PointerDownProps & {
  spacePressed: boolean;
  camera?: TacticalEditorCamera;
  setPanDrag: Dispatch<SetStateAction<EditorPanDrag | null>>;
  mapPoint: (event: ReactPointerEvent<SVGElement>) => EditorMapPoint | null;
  mapVertex: (event: ReactPointerEvent<SVGElement>) => { x: number; y: number } | null;
  beginRectangle: (pointerId: number, point: { x: number; y: number }) => void;
  beginPenNode: (pointerId: number, point: { x: number; y: number }) => void;
  localMapPoint?: (event: TacticalEditorClientPointer) => { x: number; y: number } | null;
};

export const useTacticalEditorCanvasPointerDown = ({
  handToolActive,
  placementKind,
  enemyKind,
  wallDraft,
  spacePressed,
  camera,
  setPanDrag,
  mapPoint,
  mapVertex,
  localMapPoint = tacticalEditorLocalMapPoint,
  placeWallPortal,
  beginRectangle,
  beginPenNode,
  beginCircle,
  beginWall,
  finishWall,
  beginOrFinishRamp,
  placeEnemy,
  placeTerrain,
  selectPlacement,
  selectEnemy,
  selectWall,
  selectRaisedArea,
  selectPrimitive,
  selectNaturalTerrain,
  selectElevationTransition,
  selectPortal,
  selectFire,
}: UseTacticalEditorCanvasPointerDownOptions) => useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
  if (event.button === 1 || (event.button === 0 && (spacePressed || handToolActive))) {
    if (!camera) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const bounds = event.currentTarget.getBoundingClientRect();
    setPanDrag({
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      camera,
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
    beginRectangle(event.pointerId, vertex);
    return;
  }
  if (isAreaTool(placementKind)) {
    const vertex = mapVertex(event);
    if (!vertex) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    beginPenNode(event.pointerId, vertex);
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
}, [
  beginCircle,
  beginOrFinishRamp,
  beginPenNode,
  beginRectangle,
  beginWall,
  camera,
  enemyKind,
  finishWall,
  handToolActive,
  localMapPoint,
  mapPoint,
  mapVertex,
  placeEnemy,
  placeTerrain,
  placeWallPortal,
  placementKind,
  selectElevationTransition,
  selectEnemy,
  selectFire,
  selectNaturalTerrain,
  selectPlacement,
  selectPortal,
  selectPrimitive,
  selectRaisedArea,
  selectWall,
  setPanDrag,
  spacePressed,
  wallDraft?.awaitingEnd,
]);
