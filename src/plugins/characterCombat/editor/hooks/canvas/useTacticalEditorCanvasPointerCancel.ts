"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { TacticalEditorDraftPreviewProps } from "@/plugins/characterCombat/editor/lib/tacticalEditorDraftPreviewProps";
import type { EditorPanDrag } from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

type PointerCancelProps = Pick<TacticalEditorDraftPreviewProps,
  | "cancelTracingTemplateDrag"
  | "cancelConstrainedAreaDrag"
  | "cancelRaisedAreaControlDrag"
  | "cancelAreaAnchorDrag"
  | "cancelAreaCubicControlDrag"
  | "finishCirclePrimitiveDrag"
  | "finishNaturalTerrainDrag"
  | "cancelCircle"
  | "cancelWallControlDrag"
  | "cancelWallPortalDrag"
  | "cancelWallMove"
  | "cancelWallEndpointDrag"
  | "cancelWall"
  | "endDrag"
>;

type UseTacticalEditorCanvasPointerCancelOptions = PointerCancelProps & {
  setPanDrag: Dispatch<SetStateAction<EditorPanDrag | null>>;
  cancelDrawingDrafts: () => void;
};

export const useTacticalEditorCanvasPointerCancel = ({
  setPanDrag,
  cancelDrawingDrafts,
  cancelTracingTemplateDrag,
  cancelConstrainedAreaDrag,
  cancelRaisedAreaControlDrag,
  cancelAreaAnchorDrag,
  cancelAreaCubicControlDrag,
  finishCirclePrimitiveDrag,
  finishNaturalTerrainDrag,
  cancelCircle,
  cancelWallControlDrag,
  cancelWallPortalDrag,
  cancelWallMove,
  cancelWallEndpointDrag,
  cancelWall,
  endDrag,
}: UseTacticalEditorCanvasPointerCancelOptions) => useCallback(() => {
  setPanDrag(null);
  cancelDrawingDrafts();
  cancelTracingTemplateDrag();
  cancelConstrainedAreaDrag();
  cancelRaisedAreaControlDrag();
  cancelAreaAnchorDrag();
  cancelAreaCubicControlDrag();
  finishCirclePrimitiveDrag();
  finishNaturalTerrainDrag();
  cancelCircle();
  cancelWallControlDrag();
  cancelWallPortalDrag();
  cancelWallMove();
  cancelWallEndpointDrag();
  cancelWall();
  endDrag();
}, [
  cancelAreaAnchorDrag,
  cancelAreaCubicControlDrag,
  cancelCircle,
  cancelConstrainedAreaDrag,
  cancelDrawingDrafts,
  cancelRaisedAreaControlDrag,
  cancelTracingTemplateDrag,
  cancelWall,
  cancelWallControlDrag,
  cancelWallEndpointDrag,
  cancelWallMove,
  cancelWallPortalDrag,
  endDrag,
  finishCirclePrimitiveDrag,
  finishNaturalTerrainDrag,
  setPanDrag,
]);
