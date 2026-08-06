"use client";

import {
  useCallback,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { TacticalEditorDraftPreviewProps } from "@/plugins/characterCombat/editor/lib/tacticalEditorDraftPreviewProps";
import {
  tacticalEditorLocalMapPoint,
  type TacticalEditorClientPointer,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorPointerCoordinates";

type MapPoint = { x: number; y: number };
type TracingTemplateDragKind = Parameters<TacticalEditorDraftPreviewProps["beginTracingTemplateDrag"]>[0];

type LayerPointerProps = Pick<TacticalEditorDraftPreviewProps,
  | "beginTracingTemplateDrag"
  | "insertAreaAnchor"
>;

type UseTacticalEditorLayerPointerHandlersOptions = LayerPointerProps & {
  localMapPoint?: (event: TacticalEditorClientPointer) => MapPoint | null;
};

export const useTacticalEditorLayerPointerHandlers = ({
  localMapPoint = tacticalEditorLocalMapPoint,
  beginTracingTemplateDrag,
  insertAreaAnchor,
}: UseTacticalEditorLayerPointerHandlersOptions) => {
  const handleBeginTracingTemplateDrag = useCallback((kind: TracingTemplateDragKind, event: ReactPointerEvent<SVGElement>) => {
    const point = localMapPoint(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    beginTracingTemplateDrag(kind, point);
  }, [beginTracingTemplateDrag, localMapPoint]);

  const handleInsertAreaAnchor = useCallback((id: string, segmentIndex: number, event: ReactMouseEvent<SVGElement>) => {
    const point = localMapPoint(event);
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();
    insertAreaAnchor(id, segmentIndex, point);
  }, [insertAreaAnchor, localMapPoint]);

  return {
    handleBeginTracingTemplateDrag,
    handleInsertAreaAnchor,
  };
};
