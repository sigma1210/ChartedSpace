/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { useTacticalEditorDrawingDraftState } from "../useTacticalEditorDrawingDraftState";

const map = { width: 20, height: 12 };

describe("useTacticalEditorDrawingDraftState", () => {
  it("owns the rectangle lifecycle and derives its normalized preview", () => {
    const { result } = renderHook(() => useTacticalEditorDrawingDraftState(map));

    expect(result.current.rectangleDraft).toBeNull();
    expect(result.current.rectanglePreview).toBeNull();
    act(() => result.current.beginRectangle(4, { x: 8, y: 7 }));
    expect(result.current.rectanglePreview).toEqual({ x: 8, y: 7, width: 0, height: 0 });
    act(() => result.current.moveRectangle(4, { x: 3, y: 2 }, false));
    expect(result.current.rectanglePreview).toEqual({ x: 3, y: 2, width: 5, height: 5 });
  });

  it("rejects rectangle movement and completion from another pointer", () => {
    const { result } = renderHook(() => useTacticalEditorDrawingDraftState(map));
    act(() => result.current.beginRectangle(4, { x: 2, y: 2 }));

    let moved = true;
    let completed: ReturnType<typeof result.current.finishRectangle> = null;
    act(() => {
      moved = result.current.moveRectangle(5, { x: 8, y: 6 }, false);
      completed = result.current.finishRectangle(5, { x: 8, y: 6 }, false);
    });
    expect(moved).toBe(false);
    expect(completed).toBeNull();
    expect(result.current.rectangleDraft?.current).toEqual({ x: 2, y: 2 });
  });

  it("applies square constraints and map clamping while moving rectangles", () => {
    const { result } = renderHook(() => useTacticalEditorDrawingDraftState(map));
    act(() => result.current.beginRectangle(4, { x: 18, y: 10 }));
    act(() => result.current.moveRectangle(4, { x: 25, y: 14 }, true));

    expect(result.current.rectangleDraft?.current).toEqual({ x: 20, y: 12 });
    expect(result.current.rectanglePreview).toEqual({ x: 18, y: 10, width: 2, height: 2 });
  });

  it("finishes rectangles with a final point or the last stored point fallback", () => {
    const { result } = renderHook(() => useTacticalEditorDrawingDraftState(map));
    act(() => result.current.beginRectangle(4, { x: 2, y: 2 }));
    act(() => result.current.moveRectangle(4, { x: 6, y: 5 }, false));
    let completed: ReturnType<typeof result.current.finishRectangle> = null;
    act(() => {
      completed = result.current.finishRectangle(4, null, false);
    });
    expect(completed).toEqual({ start: { x: 2, y: 2 }, end: { x: 6, y: 5 } });
    expect(result.current.rectangleDraft).toBeNull();

    act(() => result.current.beginRectangle(6, { x: 2, y: 2 }));
    act(() => {
      completed = result.current.finishRectangle(6, { x: 7, y: 4 }, true);
    });
    expect(completed).toEqual({ start: { x: 2, y: 2 }, end: { x: 7, y: 7 } });
  });

  it("owns the pen-node begin, move, and finish lifecycle", () => {
    const { result } = renderHook(() => useTacticalEditorDrawingDraftState(map));
    act(() => result.current.beginPenNode(9, { x: 3, y: 4 }));
    expect(result.current.penNodeDrag).toEqual({
      pointerId: 9,
      anchor: { x: 3, y: 4 },
      handle: { x: 3, y: 4 },
    });
    act(() => result.current.movePenNode(9, { x: 5, y: 7 }));
    let completed: ReturnType<typeof result.current.finishPenNode> = null;
    act(() => {
      completed = result.current.finishPenNode(9, { x: 6, y: 8 });
    });
    expect(completed).toEqual({ anchor: { x: 3, y: 4 }, handle: { x: 6, y: 8 } });
    expect(result.current.penNodeDrag).toBeNull();
  });

  it("rejects another pointer and falls back to the last pen handle", () => {
    const { result } = renderHook(() => useTacticalEditorDrawingDraftState(map));
    act(() => result.current.beginPenNode(9, { x: 3, y: 4 }));
    act(() => result.current.movePenNode(9, { x: 5, y: 7 }));

    expect(result.current.movePenNode(8, { x: 1, y: 1 })).toBe(false);
    expect(result.current.finishPenNode(8, null)).toBeNull();
    let completed: ReturnType<typeof result.current.finishPenNode> = null;
    act(() => {
      completed = result.current.finishPenNode(9, null);
    });
    expect(completed).toEqual({ anchor: { x: 3, y: 4 }, handle: { x: 5, y: 7 } });
  });

  it("can cancel only the pen node without clearing a rectangle", () => {
    const { result } = renderHook(() => useTacticalEditorDrawingDraftState(map));
    act(() => {
      result.current.beginRectangle(4, { x: 2, y: 2 });
      result.current.beginPenNode(9, { x: 3, y: 4 });
    });
    act(() => result.current.cancelPenNode());

    expect(result.current.penNodeDrag).toBeNull();
    expect(result.current.rectangleDraft).not.toBeNull();
  });

  it("cancels every active drawing draft on pointer cancellation", () => {
    const { result } = renderHook(() => useTacticalEditorDrawingDraftState(map));
    act(() => {
      result.current.beginRectangle(4, { x: 2, y: 2 });
      result.current.beginPenNode(9, { x: 3, y: 4 });
    });
    act(() => result.current.cancelDrawingDrafts());

    expect(result.current.rectangleDraft).toBeNull();
    expect(result.current.penNodeDrag).toBeNull();
    expect(result.current.rectanglePreview).toBeNull();
  });
});
