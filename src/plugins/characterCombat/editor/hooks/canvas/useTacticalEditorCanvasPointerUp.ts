"use client";

import { useCallback, type Dispatch, type PointerEvent as ReactPointerEvent, type SetStateAction } from "react";
import type {
  TacticalEditorPenNodeDrag,
  TacticalEditorRectangleDraft,
} from "@/plugins/characterCombat/editor/hooks/useTacticalEditorDrawingDraftState";
import type { TacticalEditorDraftPreviewProps } from "@/plugins/characterCombat/editor/lib/tacticalEditorDraftPreviewProps";
import {
  tacticalEditorLocalMapPoint,
  type TacticalEditorClientPointer,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorPointerCoordinates";
import type { EditorPanDrag } from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

type MapPoint = { x: number; y: number };

type PointerUpProps = Pick<TacticalEditorDraftPreviewProps,
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
  | "transformTracingTemplate"
  | "finishTracingTemplateDrag"
  | "updateConstrainedAreaDrag"
  | "finishConstrainedAreaDrag"
  | "reshapeRaisedAreaControl"
  | "finishRaisedAreaControlDrag"
  | "moveAreaAnchor"
  | "finishAreaAnchorDrag"
  | "moveAreaCubicControl"
  | "finishAreaCubicControlDrag"
  | "updateCirclePrimitiveDrag"
  | "finishCirclePrimitiveDrag"
  | "updateNaturalTerrainDrag"
  | "finishNaturalTerrainDrag"
  | "reshapeWallControl"
  | "finishWallControlDrag"
  | "moveWallPortal"
  | "finishWallPortalDrag"
  | "moveWall"
  | "finishWallMove"
  | "resizeWallEndpoint"
  | "finishWallEndpointDrag"
  | "finishWallInteraction"
  | "cancelWall"
  | "createRectangleArea"
  | "commitPenNode"
  | "finishCircle"
  | "cancelCircle"
  | "endDrag"
>;

type UseTacticalEditorCanvasPointerUpOptions = PointerUpProps & {
  panDrag: EditorPanDrag | null;
  setPanDrag: Dispatch<SetStateAction<EditorPanDrag | null>>;
  rectangleDraft: TacticalEditorRectangleDraft | null;
  penNodeDrag: TacticalEditorPenNodeDrag | null;
  mapVertex: (event: ReactPointerEvent<SVGElement>) => MapPoint | null;
  finishRectangle: (pointerId: number, point: MapPoint | null, constrainSquare: boolean) => { start: MapPoint; end: MapPoint } | null;
  finishPenNode: (pointerId: number, point: MapPoint | null) => { anchor: MapPoint; handle: MapPoint } | null;
  localMapPoint?: (event: TacticalEditorClientPointer) => MapPoint | null;
};

export const useTacticalEditorCanvasPointerUp = ({
  panDrag,
  setPanDrag,
  rectangleDraft,
  penNodeDrag,
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
  mapVertex,
  finishRectangle,
  finishPenNode,
  localMapPoint = tacticalEditorLocalMapPoint,
  transformTracingTemplate,
  finishTracingTemplateDrag,
  updateConstrainedAreaDrag,
  finishConstrainedAreaDrag,
  reshapeRaisedAreaControl,
  finishRaisedAreaControlDrag,
  moveAreaAnchor,
  finishAreaAnchorDrag,
  moveAreaCubicControl,
  finishAreaCubicControlDrag,
  updateCirclePrimitiveDrag,
  finishCirclePrimitiveDrag,
  updateNaturalTerrainDrag,
  finishNaturalTerrainDrag,
  reshapeWallControl,
  finishWallControlDrag,
  moveWallPortal,
  finishWallPortalDrag,
  moveWall,
  finishWallMove,
  resizeWallEndpoint,
  finishWallEndpointDrag,
  finishWallInteraction,
  cancelWall,
  createRectangleArea,
  commitPenNode,
  finishCircle,
  cancelCircle,
  endDrag,
}: UseTacticalEditorCanvasPointerUpOptions) => useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
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
    const completed = finishRectangle(event.pointerId, vertex, event.shiftKey);
    if (completed) createRectangleArea(completed.start, completed.end);
    return;
  }
  if (penNodeDrag && event.pointerId === penNodeDrag.pointerId) {
    const local = localMapPoint(event);
    const completed = finishPenNode(event.pointerId, local ? { x: local.x, y: local.y } : null);
    if (completed) commitPenNode(completed.anchor, completed.handle);
    return;
  }
  if (circleDraft) {
    const vertex = mapVertex(event);
    if (vertex) finishCircle(vertex);
    else cancelCircle();
    return;
  }
  endDrag();
}, [
  cancelCircle,
  cancelWall,
  circleDraft,
  commitPenNode,
  createRectangleArea,
  dragAreaAnchor,
  dragAreaCubicControl,
  dragCirclePrimitive,
  dragConstrainedArea,
  dragNaturalTerrain,
  dragRaisedAreaControl,
  dragTracingTemplate,
  dragWallControl,
  dragWallEndpoint,
  dragWallMove,
  dragWallPortal,
  endDrag,
  finishAreaAnchorDrag,
  finishAreaCubicControlDrag,
  finishCircle,
  finishCirclePrimitiveDrag,
  finishConstrainedAreaDrag,
  finishNaturalTerrainDrag,
  finishPenNode,
  finishRaisedAreaControlDrag,
  finishRectangle,
  finishTracingTemplateDrag,
  finishWallControlDrag,
  finishWallEndpointDrag,
  finishWallInteraction,
  finishWallMove,
  finishWallPortalDrag,
  localMapPoint,
  mapVertex,
  moveAreaAnchor,
  moveAreaCubicControl,
  moveWall,
  moveWallPortal,
  panDrag,
  penNodeDrag,
  rectangleDraft,
  reshapeRaisedAreaControl,
  reshapeWallControl,
  resizeWallEndpoint,
  setPanDrag,
  transformTracingTemplate,
  updateCirclePrimitiveDrag,
  updateConstrainedAreaDrag,
  updateNaturalTerrainDrag,
  wallDraft,
]);
