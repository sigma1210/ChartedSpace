/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { useTacticalEditorPreviewSelection } from "../useTacticalEditorPreviewSelection";

const draft = () => {
  const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
  definition.drawnAreas = [{
    id: "room",
    segments: [],
    surface: "none",
    elevation: 0,
    boundary: "none",
  }];
  definition.drawnTerrainRegions = [{ id: "sand", kind: "sand", segments: [] }];
  definition.drawnRaisedAreas = [{ id: "platform", segments: [] }];
  return definition;
};

const renderSelection = ({
  lockedLayerKeys = new Set<string>(),
  selectedAreaAnchor = null as { areaId: string; anchorIndex: number } | null,
} = {}) => {
  const callbacks = {
    selectTerrainPlacement: jest.fn(),
    selectEnemy: jest.fn(),
    setSelectedWallId: jest.fn(),
    setSelectedRaisedAreaId: jest.fn(),
    setSelectedAreaAnchor: jest.fn(),
    setSelectedTerrainRegionId: jest.fn(),
    setSelectedPrimitiveId: jest.fn(),
    setSelectedNaturalTerrainId: jest.fn(),
    setSelectedElevationTransitionId: jest.fn(),
    setSelectedPortalId: jest.fn(),
    selectTerrainPrimitive: jest.fn(),
    selectNaturalTerrain: jest.fn(),
    selectElevationTransition: jest.fn(),
    selectFire: jest.fn(),
    showAreaProperties: jest.fn(),
    showObjectProperties: jest.fn(),
  };
  return {
    callbacks,
    ...renderHook(() => useTacticalEditorPreviewSelection({
      draft: draft(),
      lockedLayerKeys,
      selectedAreaAnchor,
      ...callbacks,
    })),
  };
};

describe("useTacticalEditorPreviewSelection", () => {
  it("forwards the simple preview selections", () => {
    const { result, callbacks } = renderSelection();
    const fire = { x: 3, y: 5 };
    const anchor = { areaId: "room", anchorIndex: 2 };

    act(() => {
      result.current.previewSelectPlacement("console-1");
      result.current.previewSelectEnemy("enemy-1");
      result.current.previewSelectPrimitive("circle-1");
      result.current.previewSelectNaturalTerrain("tree-1");
      result.current.previewSelectElevationTransition("stairs-1");
      result.current.previewSelectPortal("door-1");
      result.current.previewSelectFire(fire);
      result.current.previewSelectAreaAnchor(anchor);
    });

    expect(callbacks.selectTerrainPlacement).toHaveBeenCalledWith("console-1");
    expect(callbacks.selectEnemy).toHaveBeenCalledWith("enemy-1");
    expect(callbacks.selectTerrainPrimitive).toHaveBeenCalledWith("circle-1");
    expect(callbacks.selectNaturalTerrain).toHaveBeenCalledWith("tree-1");
    expect(callbacks.selectElevationTransition).toHaveBeenCalledWith("stairs-1");
    expect(callbacks.setSelectedPortalId).toHaveBeenCalledWith("door-1");
    expect(callbacks.selectFire).toHaveBeenCalledWith(fire);
    expect(callbacks.setSelectedAreaAnchor).toHaveBeenCalledWith(anchor);
  });

  it.each([
    ["terrain-placement:console-1", "previewSelectPlacement", "selectTerrainPlacement"],
    ["wall:wall-1", "previewSelectWall", "setSelectedWallId"],
    ["area:room", "previewSelectRaisedArea", "setSelectedRaisedAreaId"],
    ["primitive:circle-1", "previewSelectPrimitive", "selectTerrainPrimitive"],
    ["natural-terrain:tree-1", "previewSelectNaturalTerrain", "selectNaturalTerrain"],
    ["portal:door-1", "previewSelectPortal", "setSelectedPortalId"],
  ] as const)("rejects locked selection %s", (key, selector, callback) => {
    const { result, callbacks } = renderSelection({ lockedLayerKeys: new Set([key]) });
    const id = key.slice(key.indexOf(":") + 1);

    act(() => result.current[selector](id));

    expect(callbacks[callback]).not.toHaveBeenCalled();
  });

  it("selects a wall and clears conflicting object selections", () => {
    const { result, callbacks } = renderSelection();

    act(() => result.current.previewSelectWall("wall-1"));

    expect(callbacks.setSelectedWallId).toHaveBeenCalledWith("wall-1");
    expect(callbacks.setSelectedRaisedAreaId).toHaveBeenCalledWith(null);
    expect(callbacks.setSelectedPrimitiveId).toHaveBeenCalledWith(null);
    expect(callbacks.setSelectedNaturalTerrainId).toHaveBeenCalledWith(null);
    expect(callbacks.setSelectedElevationTransitionId).toHaveBeenCalledWith(null);
    expect(callbacks.setSelectedPortalId).toHaveBeenCalledWith(null);
  });

  it.each([
    ["room", null, true, false],
    ["sand", "sand", false, true],
    ["platform", null, false, false],
  ] as const)(
    "classifies and selects area-like object %s",
    (id, terrainRegionId, showArea, showObject) => {
      const { result, callbacks } = renderSelection({
        selectedAreaAnchor: { areaId: "other", anchorIndex: 1 },
      });

      act(() => result.current.previewSelectRaisedArea(id));

      expect(callbacks.setSelectedAreaAnchor).toHaveBeenCalledWith(null);
      expect(callbacks.setSelectedRaisedAreaId).toHaveBeenCalledWith(id);
      expect(callbacks.setSelectedTerrainRegionId).toHaveBeenCalledWith(terrainRegionId);
      expect(callbacks.showAreaProperties).toHaveBeenCalledTimes(showArea ? 1 : 0);
      expect(callbacks.showObjectProperties).toHaveBeenCalledTimes(showObject ? 1 : 0);
    },
  );

  it("preserves the selected anchor when its area is selected again", () => {
    const { result, callbacks } = renderSelection({
      selectedAreaAnchor: { areaId: "room", anchorIndex: 1 },
    });

    act(() => result.current.previewSelectRaisedArea("room"));

    expect(callbacks.setSelectedAreaAnchor).not.toHaveBeenCalled();
  });

  it("clears area selection and its anchor", () => {
    const { result, callbacks } = renderSelection({
      selectedAreaAnchor: { areaId: "room", anchorIndex: 1 },
    });

    act(() => result.current.previewSelectRaisedArea(null));

    expect(callbacks.setSelectedAreaAnchor).toHaveBeenCalledWith(null);
    expect(callbacks.setSelectedRaisedAreaId).toHaveBeenCalledWith(null);
    expect(callbacks.setSelectedTerrainRegionId).toHaveBeenCalledWith(null);
  });
});
