/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useTacticalEditorCanvasPointerUp } from "../useTacticalEditorCanvasPointerUp";

type Options = Parameters<typeof useTacticalEditorCanvasPointerUp>[0];

const point = { x: 4, y: 5 };
const vertex = { x: 4.5, y: 5.5 };
const local = { x: 4.25, y: 5.75 };

const makeOptions = (overrides: Partial<Options> = {}): Options => ({
  panDrag: null,
  setPanDrag: jest.fn(),
  rectangleDraft: null,
  penNodeDrag: null,
  wallDraft: null,
  circleDraft: null,
  dragTracingTemplate: null,
  dragConstrainedArea: null,
  dragRaisedAreaControl: null,
  dragAreaAnchor: null,
  dragAreaCubicControl: null,
  dragCirclePrimitive: null,
  dragNaturalTerrain: null,
  dragWallControl: null,
  dragWallPortal: null,
  dragWallMove: null,
  dragWallEndpoint: null,
  mapVertex: jest.fn(() => vertex),
  finishRectangle: jest.fn(() => null),
  finishPenNode: jest.fn(() => null),
  localMapPoint: jest.fn(() => local),
  transformTracingTemplate: jest.fn(),
  finishTracingTemplateDrag: jest.fn(),
  updateConstrainedAreaDrag: jest.fn(),
  finishConstrainedAreaDrag: jest.fn(),
  reshapeRaisedAreaControl: jest.fn(),
  finishRaisedAreaControlDrag: jest.fn(),
  moveAreaAnchor: jest.fn(),
  finishAreaAnchorDrag: jest.fn(),
  moveAreaCubicControl: jest.fn(),
  finishAreaCubicControlDrag: jest.fn(),
  updateCirclePrimitiveDrag: jest.fn(),
  finishCirclePrimitiveDrag: jest.fn(),
  updateNaturalTerrainDrag: jest.fn(),
  finishNaturalTerrainDrag: jest.fn(),
  reshapeWallControl: jest.fn(),
  finishWallControlDrag: jest.fn(),
  moveWallPortal: jest.fn(),
  finishWallPortalDrag: jest.fn(),
  moveWall: jest.fn(),
  finishWallMove: jest.fn(),
  resizeWallEndpoint: jest.fn(),
  finishWallEndpointDrag: jest.fn(),
  finishWallInteraction: jest.fn(),
  cancelWall: jest.fn(),
  createRectangleArea: jest.fn(),
  commitPenNode: jest.fn(),
  finishCircle: jest.fn(),
  cancelCircle: jest.fn(),
  endDrag: jest.fn(),
  ...overrides,
});

const makeEvent = (overrides: Record<string, unknown> = {}) => ({
  pointerId: 7,
  shiftKey: false,
  currentTarget: {},
  ...overrides,
}) as unknown as ReactPointerEvent<SVGSVGElement>;

const runPointerUp = (options: Options, event = makeEvent()) => {
  const { result } = renderHook(() => useTacticalEditorCanvasPointerUp(options));
  act(() => result.current(event));
};

const truthy = <Key extends keyof Options>(key: Key) => ({
  [key]: {},
}) as Pick<Options, Key>;

