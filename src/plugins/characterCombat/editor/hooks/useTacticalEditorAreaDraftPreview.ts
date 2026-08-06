"use client";

import { tacticalDrawnRaisedAreaCells } from "@/plugins/characterCombat/tacticalDrawnRaisedAreas";
import type { RaisedAreaDraft } from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";
import type {
  TacticalEditorAreaDraftPreview,
  TacticalEditorPenNodeDragPreview,
} from "@/plugins/characterCombat/editor/components/TacticalEditorAreaDraftLayer";
import {
  gridPoint,
  penAreaSegment,
  sameGridPoint,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

export const useTacticalEditorAreaDraftPreview = ({
  draft,
  penNodeDrag,
  map,
}: {
  draft: RaisedAreaDraft | null;
  penNodeDrag: TacticalEditorPenNodeDragPreview | null;
  map: { width: number; height: number };
}): TacticalEditorAreaDraftPreview => {
  if (!draft) return { segment: null, cells: [] };
  const anchor = penNodeDrag?.anchor ?? draft.hover;
  if (sameGridPoint(draft.current, anchor)) return { segment: null, cells: [] };
  const draggedHandle = penNodeDrag && Math.hypot(
    penNodeDrag.handle.x - penNodeDrag.anchor.x,
    penNodeDrag.handle.y - penNodeDrag.anchor.y,
  ) >= 0.1;
  const incomingControl = draggedHandle && penNodeDrag ? {
    x: penNodeDrag.anchor.x * 2 - penNodeDrag.handle.x,
    y: penNodeDrag.anchor.y * 2 - penNodeDrag.handle.y,
  } : null;
  const segment = penAreaSegment(draft.current, anchor, draft.outgoingControl, incomingControl);
  const segments = [...draft.segments, segment];
  if (!sameGridPoint(anchor, draft.start)) {
    segments.push({ kind: "line", from: gridPoint(anchor), to: gridPoint(draft.start) });
  }
  try {
    return {
      segment,
      cells: segments.length >= 3
        ? tacticalDrawnRaisedAreaCells({ id: "__raised-area-preview__", segments }, map.width, map.height)
        : [],
    };
  } catch {
    return { segment, cells: [] };
  }
};
