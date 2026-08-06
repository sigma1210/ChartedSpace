/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type {
  TacticalEnemyPlacement,
  TacticalTerrainPlacement,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { useTacticalEditorMarkerInteractionHandlers } from "../useTacticalEditorMarkerInteractionHandlers";

type Options = Parameters<typeof useTacticalEditorMarkerInteractionHandlers>[0];

const point = { x: 7, y: 9 };
const placement: TacticalTerrainPlacement = {
  id: "placement-1",
  terrainDefinitionId: "console-1x1",
  origin: { x: 4, y: 5 },
  rotation: 0,
};
const enemy: TacticalEnemyPlacement = {
  id: "enemy-1",
  type: "gang-member",
  name: "Enemy One",
  position: { x: 2, y: 3 },
  avatarPath: "/enemy.png",
};

const setup = (overrides: Partial<Options> = {}) => {
  const calls: string[] = [];
  const options: Options = {
    mapPoint: jest.fn(() => {
      calls.push("mapPoint");
      return point;
    }),
    selectPlacement: jest.fn((value) => calls.push(`placement:${value}`)),
    selectEnemy: jest.fn((value) => calls.push(`enemy:${value}`)),
    selectFire: jest.fn((value) => calls.push(`fire:${value ? `${value.x},${value.y}` : value}`)),
    beginDrag: jest.fn((drag) => calls.push(`beginDrag:${drag.id}:${drag.offset.x},${drag.offset.y}`)),
    beginEnemyDrag: jest.fn((drag) => calls.push(`beginEnemyDrag:${drag.id}:${drag.offset.x},${drag.offset.y}`)),
    ...overrides,
  };
  const hook = renderHook(() => useTacticalEditorMarkerInteractionHandlers(options));
  return { calls, options, result: hook.result };
};

const makeEvent = <Element extends SVGElement>(calls: string[]) => ({
  pointerId: 7,
  currentTarget: {
    setPointerCapture: jest.fn((pointerId) => calls.push(`capture:${pointerId}`)),
  },
}) as unknown as ReactPointerEvent<Element>;

describe("useTacticalEditorMarkerInteractionHandlers", () => {
  it("preserves terrain-placement coordinate, selection, capture, and offset order", () => {
    const { calls, result } = setup();
    act(() => result.current.handleBeginPlacementDrag(placement, makeEvent<SVGRectElement>(calls)));

    expect(calls).toEqual([
      "mapPoint",
      "fire:null",
      "placement:placement-1",
      "capture:7",
      "beginDrag:placement-1:3,4",
    ]);
  });

  it("does not change selection or begin placement dragging when coordinates cannot resolve", () => {
    const { calls, options, result } = setup({ mapPoint: jest.fn(() => null) });
    act(() => result.current.handleBeginPlacementDrag(placement, makeEvent<SVGRectElement>(calls)));

    expect(calls).toEqual([]);
    expect(options.selectPlacement).not.toHaveBeenCalled();
    expect(options.beginDrag).not.toHaveBeenCalled();
  });

  it("preserves fire-cell selection order", () => {
    const { calls, result } = setup();
    act(() => result.current.handleSelectFire({ x: 5, y: 6 }));

    expect(calls).toEqual([
      "placement:null",
      "enemy:null",
      "fire:5,6",
    ]);
  });

  it("preserves enemy selection, coordinate, capture, and offset order", () => {
    const { calls, result } = setup();
    act(() => result.current.handleBeginEnemyDrag(enemy, makeEvent<SVGGElement>(calls)));

    expect(calls).toEqual([
      "placement:null",
      "fire:null",
      "enemy:enemy-1",
      "mapPoint",
      "capture:7",
      "beginEnemyDrag:enemy-1:5,6",
    ]);
  });

  it("keeps the enemy selection changes when coordinates cannot resolve", () => {
    const { calls, options, result } = setup({ mapPoint: jest.fn(() => null) });
    act(() => result.current.handleBeginEnemyDrag(enemy, makeEvent<SVGGElement>(calls)));

    expect(calls).toEqual([
      "placement:null",
      "fire:null",
      "enemy:enemy-1",
    ]);
    expect(options.beginEnemyDrag).not.toHaveBeenCalled();
  });
});
