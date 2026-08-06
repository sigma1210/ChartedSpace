/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useTacticalEditorCanvasPointerDown } from "../useTacticalEditorCanvasPointerDown";
import {
  CIRCLE_AREA_TOOL_ID,
  CIRCLE_TOOL_ID,
  DOOR_TOOL_ID,
  PEN_AREA_TOOL_ID,
  RAMP_TOOL_ID,
  RECTANGLE_AREA_TOOL_ID,
  TREE_TOOL_ID,
  WALL_TOOL_ID,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

type Options = Parameters<typeof useTacticalEditorCanvasPointerDown>[0];

const point = { x: 4, y: 5 };
const vertex = { x: 4.5, y: 5.5 };

const makeOptions = (overrides: Partial<Options> = {}): Options => ({
  handToolActive: false,
  placementKind: null,
  enemyKind: null,
  wallDraft: null,
  spacePressed: false,
  camera: { centerX: 10, centerY: 6, zoom: 1 },
  setPanDrag: jest.fn(),
  mapPoint: jest.fn(() => point),
  mapVertex: jest.fn(() => vertex),
  localMapPoint: jest.fn(() => point),
  placeWallPortal: jest.fn(),
  beginRectangle: jest.fn(),
  beginPenNode: jest.fn(),
  beginCircle: jest.fn(),
  beginWall: jest.fn(),
  finishWall: jest.fn(),
  beginOrFinishRamp: jest.fn(),
  placeEnemy: jest.fn(),
  placeTerrain: jest.fn(),
  selectPlacement: jest.fn(),
  selectEnemy: jest.fn(),
  selectWall: jest.fn(),
  selectRaisedArea: jest.fn(),
  selectPrimitive: jest.fn(),
  selectNaturalTerrain: jest.fn(),
  selectElevationTransition: jest.fn(),
  selectPortal: jest.fn(),
  selectFire: jest.fn(),
  ...overrides,
});

const makeEvent = (overrides: Record<string, unknown> = {}) => {
  const currentTarget = {
    setPointerCapture: jest.fn(),
    getBoundingClientRect: jest.fn(() => ({ width: 800, height: 500 })),
  };
  const event = {
    button: 0,
    pointerId: 7,
    clientX: 120,
    clientY: 90,
    preventDefault: jest.fn(),
    currentTarget,
    ...overrides,
  } as unknown as ReactPointerEvent<SVGSVGElement>;
  return { event, currentTarget };
};

const runPointerDown = (options: Options, event = makeEvent()) => {
  const { result } = renderHook(() => useTacticalEditorCanvasPointerDown(options));
  act(() => result.current(event.event));
  return event;
};

describe("useTacticalEditorCanvasPointerDown", () => {
  it.each([
    ["middle mouse", { button: 1 }],
    ["space", { button: 0 }, { spacePressed: true }],
    ["hand tool", { button: 0 }, { handToolActive: true }],
  ])("starts canvas panning with %s", (_label, eventOverrides, optionOverrides = {}) => {
    const options = makeOptions(optionOverrides);
    const event = makeEvent(eventOverrides);
    runPointerDown(options, event);

    expect(event.event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.currentTarget.setPointerCapture).toHaveBeenCalledWith(7);
    expect(options.setPanDrag).toHaveBeenCalledWith({
      pointerId: 7,
      start: { x: 120, y: 90 },
      camera: { centerX: 10, centerY: 6, zoom: 1 },
      viewport: { width: 800, height: 500 },
    });
    expect(options.mapPoint).not.toHaveBeenCalled();
  });

  it("places a wall portal from the unsnapped local point", () => {
    const options = makeOptions({ placementKind: DOOR_TOOL_ID });
    runPointerDown(options);

    expect(options.localMapPoint).toHaveBeenCalledTimes(1);
    expect(options.placeWallPortal).toHaveBeenCalledWith(point);
    expect(options.mapVertex).not.toHaveBeenCalled();
  });

  it.each([
    [RECTANGLE_AREA_TOOL_ID, "beginRectangle"],
    [PEN_AREA_TOOL_ID, "beginPenNode"],
    [CIRCLE_TOOL_ID, "beginCircle"],
    [CIRCLE_AREA_TOOL_ID, "beginCircle"],
  ] as const)("routes %s through %s and captures the pointer", (placementKind, callbackName) => {
    const options = makeOptions({ placementKind });
    const event = runPointerDown(options);

    const callback = options[callbackName] as jest.Mock;
    expect(callback).toHaveBeenCalledWith(...(callbackName === "beginCircle" ? [vertex] : [7, vertex]));
    expect(event.currentTarget.setPointerCapture).toHaveBeenCalledWith(7);
  });

  it("starts a wall when there is no awaiting wall endpoint", () => {
    const options = makeOptions({ placementKind: WALL_TOOL_ID });
    const event = runPointerDown(options);

    expect(options.beginWall).toHaveBeenCalledWith(vertex);
    expect(options.finishWall).not.toHaveBeenCalled();
    expect(event.currentTarget.setPointerCapture).toHaveBeenCalledWith(7);
  });

  it("finishes an awaiting wall without recapturing the pointer", () => {
    const options = makeOptions({
      placementKind: WALL_TOOL_ID,
      wallDraft: { from: point, to: vertex, curved: false, awaitingEnd: true },
    });
    const event = runPointerDown(options);

    expect(options.finishWall).toHaveBeenCalledWith(vertex);
    expect(options.beginWall).not.toHaveBeenCalled();
    expect(event.currentTarget.setPointerCapture).not.toHaveBeenCalled();
  });

  it("routes ramp placement through the mapped cell point", () => {
    const options = makeOptions({ placementKind: RAMP_TOOL_ID });
    runPointerDown(options);

    expect(options.beginOrFinishRamp).toHaveBeenCalledWith(point);
    expect(options.placeTerrain).not.toHaveBeenCalled();
  });

  it("places the selected enemy before considering terrain placement", () => {
    const options = makeOptions({ placementKind: TREE_TOOL_ID, enemyKind: "gang-member" });
    runPointerDown(options);

    expect(options.placeEnemy).toHaveBeenCalledWith(point);
    expect(options.placeTerrain).not.toHaveBeenCalled();
  });

  it("places the selected terrain tool when no enemy tool is active", () => {
    const options = makeOptions({ placementKind: TREE_TOOL_ID });
    runPointerDown(options);

    expect(options.placeTerrain).toHaveBeenCalledWith(point);
    expect(options.placeEnemy).not.toHaveBeenCalled();
  });

  it("clears every selection when the empty canvas is selected", () => {
    const options = makeOptions();
    runPointerDown(options);

    expect(options.selectPlacement).toHaveBeenCalledWith(null);
    expect(options.selectEnemy).toHaveBeenCalledWith(null);
    expect(options.selectWall).toHaveBeenCalledWith(null);
    expect(options.selectRaisedArea).toHaveBeenCalledWith(null);
    expect(options.selectPrimitive).toHaveBeenCalledWith(null);
    expect(options.selectNaturalTerrain).toHaveBeenCalledWith(null);
    expect(options.selectElevationTransition).toHaveBeenCalledWith(null);
    expect(options.selectPortal).toHaveBeenCalledWith(null);
    expect(options.selectFire).toHaveBeenCalledWith(null);
  });

  it("does nothing when pointer coordinates cannot be resolved", () => {
    const options = makeOptions({ mapPoint: jest.fn(() => null) });
    runPointerDown(options);

    expect(options.placeEnemy).not.toHaveBeenCalled();
    expect(options.placeTerrain).not.toHaveBeenCalled();
    expect(options.selectPlacement).not.toHaveBeenCalled();
  });
});
