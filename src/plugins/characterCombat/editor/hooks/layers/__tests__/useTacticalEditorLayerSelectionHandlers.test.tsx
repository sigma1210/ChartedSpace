/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { useTacticalEditorLayerSelectionHandlers } from "../useTacticalEditorLayerSelectionHandlers";

type Options = Parameters<typeof useTacticalEditorLayerSelectionHandlers>[0];

const setup = () => {
  const calls: string[] = [];
  const selection = (name: string) => jest.fn((value: string | null) => calls.push(`${name}:${value}`));
  const options: Options = {
    selectPlacement: selection("placement"),
    selectEnemy: selection("enemy"),
    selectWall: selection("wall"),
    selectRaisedArea: selection("raisedArea"),
    selectPrimitive: selection("primitive"),
    selectElevationTransition: selection("elevationTransition"),
    selectPortal: selection("portal"),
    selectFire: jest.fn((value) => calls.push(`fire:${value ? `${value.x},${value.y}` : value}`)),
  };
  const hook = renderHook(() => useTacticalEditorLayerSelectionHandlers(options));
  return { calls, result: hook.result };
};

describe("useTacticalEditorLayerSelectionHandlers", () => {
  it("preserves the elevation-transition selection sequence", () => {
    const { calls, result } = setup();
    act(() => result.current.handleSelectElevationTransition("stairs-1"));

    expect(calls).toEqual([
      "placement:null",
      "enemy:null",
      "wall:null",
      "raisedArea:null",
      "portal:null",
      "fire:null",
      "elevationTransition:stairs-1",
    ]);
  });

  it("preserves the legacy-circle selection sequence", () => {
    const { calls, result } = setup();
    act(() => result.current.handleSelectPrimitive("circle-1"));

    expect(calls).toEqual([
      "placement:null",
      "enemy:null",
      "wall:null",
      "raisedArea:null",
      "elevationTransition:null",
      "portal:null",
      "fire:null",
      "primitive:circle-1",
    ]);
  });

  it("preserves the shared drawn-area and raised-area selection sequence", () => {
    const { calls, result } = setup();
    act(() => result.current.handleSelectArea("area-1"));

    expect(calls).toEqual([
      "placement:null",
      "enemy:null",
      "wall:null",
      "portal:null",
      "fire:null",
      "raisedArea:area-1",
    ]);
  });

  it("preserves the terrain-region selection sequence, including its current area reset", () => {
    const { calls, result } = setup();
    act(() => result.current.handleSelectTerrainRegion("region-1"));

    expect(calls).toEqual([
      "placement:null",
      "enemy:null",
      "wall:null",
      "raisedArea:null",
      "elevationTransition:null",
      "portal:null",
      "fire:null",
      "raisedArea:region-1",
    ]);
  });
});
