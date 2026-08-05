"use client";

type TacticalEditorPreviewDragCompletionOptions = {
  clearCircleDraft: () => void;
  clearAreaAnchorDrag: () => void;
  clearAreaCubicControlDrag: () => void;
  clearConstrainedAreaDrag: () => void;
  clearPlacementDrag: () => void;
  clearEnemyDrag: () => void;
};

export const useTacticalEditorPreviewDragCompletion = ({
  clearCircleDraft,
  clearAreaAnchorDrag,
  clearAreaCubicControlDrag,
  clearConstrainedAreaDrag,
  clearPlacementDrag,
  clearEnemyDrag,
}: TacticalEditorPreviewDragCompletionOptions) => ({
  cancelCircle: clearCircleDraft,
  finishAreaAnchorDrag: clearAreaAnchorDrag,
  finishAreaCubicControlDrag: clearAreaCubicControlDrag,
  finishConstrainedAreaDrag: clearConstrainedAreaDrag,
  endObjectDrag: () => {
    clearPlacementDrag();
    clearEnemyDrag();
  },
});