describe("useTacticalEditorCanvasPointerUp", () => {
  it("ends panning only for the owning pointer", () => {
    const panDrag = {
      pointerId: 7,
      start: { x: 100, y: 70 },
      camera: { centerX: 10, centerY: 6, zoom: 2 },
      viewport: { width: 800, height: 500 },
    };
    const options = makeOptions({ panDrag });
    runPointerUp(options);

    expect(options.setPanDrag).toHaveBeenCalledWith(null);
    expect(options.endDrag).not.toHaveBeenCalled();
  });

  it.each([
    ["tracing template", truthy("dragTracingTemplate"), "transformTracingTemplate", "finishTracingTemplateDrag", local],
    ["constrained area", truthy("dragConstrainedArea"), "updateConstrainedAreaDrag", "finishConstrainedAreaDrag", vertex],
    ["raised-area control", truthy("dragRaisedAreaControl"), "reshapeRaisedAreaControl", "finishRaisedAreaControlDrag", local],
    ["area anchor", truthy("dragAreaAnchor"), "moveAreaAnchor", "finishAreaAnchorDrag", vertex],
    ["area cubic control", truthy("dragAreaCubicControl"), "moveAreaCubicControl", "finishAreaCubicControlDrag", local],
    ["circle primitive", truthy("dragCirclePrimitive"), "updateCirclePrimitiveDrag", "finishCirclePrimitiveDrag", vertex],
    ["natural terrain", truthy("dragNaturalTerrain"), "updateNaturalTerrainDrag", "finishNaturalTerrainDrag", local],
    ["wall control", truthy("dragWallControl"), "reshapeWallControl", "finishWallControlDrag", local],
    ["wall portal", truthy("dragWallPortal"), "moveWallPortal", "finishWallPortalDrag", local],
    ["wall position", truthy("dragWallMove"), "moveWall", "finishWallMove", vertex],
    ["wall endpoint", truthy("dragWallEndpoint"), "resizeWallEndpoint", "finishWallEndpointDrag", vertex],
  ] as const)("applies the final %s position before finishing the drag", (_label, overrides, updateName, finishName, expected) => {
    const options = makeOptions(overrides);
    runPointerUp(options);

    const update = options[updateName] as jest.Mock;
    const finish = options[finishName] as jest.Mock;
    expect(update).toHaveBeenCalledWith(expected);
    expect(finish).toHaveBeenCalledTimes(1);
    expect(update.mock.invocationCallOrder[0]).toBeLessThan(finish.mock.invocationCallOrder[0]);
    expect(options.endDrag).not.toHaveBeenCalled();
  });

  it("still finishes an active drag when its final coordinates cannot be resolved", () => {
    const options = makeOptions({
      ...truthy("dragTracingTemplate"),
      localMapPoint: jest.fn(() => null),
    });
    runPointerUp(options);

    expect(options.transformTracingTemplate).not.toHaveBeenCalled();
    expect(options.finishTracingTemplateDrag).toHaveBeenCalledTimes(1);
  });

  it("finishes a wall interaction when the final vertex resolves", () => {
    const options = makeOptions({
      wallDraft: { from: point, to: vertex, curved: false, awaitingEnd: false },
    });
    runPointerUp(options);

    expect(options.finishWallInteraction).toHaveBeenCalledWith(vertex);
    expect(options.cancelWall).not.toHaveBeenCalled();
  });

  it("cancels a wall interaction when the final vertex cannot resolve", () => {
    const options = makeOptions({
      wallDraft: { from: point, to: vertex, curved: false, awaitingEnd: false },
      mapVertex: jest.fn(() => null),
    });
    runPointerUp(options);

    expect(options.finishWallInteraction).not.toHaveBeenCalled();
    expect(options.cancelWall).toHaveBeenCalledTimes(1);
  });

  it("finishes and creates a rectangle for its owning pointer", () => {
    const completed = { start: { x: 2, y: 3 }, end: { x: 8, y: 9 } };
    const options = makeOptions({
      rectangleDraft: { pointerId: 7, start: point, current: vertex },
      finishRectangle: jest.fn(() => completed),
    });
    runPointerUp(options, makeEvent({ shiftKey: true }));

    expect(options.finishRectangle).toHaveBeenCalledWith(7, vertex, true);
    expect(options.createRectangleArea).toHaveBeenCalledWith(completed.start, completed.end);
  });

  it("finishes and commits a pen node for its owning pointer", () => {
    const completed = { anchor: { x: 2, y: 3 }, handle: { x: 8, y: 9 } };
    const options = makeOptions({
      penNodeDrag: { pointerId: 7, anchor: point, handle: vertex },
      finishPenNode: jest.fn(() => completed),
    });
    runPointerUp(options);

    expect(options.finishPenNode).toHaveBeenCalledWith(7, local);
    expect(options.commitPenNode).toHaveBeenCalledWith(completed.anchor, completed.handle);
  });

  it("finishes an active circle when the final vertex resolves", () => {
    const options = makeOptions({ circleDraft: { center: point, radius: 2 } });
    runPointerUp(options);

    expect(options.finishCircle).toHaveBeenCalledWith(vertex);
    expect(options.cancelCircle).not.toHaveBeenCalled();
  });

  it("cancels an active circle when the final vertex cannot resolve", () => {
    const options = makeOptions({
      circleDraft: { center: point, radius: 2 },
      mapVertex: jest.fn(() => null),
    });
    runPointerUp(options);

    expect(options.finishCircle).not.toHaveBeenCalled();
    expect(options.cancelCircle).toHaveBeenCalledTimes(1);
  });

  it("ends ordinary object dragging when no specialized interaction is active", () => {
    const options = makeOptions();
    runPointerUp(options);

    expect(options.endDrag).toHaveBeenCalledTimes(1);
  });
});
