/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useTacticalEditorCanvasPointerMove } from "../useTacticalEditorCanvasPointerMove";
import { panTacticalEditorCamera } from "@/plugins/characterCombat/editor/lib/tacticalEditorCamera";
import {
  DOOR_TOOL_ID,
  PEN_AREA_TOOL_ID,
  TREE_TOOL_ID,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

type Options = Parameters<typeof useTacticalEditorCanvasPointerMove>[0];

const map = { width: 20, height: 12 };
const point = { x: 4, y: 5 };
const vertex = { x: 4.5, y: 5.5 };
const local = { x: 4.25, y: 5.75 };

const makeOptions = (overrides: Partial<Options> = {}): Options => ({
  map,
  panDrag: null,
  setCamera: jest.fn(),
  rectangleDraft: null,
  penNodeDrag: null,
  placementKind: null,
  enemyKind: null,
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
  dragEnemy: null,
  dragPlacement: null,
  mapPoint: jest.fn(() => point),
  mapVertex: jest.fn(() => vertex),
  moveRectangle: jest.fn(() => true),
  movePenNode: jest.fn(() => true),
  localMapPoint: jest.fn(() => local),
  transformTracingTemplate: jest.fn(),
  updateConstrainedAreaDrag: jest.fn(),
  reshapeRaisedAreaControl: jest.fn(),
  moveAreaAnchor: jest.fn(),
  moveAreaCubicControl: jest.fn(),
  updateCirclePrimitiveDrag: jest.fn(),
  updateNaturalTerrainDrag: jest.fn(),
  reshapeWallControl: jest.fn(),
  moveWallPortal: jest.fn(),
  moveWall: jest.fn(),
  resizeWallEndpoint: jest.fn(),
  updateWall: jest.fn(),
  updateCircle: jest.fn(),
  hoverRaisedArea: jest.fn(),
  hoverPortal: jest.fn(),
  moveEnemy: jest.fn(),
  moveTerrain: jest.fn(),
  hoverEnemy: jest.fn(),
  hoverPlacement: jest.fn(),
  ...overrides,
});

const makeEvent = (overrides: Record<string, unknown> = {}) => ({
  pointerId: 7,
  clientX: 120,
  clientY: 90,
  shiftKey: false,
  currentTarget: {},
  ...overrides,
}) as unknown as ReactPointerEvent<SVGSVGElement>;

const runPointerMove = (options: Options, event = makeEvent()) => {
  const { result } = renderHook(() => useTacticalEditorCanvasPointerMove(options));
  act(() => result.current(event));
};

const truthy = <Key extends keyof Options>(key: Key) => ({
  [key]: {},
}) as Pick<Options, Key>;

describe("useTacticalEditorCanvasPointerMove", () => {
  it("moves the camera while the captured pan pointer is active", () => {
    const panDrag = {
      pointerId: 7,
      start: { x: 100, y: 70 },
      camera: { centerX: 10, centerY: 6, zoom: 2 },
      viewport: { width: 800, height: 500 },
    };
    const options = makeOptions({ panDrag });
    runPointerMove(options);

    expect(options.setCamera).toHaveBeenCalledWith(panTacticalEditorCamera(
      panDrag.camera,
      { x: 20, y: 20 },
      panDrag.viewport,
      map,
    ));
    expect(options.localMapPoint).not.toHaveBeenCalled();
  });

  it.each([
    ["tracing template", truthy("dragTracingTemplate"), "transformTracingTemplate", local],
    ["constrained area", truthy("dragConstrainedArea"), "updateConstrainedAreaDrag", vertex],
    ["raised-area control", truthy("dragRaisedAreaControl"), "reshapeRaisedAreaControl", local],
    ["area anchor", truthy("dragAreaAnchor"), "moveAreaAnchor", vertex],
    ["area cubic control", truthy("dragAreaCubicControl"), "moveAreaCubicControl", local],
    ["circle primitive", truthy("dragCirclePrimitive"), "updateCirclePrimitiveDrag", vertex],
    ["natural terrain", truthy("dragNaturalTerrain"), "updateNaturalTerrainDrag", local],
    ["wall control", truthy("dragWallControl"), "reshapeWallControl", local],
    ["wall portal", truthy("dragWallPortal"), "moveWallPortal", local],
    ["wall position", truthy("dragWallMove"), "moveWall", vertex],
    ["wall endpoint", truthy("dragWallEndpoint"), "resizeWallEndpoint", vertex],
  ] as const)("routes an active %s drag through its existing callback", (_label, overrides, callbackName, expected) => {
    const options = makeOptions(overrides);
    runPointerMove(options);

    expect(options[callbackName] as jest.Mock).toHaveBeenCalledWith(expected);
    expect(options.mapPoint).not.toHaveBeenCalled();
  });

  it("updates an active wall draft", () => {
    const options = makeOptions({
      wallDraft: { from: point, to: vertex, curved: false, awaitingEnd: false },
    });
    runPointerMove(options);

    expect(options.updateWall).toHaveBeenCalledWith(vertex);
  });

  it("moves a rectangle only for its owning pointer and preserves Shift", () => {
    const options = makeOptions({ rectangleDraft: { pointerId: 7 } });
    runPointerMove(options, makeEvent({ shiftKey: true }));

    expect(options.moveRectangle).toHaveBeenCalledWith(7, vertex, true);
  });

  it("moves a pen node only for its owning pointer", () => {
    const options = makeOptions({ penNodeDrag: { pointerId: 7 } });
    runPointerMove(options);

    expect(options.movePenNode).toHaveBeenCalledWith(7, local);
  });

  it("updates an active circle draft", () => {
    const options = makeOptions({ circleDraft: { center: point, radius: 2 } });
    runPointerMove(options);

    expect(options.updateCircle).toHaveBeenCalledWith(vertex);
  });

  it("updates the Pen-area hover preview", () => {
    const options = makeOptions({ placementKind: PEN_AREA_TOOL_ID });
    runPointerMove(options);

    expect(options.hoverRaisedArea).toHaveBeenCalledWith(vertex);
  });

  it("updates or clears the wall-portal hover from the local point", () => {
    const options = makeOptions({ placementKind: DOOR_TOOL_ID });
    runPointerMove(options);
    expect(options.hoverPortal).toHaveBeenCalledWith(local);

    const unresolved = makeOptions({
      placementKind: DOOR_TOOL_ID,
      localMapPoint: jest.fn(() => null),
    });
    runPointerMove(unresolved);
    expect(unresolved.hoverPortal).toHaveBeenCalledWith(null);
  });

  it("moves an enemy using its existing pointer offset", () => {
    const options = makeOptions({ dragEnemy: { id: "enemy-1", offset: { x: 1, y: 2 } } });
    runPointerMove(options);

    expect(options.moveEnemy).toHaveBeenCalledWith("enemy-1", { x: 3, y: 3 });
    expect(options.moveTerrain).not.toHaveBeenCalled();
  });

  it("moves a terrain placement using its existing pointer offset", () => {
    const options = makeOptions({ dragPlacement: { id: "tree-1", offset: { x: 1, y: 2 } } });
    runPointerMove(options);

    expect(options.moveTerrain).toHaveBeenCalledWith("tree-1", { x: 3, y: 3 });
  });

  it("updates enemy or terrain hover when no drag is active", () => {
    const enemyOptions = makeOptions({ enemyKind: "gang-member" });
    runPointerMove(enemyOptions);
    expect(enemyOptions.hoverEnemy).toHaveBeenCalledWith(point);

    const terrainOptions = makeOptions({ placementKind: TREE_TOOL_ID });
    runPointerMove(terrainOptions);
    expect(terrainOptions.hoverPlacement).toHaveBeenCalledWith(point);
  });

  it("does nothing when ordinary map coordinates cannot be resolved", () => {
    const options = makeOptions({
      placementKind: TREE_TOOL_ID,
      mapPoint: jest.fn(() => null),
    });
    runPointerMove(options);

    expect(options.hoverPlacement).not.toHaveBeenCalled();
  });
});
