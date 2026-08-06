/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useTacticalEditorMapCoordinates } from "../useTacticalEditorMapCoordinates";
import { PEN_AREA_TOOL_ID, TREE_TOOL_ID } from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

type Options = Parameters<typeof useTacticalEditorMapCoordinates>[0];

const event = { currentTarget: {} } as unknown as ReactPointerEvent<SVGElement>;

const makeOptions = (overrides: Partial<Options> = {}): Options => ({
  map: { width: 20, height: 12 },
  raisedAreaDraft: null,
  placementKind: null,
  snapMode: "grid",
  localMapPoint: jest.fn(() => ({ x: 4.25, y: 5.75 })),
  ...overrides,
});

describe("useTacticalEditorMapCoordinates", () => {
  it("preserves mapped-cell coordinates and nearest-edge metadata", () => {
    const options = makeOptions();
    const { result } = renderHook(() => useTacticalEditorMapCoordinates(options));

    let mapped: ReturnType<typeof result.current.mapPoint> = null;
    act(() => {
      mapped = result.current.mapPoint(event);
    });

    expect(mapped).toEqual({
      x: 4,
      y: 5,
      edgeRotation: 180,
      mapX: 4.25,
      mapY: 5.75,
    });
  });

  it("preserves grid snapping for map vertices", () => {
    const options = makeOptions();
    const { result } = renderHook(() => useTacticalEditorMapCoordinates(options));

    expect(result.current.mapVertex(event)).toEqual({ x: 4, y: 6 });
  });

  it("preserves the selected snap mode and map bounds", () => {
    const options = makeOptions({
      snapMode: "half-grid",
      localMapPoint: jest.fn(() => ({ x: 22.8, y: -1.2 })),
    });
    const { result } = renderHook(() => useTacticalEditorMapCoordinates(options));

    expect(result.current.mapVertex(event)).toEqual({ x: 20, y: 0 });
  });

  it("preserves Pen-area closure snapping to the active draft start", () => {
    const options = makeOptions({
      placementKind: PEN_AREA_TOOL_ID,
      snapMode: "freeform",
      raisedAreaDraft: {
        target: "area",
        start: { x: 3, y: 4 },
        current: { x: 8, y: 6 },
        hover: { x: 8, y: 6 },
        segments: [],
        outgoingControl: null,
      },
      localMapPoint: jest.fn(() => ({ x: 3.2, y: 4.1 })),
    });
    const { result } = renderHook(() => useTacticalEditorMapCoordinates(options));

    expect(result.current.mapVertex(event)).toEqual({ x: 3, y: 4 });
  });

  it("does not apply draft-start snapping for a non-area tool", () => {
    const options = makeOptions({
      placementKind: TREE_TOOL_ID,
      snapMode: "freeform",
      raisedAreaDraft: {
        target: "area",
        start: { x: 3, y: 4 },
        current: { x: 8, y: 6 },
        hover: { x: 8, y: 6 },
        segments: [],
        outgoingControl: null,
      },
      localMapPoint: jest.fn(() => ({ x: 3.2, y: 4.1 })),
    });
    const { result } = renderHook(() => useTacticalEditorMapCoordinates(options));

    expect(result.current.mapVertex(event)).toEqual({ x: 3.2, y: 4.1 });
  });

  it("returns null when local SVG coordinates cannot be resolved", () => {
    const options = makeOptions({ localMapPoint: jest.fn(() => null) });
    const { result } = renderHook(() => useTacticalEditorMapCoordinates(options));

    expect(result.current.mapPoint(event)).toBeNull();
    expect(result.current.mapVertex(event)).toBeNull();
  });
});
