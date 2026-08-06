"use client";

import { useCallback, type PointerEvent as ReactPointerEvent } from "react";
import {
  panTacticalEditorCamera,
  type TacticalEditorCamera,
  type TacticalEditorMapSize,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorCamera";
import type { TacticalEditorDraftPreviewProps } from "@/plugins/characterCombat/editor/lib/tacticalEditorDraftPreviewProps";
import type { EditorMapPoint } from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";
import {
  tacticalEditorLocalMapPoint,
  type TacticalEditorClientPointer,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorPointerCoordinates";
import {
  isAreaTool,
  wallPortalKindForTool,
  type EditorPanDrag,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

type PointerMoveProps = Pick<TacticalEditorDraftPreviewProps,
  | "placementKind"
  | "enemyKind"
  | "wallDraft"
  | "circleDraft"
  | "dragTracingTemplate"
  | "dragConstrainedArea"
  | "dragRaisedAreaControl"
  | "dragAreaAnchor"
  | "dragAreaCubicControl"
  | "dragCirclePrimitive"
  | "dragNaturalTerrain"
  | "dragWallControl"
  | "dragWallPortal"
  | "dragWallMove"
  | "dragWallEndpoint"
  | "dragEnemy"
  | "dragPlacement"
  | "transformTracingTemplate"
  | "updateConstrainedAreaDrag"
  | "reshapeRaisedAreaControl"
  | "moveAreaAnchor"
  | "moveAreaCubicControl"
  | "updateCirclePrimitiveDrag"
  | "updateNaturalTerrainDrag"
  | "reshapeWallControl"
  | "moveWallPortal"
  | "moveWall"
  | "resizeWallEndpoint"
  | "updateWall"
  | "updateCircle"
  | "hoverRaisedArea"
  | "hoverPortal"
  | "moveEnemy"
  | "moveTerrain"
  | "hoverEnemy"
  | "hoverPlacement"
>;

type UseTacticalEditorCanvasPointerMoveOptions = PointerMoveProps & {
  map: TacticalEditorMapSize;
  panDrag: EditorPanDrag | null;
  setCamera?: (camera: TacticalEditorCamera) => void;
  rectangleDraft: { pointerId: number } | null;
  penNodeDrag: { pointerId: number } | null;
  mapPoint: (event: ReactPointerEvent<SVGElement>) => EditorMapPoint | null;
  mapVertex: (event: ReactPointerEvent<SVGElement>) => { x: number; y: number } | null;
  moveRectangle: (pointerId: number, point: { x: number; y: number }, constrainSquare: boolean) => boolean;
  movePenNode: (pointerId: number, point: { x: number; y: number }) => boolean;
  localMapPoint?: (event: TacticalEditorClientPointer) => { x: number; y: number } | null;
};

export const useTacticalEditorCanvasPointerMove = ({
  map,
  panDrag,
  setCamera,
  rectangleDraft,
  penNodeDrag,
  placementKind,
  enemyKind,
  wallDraft,
  circleDraft,
  dragTracingTemplate,
  dragConstrainedArea,
  dragRaisedAreaControl,
  dragAreaAnchor,
  dragAreaCubicControl,
  dragCirclePrimitive,
  dragNaturalTerrain,
  dragWallControl,
  dragWallPortal,
  dragWallMove,
  dragWallEndpoint,
  dragEnemy,
  dragPlacement,
  mapPoint,
  mapVertex,
  moveRectangle,
  movePenNode,
  localMapPoint = tacticalEditorLocalMapPoint,
  transformTracingTemplate,
  updateConstrainedAreaDrag,
  reshapeRaisedAreaControl,
  moveAreaAnchor,
  moveAreaCubicControl,
  updateCirclePrimitiveDrag,
  updateNaturalTerrainDrag,
  reshapeWallControl,
  moveWallPortal,
  moveWall,
  resizeWallEndpoint,
  updateWall,
  updateCircle,
  hoverRaisedArea,
  hoverPortal,
  moveEnemy,
  moveTerrain,
  hoverEnemy,
  hoverPlacement,
}: UseTacticalEditorCanvasPointerMoveOptions) => useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
  if (panDrag && event.pointerId === panDrag.pointerId) {
    if (setCamera) {
      setCamera(panTacticalEditorCamera(
        panDrag.camera,
        { x: event.clientX - panDrag.start.x, y: event.clientY - panDrag.start.y },
        panDrag.viewport,
        map,
      ));
    }
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
    if (vertex) moveRectangle(event.pointerId, vertex, event.shiftKey);
    return;
  }
  if (penNodeDrag && event.pointerId === penNodeDrag.pointerId) {
    const local = localMapPoint(event);
    if (local) movePenNode(event.pointerId, { x: local.x, y: local.y });
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
}, [
  circleDraft,
  dragAreaAnchor,
  dragAreaCubicControl,
  dragCirclePrimitive,
  dragConstrainedArea,
  dragEnemy,
  dragNaturalTerrain,
  dragPlacement,
  dragRaisedAreaControl,
  dragTracingTemplate,
  dragWallControl,
  dragWallEndpoint,
  dragWallMove,
  dragWallPortal,
  enemyKind,
  hoverEnemy,
  hoverPlacement,
  hoverPortal,
  hoverRaisedArea,
  localMapPoint,
  map,
  mapPoint,
  mapVertex,
  moveAreaAnchor,
  moveAreaCubicControl,
  moveEnemy,
  movePenNode,
  moveRectangle,
  moveTerrain,
  moveWall,
  moveWallPortal,
  panDrag,
  penNodeDrag,
  placementKind,
  rectangleDraft,
  reshapeRaisedAreaControl,
  reshapeWallControl,
  resizeWallEndpoint,
  setCamera,
  transformTracingTemplate,
  updateCircle,
  updateCirclePrimitiveDrag,
  updateConstrainedAreaDrag,
  updateNaturalTerrainDrag,
  updateWall,
  wallDraft,
]);
