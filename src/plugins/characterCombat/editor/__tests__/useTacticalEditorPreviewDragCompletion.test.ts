/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { useTacticalEditorPreviewDragCompletion } from "../useTacticalEditorPreviewDragCompletion";

const renderDragCompletion = () => {
  const callbacks = {
    clearCircleDraft: jest.fn(),
    clearAreaAnchorDrag: jest.fn(),
    clearAreaCubicControlDrag: jest.fn(),
    clearConstrainedAreaDrag: jest.fn(),
    clearPlacementDrag: jest.fn(),
    clearEnemyDrag: jest.fn(),
  };
  return {
    callbacks,
    ...renderHook(() => useTacticalEditorPreviewDragCompletion(callbacks)),
  };
};

describe("useTacticalEditorPreviewDragCompletion", () => {
  it("clears the matching circle and area interaction state", () => {
    const { result, callbacks } = renderDragCompletion();

    act(() => {
      result.current.cancelCircle();
      result.current.finishAreaAnchorDrag();
      result.current.finishAreaCubicControlDrag();
      result.current.finishConstrainedAreaDrag();
    });

    expect(callbacks.clearCircleDraft).toHaveBeenCalledTimes(1);
    expect(callbacks.clearAreaAnchorDrag).toHaveBeenCalledTimes(1);
    expect(callbacks.clearAreaCubicControlDrag).toHaveBeenCalledTimes(1);
    expect(callbacks.clearConstrainedAreaDrag).toHaveBeenCalledTimes(1);
    expect(callbacks.clearPlacementDrag).not.toHaveBeenCalled();
    expect(callbacks.clearEnemyDrag).not.toHaveBeenCalled();
  });

  it("clears placement and enemy state together when an object drag ends", () => {
    const { result, callbacks } = renderDragCompletion();

    act(() => result.current.endObjectDrag());

    expect(callbacks.clearPlacementDrag).toHaveBeenCalledTimes(1);
    expect(callbacks.clearEnemyDrag).toHaveBeenCalledTimes(1);
  });
});
