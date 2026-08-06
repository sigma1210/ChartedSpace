/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { useTacticalEditorCanvasPointerCancel } from "../useTacticalEditorCanvasPointerCancel";

describe("useTacticalEditorCanvasPointerCancel", () => {
  it("runs the existing pointer-cancel cleanup sequence in order", () => {
    const calls: string[] = [];
    const record = (name: string) => jest.fn(() => calls.push(name));
    const setPanDrag = jest.fn((value) => {
      expect(value).toBeNull();
      calls.push("setPanDrag");
    });
    const options = {
      setPanDrag,
      cancelDrawingDrafts: record("cancelDrawingDrafts"),
      cancelTracingTemplateDrag: record("cancelTracingTemplateDrag"),
      cancelConstrainedAreaDrag: record("cancelConstrainedAreaDrag"),
      cancelRaisedAreaControlDrag: record("cancelRaisedAreaControlDrag"),
      cancelAreaAnchorDrag: record("cancelAreaAnchorDrag"),
      cancelAreaCubicControlDrag: record("cancelAreaCubicControlDrag"),
      finishCirclePrimitiveDrag: record("finishCirclePrimitiveDrag"),
      finishNaturalTerrainDrag: record("finishNaturalTerrainDrag"),
      cancelCircle: record("cancelCircle"),
      cancelWallControlDrag: record("cancelWallControlDrag"),
      cancelWallPortalDrag: record("cancelWallPortalDrag"),
      cancelWallMove: record("cancelWallMove"),
      cancelWallEndpointDrag: record("cancelWallEndpointDrag"),
      cancelWall: record("cancelWall"),
      endDrag: record("endDrag"),
    };
    const { result } = renderHook(() => useTacticalEditorCanvasPointerCancel(options));

    act(() => result.current());

    expect(calls).toEqual([
      "setPanDrag",
      "cancelDrawingDrafts",
      "cancelTracingTemplateDrag",
      "cancelConstrainedAreaDrag",
      "cancelRaisedAreaControlDrag",
      "cancelAreaAnchorDrag",
      "cancelAreaCubicControlDrag",
      "finishCirclePrimitiveDrag",
      "finishNaturalTerrainDrag",
      "cancelCircle",
      "cancelWallControlDrag",
      "cancelWallPortalDrag",
      "cancelWallMove",
      "cancelWallEndpointDrag",
      "cancelWall",
      "endDrag",
    ]);
    for (const callback of Object.values(options)) expect(callback).toHaveBeenCalledTimes(1);
  });
});
