/** @jest-environment jsdom */

import { renderHook } from "@testing-library/react";
import type { TacticalTerrainPlacement } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { useTacticalEditorPlacementControls } from "../useTacticalEditorPlacementControls";

const placement = (
  id: string,
  terrainDefinitionId: string,
  rotation: TacticalTerrainPlacement["rotation"] = 0,
): TacticalTerrainPlacement => ({
  id,
  terrainDefinitionId,
  origin: { x: 1, y: 1 },
  rotation,
});

describe("useTacticalEditorPlacementControls", () => {
  it.each([
    { rotation: 0 as const, width: 1, height: 5 },
    { rotation: 90 as const, width: 5, height: 1 },
    { rotation: 180 as const, width: 1, height: 5 },
    { rotation: 270 as const, width: 5, height: 1 },
  ])("returns bridge dimensions for a $rotation-degree rotation", ({ rotation, width, height }) => {
    const bridge = placement("bridge", "bridge-1x5", rotation);
    const { result } = renderHook(() => useTacticalEditorPlacementControls([bridge]));

    expect(result.current).toEqual([{ placement: bridge, size: { width, height } }]);
  });

  it("orders controls from the largest footprint to the smallest", () => {
    const consolePlacement = placement("console", "console-1x1");
    const bridge = placement("bridge", "bridge-1x5");
    const controlRoom = placement("control-room", "control-room");
    const { result } = renderHook(() => useTacticalEditorPlacementControls([
      consolePlacement,
      bridge,
      controlRoom,
    ]));

    expect(result.current.map((control) => control.placement.id)).toEqual([
      "control-room",
      "bridge",
      "console",
    ]);
    expect(result.current.map((control) => control.size)).toEqual([
      { width: 9, height: 9 },
      { width: 1, height: 5 },
      { width: 1, height: 1 },
    ]);
  });

  it("uses a one-square fallback for unknown terrain definitions", () => {
    const unknown = placement("unknown", "missing-definition", 90);
    const { result } = renderHook(() => useTacticalEditorPlacementControls([unknown]));

    expect(result.current).toEqual([{ placement: unknown, size: { width: 1, height: 1 } }]);
  });

  it("does not mutate the scenario placement order", () => {
    const placements = [
      placement("console", "console-1x1"),
      placement("control-room", "control-room"),
      placement("bridge", "bridge-1x5"),
    ];
    const originalOrder = placements.map((item) => item.id);

    renderHook(() => useTacticalEditorPlacementControls(placements));

    expect(placements.map((item) => item.id)).toEqual(originalOrder);
  });
});
