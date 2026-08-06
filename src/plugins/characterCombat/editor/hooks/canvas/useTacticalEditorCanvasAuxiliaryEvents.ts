"use client";

import { useCallback, type MouseEvent as ReactMouseEvent } from "react";
import type { TacticalEditorDraftPreviewProps } from "@/plugins/characterCombat/editor/lib/tacticalEditorDraftPreviewProps";
import { PEN_AREA_TOOL_ID } from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

type AuxiliaryEventProps = Pick<TacticalEditorDraftPreviewProps,
  | "placementKind"
  | "raisedAreaDraft"
  | "hoverPlacement"
  | "hoverEnemy"
  | "hoverPortal"
  | "closePenArea"
>;

type UseTacticalEditorCanvasAuxiliaryEventsOptions = AuxiliaryEventProps & {
  cancelPenNode: () => void;
};

export const useTacticalEditorCanvasAuxiliaryEvents = ({
  placementKind,
  raisedAreaDraft,
  hoverPlacement,
  hoverEnemy,
  hoverPortal,
  closePenArea,
  cancelPenNode,
}: UseTacticalEditorCanvasAuxiliaryEventsOptions) => {
  const handlePointerLeave = useCallback(() => {
    hoverPlacement(null);
    hoverEnemy(null);
    hoverPortal(null);
  }, [hoverEnemy, hoverPlacement, hoverPortal]);

  const handleDoubleClick = useCallback((event: ReactMouseEvent<SVGSVGElement>) => {
    if (placementKind !== PEN_AREA_TOOL_ID || !raisedAreaDraft) return;
    event.preventDefault();
    closePenArea();
    cancelPenNode();
  }, [cancelPenNode, closePenArea, placementKind, raisedAreaDraft]);

  return { handlePointerLeave, handleDoubleClick };
};
