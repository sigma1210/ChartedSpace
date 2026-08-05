/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { useTacticalEditorTerrainPlacementRouter } from "../useTacticalEditorTerrainPlacementRouter";

const point = { x: 4, y: 7 };

const renderRouter = ({
  activeDrawingTool = "console-1x1",
  elevationHandled = false,
  fireHandled = false,
  naturalHandled = false,
} = {}) => {
  const placeElevationTransition = jest.fn(() => elevationHandled);
  const placeFire = jest.fn(() => fireHandled);
  const placeNaturalTerrain = jest.fn(() => naturalHandled);
  const placeOrdinaryTerrain = jest.fn();
  return {
    placeElevationTransition,
    placeFire,
    placeNaturalTerrain,
    placeOrdinaryTerrain,
    ...renderHook(() => useTacticalEditorTerrainPlacementRouter({
      activeDrawingTool,
      placeElevationTransition,
      placeFire,
      placeNaturalTerrain,
      placeOrdinaryTerrain,
    })),
  };
};

describe("useTacticalEditorTerrainPlacementRouter", () => {
  it("does nothing without an active placement tool", () => {
    const router = renderRouter({ activeDrawingTool: null });

    act(() => router.result.current(point));

    expect(router.placeElevationTransition).not.toHaveBeenCalled();
    expect(router.placeFire).not.toHaveBeenCalled();
    expect(router.placeNaturalTerrain).not.toHaveBeenCalled();
    expect(router.placeOrdinaryTerrain).not.toHaveBeenCalled();
  });

  it("stops after an elevation transition handles placement", () => {
    const router = renderRouter({ elevationHandled: true });

    act(() => router.result.current(point));

    expect(router.placeElevationTransition).toHaveBeenCalledWith(point);
    expect(router.placeFire).not.toHaveBeenCalled();
    expect(router.placeNaturalTerrain).not.toHaveBeenCalled();
    expect(router.placeOrdinaryTerrain).not.toHaveBeenCalled();
  });

  it("routes fire after elevation declines placement", () => {
    const router = renderRouter({ fireHandled: true });

    act(() => router.result.current(point));

    expect(router.placeElevationTransition).toHaveBeenCalledWith(point);
    expect(router.placeFire).toHaveBeenCalledWith(point);
    expect(router.placeNaturalTerrain).not.toHaveBeenCalled();
    expect(router.placeOrdinaryTerrain).not.toHaveBeenCalled();
  });

  it("routes natural terrain after elevation and fire decline placement", () => {
    const router = renderRouter({ naturalHandled: true });

    act(() => router.result.current(point));

    expect(router.placeElevationTransition).toHaveBeenCalledWith(point);
    expect(router.placeFire).toHaveBeenCalledWith(point);
    expect(router.placeNaturalTerrain).toHaveBeenCalledWith(point);
    expect(router.placeOrdinaryTerrain).not.toHaveBeenCalled();
  });

  it("falls back to ordinary terrain when specialized routes decline placement", () => {
    const router = renderRouter();

    act(() => router.result.current(point));

    expect(router.placeElevationTransition).toHaveBeenCalledWith(point);
    expect(router.placeFire).toHaveBeenCalledWith(point);
    expect(router.placeNaturalTerrain).toHaveBeenCalledWith(point);
    expect(router.placeOrdinaryTerrain).toHaveBeenCalledWith(point);
  });
});
