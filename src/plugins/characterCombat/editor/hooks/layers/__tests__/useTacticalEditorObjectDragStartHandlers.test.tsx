/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useTacticalEditorObjectDragStartHandlers } from "../useTacticalEditorObjectDragStartHandlers";

type Options = Parameters<typeof useTacticalEditorObjectDragStartHandlers>[0];

const point = { x: 4.25, y: 5.75 };
const vertex = { x: 4.5, y: 5.5 };

const setup = (overrides: Partial<Options> = {}) => {
  const calls: string[] = [];
  const selection = (name: string) => jest.fn((value: string | null) => calls.push(`${name}:${value}`));
  const options: Options = {
    mapVertex: jest.fn(() => {
      calls.push("mapVertex");
      return vertex;
    }),
    localMapPoint: jest.fn(() => {
      calls.push("localMapPoint");
      return point;
    }),
    selectPlacement: selection("placement"),
    selectEnemy: selection("enemy"),
    selectWall: selection("wall"),
    selectRaisedArea: selection("raisedArea"),
    selectPrimitive: selection("primitive"),
    selectNaturalTerrain: selection("naturalTerrain"),
    selectElevationTransition: selection("elevationTransition"),
    selectPortal: selection("portal"),
    selectFire: jest.fn((value) => calls.push(`fire:${value ? `${value.x},${value.y}` : value}`)),
    beginNaturalTerrainDrag: jest.fn((id, kind, dragPoint) => calls.push(`beginNaturalTerrainDrag:${id}:${kind}:${dragPoint ? `${dragPoint.x},${dragPoint.y}` : dragPoint}`)),
    beginWallMove: jest.fn((id, dragPoint) => calls.push(`beginWallMove:${id}:${dragPoint.x},${dragPoint.y}`)),
    beginWallPortalDrag: jest.fn((id) => calls.push(`beginWallPortalDrag:${id}`)),
    ...overrides,
  };
  const hook = renderHook(() => useTacticalEditorObjectDragStartHandlers(options));
  return { calls, options, result: hook.result };
};

const makeEvent = (calls: string[]) => ({
  pointerId: 7,
  currentTarget: {
    setPointerCapture: jest.fn((pointerId) => calls.push(`capture:${pointerId}`)),
  },
}) as unknown as ReactPointerEvent<SVGElement>;

describe("useTacticalEditorObjectDragStartHandlers", () => {
  it("preserves natural-terrain coordinate, selection, and drag-start order", () => {
    const { calls, result } = setup();
    act(() => result.current.handleBeginNaturalTerrainPositionDrag("tree-1", makeEvent(calls)));

    expect(calls).toEqual([
      "localMapPoint",
      "placement:null",
      "enemy:null",
      "wall:null",
      "raisedArea:null",
      "primitive:null",
      "elevationTransition:null",
      "portal:null",
      "fire:null",
      "naturalTerrain:tree-1",
      "beginNaturalTerrainDrag:tree-1:position:4.25,5.75",
    ]);
  });

  it("still starts natural-terrain dragging when local coordinates cannot be resolved", () => {
    const { calls, result } = setup({
      localMapPoint: jest.fn(() => null),
    });
    act(() => result.current.handleBeginNaturalTerrainPositionDrag("tree-1", makeEvent(calls)));

    expect(calls.at(-1)).toBe("beginNaturalTerrainDrag:tree-1:position:undefined");
  });

  it("preserves the natural-terrain radius drag arguments", () => {
    const { calls, result } = setup();
    act(() => result.current.handleBeginNaturalTerrainRadiusDrag("tree-1"));

    expect(calls).toEqual(["beginNaturalTerrainDrag:tree-1:radius:undefined"]);
  });

  it("preserves wall coordinate, capture, selection, and drag-start order", () => {
    const { calls, result } = setup();
    act(() => result.current.handleBeginWallMove("wall-1", makeEvent(calls)));

    expect(calls).toEqual([
      "mapVertex",
      "capture:7",
      "placement:null",
      "enemy:null",
      "portal:null",
      "fire:null",
      "wall:wall-1",
      "beginWallMove:wall-1:4.5,5.5",
    ]);
  });

  it("does not capture, select, or begin a wall drag when the vertex cannot be resolved", () => {
    const calls: string[] = [];
    const { options, result } = setup({
      mapVertex: jest.fn(() => null),
    });
    act(() => result.current.handleBeginWallMove("wall-1", makeEvent(calls)));

    expect(calls).toEqual([]);
    expect(options.beginWallMove).not.toHaveBeenCalled();
  });

  it("preserves the wall-portal selection and drag-start order", () => {
    const { calls, result } = setup();
    act(() => result.current.handleBeginWallPortalDrag("portal-1"));

    expect(calls).toEqual([
      "placement:null",
      "enemy:null",
      "wall:null",
      "fire:null",
      "portal:portal-1",
      "beginWallPortalDrag:portal-1",
    ]);
  });
});
