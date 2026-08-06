/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useTacticalEditorLayerPointerHandlers } from "../useTacticalEditorLayerPointerHandlers";

type Options = Parameters<typeof useTacticalEditorLayerPointerHandlers>[0];

const point = { x: 4.25, y: 5.75 };

const setup = (overrides: Partial<Options> = {}) => {
  const calls: string[] = [];
  const options: Options = {
    localMapPoint: jest.fn(() => {
      calls.push("localMapPoint");
      return point;
    }),
    beginTracingTemplateDrag: jest.fn((kind, dragPoint) => calls.push(`beginTracingTemplateDrag:${kind}:${dragPoint.x},${dragPoint.y}`)),
    insertAreaAnchor: jest.fn((id, segmentIndex, anchor) => calls.push(`insertAreaAnchor:${id}:${segmentIndex}:${anchor.x},${anchor.y}`)),
    ...overrides,
  };
  const hook = renderHook(() => useTacticalEditorLayerPointerHandlers(options));
  return { calls, options, result: hook.result };
};

const makeEvent = (calls: string[]) => ({
  pointerId: 7,
  preventDefault: jest.fn(() => calls.push("preventDefault")),
  stopPropagation: jest.fn(() => calls.push("stopPropagation")),
  currentTarget: {
    setPointerCapture: jest.fn((pointerId) => calls.push(`capture:${pointerId}`)),
  },
}) as unknown as ReactPointerEvent<SVGElement>;

describe("useTacticalEditorLayerPointerHandlers", () => {
  it("preserves tracing-template coordinate, capture, and drag-start order", () => {
    const { calls, result } = setup();
    act(() => result.current.handleBeginTracingTemplateDrag("move", makeEvent(calls)));

    expect(calls).toEqual([
      "localMapPoint",
      "capture:7",
      "beginTracingTemplateDrag:move:4.25,5.75",
    ]);
  });

  it("does not capture or begin tracing-template dragging when coordinates cannot resolve", () => {
    const { calls, options, result } = setup({ localMapPoint: jest.fn(() => null) });
    act(() => result.current.handleBeginTracingTemplateDrag("rotate", makeEvent(calls)));

    expect(calls).toEqual([]);
    expect(options.beginTracingTemplateDrag).not.toHaveBeenCalled();
  });

  it("preserves area-anchor coordinate, prevention, propagation, and insertion order", () => {
    const { calls, result } = setup();
    act(() => result.current.handleInsertAreaAnchor("area-1", 3, makeEvent(calls)));

    expect(calls).toEqual([
      "localMapPoint",
      "preventDefault",
      "stopPropagation",
      "insertAreaAnchor:area-1:3:4.25,5.75",
    ]);
  });

  it("does not prevent, stop, or insert when area-anchor coordinates cannot resolve", () => {
    const { calls, options, result } = setup({ localMapPoint: jest.fn(() => null) });
    const event = makeEvent(calls);
    act(() => result.current.handleInsertAreaAnchor("area-1", 3, event));

    expect(calls).toEqual([]);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopPropagation).not.toHaveBeenCalled();
    expect(options.insertAreaAnchor).not.toHaveBeenCalled();
  });
});
