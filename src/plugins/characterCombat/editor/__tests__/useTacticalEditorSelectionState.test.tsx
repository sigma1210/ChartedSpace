/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { Provider } from "react-redux";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { createAppStore } from "@/store";
import { useTacticalEditorSelectionState } from "../useTacticalEditorSelectionState";

const draft = () => {
  const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
  definition.drawnRaisedAreas = [{ id: "raised-1", segments: [] }];
  definition.drawnTerrainRegions = [{ id: "region-1", kind: "sand", segments: [] }];
  return definition;
};

const renderSelectionState = () => {
  const store = createAppStore();
  const definition = draft();
  const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
  return {
    ...renderHook(() => useTacticalEditorSelectionState(definition), { wrapper }),
    store,
  };
};

describe("useTacticalEditorSelectionState", () => {
  it.each([
    ["terrain placement", "setSelectedPlacementId", "placement-1", "selectedPlacementId", "terrain-placement:placement-1"],
    ["enemy", "setSelectedEnemyId", "enemy-1", "selectedEnemyId", "enemy:enemy-1"],
    ["wall", "setSelectedWallId", "wall-1", "selectedWallId", "wall:wall-1"],
    ["circle", "setSelectedPrimitiveId", "circle-1", "selectedPrimitiveId", "primitive:circle-1"],
    ["natural terrain", "setSelectedNaturalTerrainId", "tree-1", "selectedNaturalTerrainId", "natural-terrain:tree-1"],
    ["elevation transition", "setSelectedElevationTransitionId", "stairs-1", "selectedElevationTransitionId", "elevation-transition:stairs-1"],
    ["portal", "setSelectedPortalId", "door-1", "selectedPortalId", "portal:door-1"],
  ] as const)("selects a %s", (_label, setter, id, selectedField, layerKey) => {
    const { result } = renderSelectionState();

    act(() => result.current[setter](id));

    expect(result.current[selectedField]).toBe(id);
    expect(result.current.selectedLayerKey).toBe(layerKey);
  });

  it("selects and clears a fire position", () => {
    const { result } = renderSelectionState();

    act(() => result.current.setSelectedFire({ x: 7, y: 9 }));
    expect(result.current.selectedFire).toEqual({ x: 7, y: 9 });
    expect(result.current.selectedLayerKey).toBe("fire:7:9");

    act(() => result.current.setSelectedFire(null));
    expect(result.current.selectedFire).toBeNull();
    expect(result.current.selectedLayerKey).toBeNull();
  });

  it.each([
    ["area-1", "area", "area:area-1", null],
    ["raised-1", "legacy-raised-area", "raised-area:raised-1", null],
    ["region-1", "legacy-terrain-region", "terrain-region:region-1", "region-1"],
  ] as const)("classifies area selection %s as %s", (id, expectedKind, layerKey, regionId) => {
    const { result, store } = renderSelectionState();

    act(() => result.current.setSelectedRaisedAreaId(id));

    expect(store.getState().tacticalEditor.selection.object).toEqual({ kind: expectedKind, id });
    expect(result.current.selectedRaisedAreaId).toBe(id);
    expect(result.current.selectedTerrainRegionId).toBe(regionId);
    expect(result.current.selectedLayerKey).toBe(layerKey);
  });

  it("sets an area anchor only on its selected modern area", () => {
    const { result } = renderSelectionState();

    act(() => result.current.setSelectedRaisedAreaId("area-1"));
    act(() => result.current.setSelectedAreaAnchor({ areaId: "area-1", anchorIndex: 2 }));
    expect(result.current.selectedAreaAnchor).toEqual({ areaId: "area-1", anchorIndex: 2 });

    act(() => result.current.setSelectedAreaAnchor({ areaId: "other-area", anchorIndex: 1 }));
    expect(result.current.selectedAreaAnchor).toBeNull();
  });

  it("sets an operation only on its selected terrain placement", () => {
    const { result } = renderSelectionState();

    act(() => result.current.setSelectedOperationId("operation-1"));
    expect(result.current.selectedOperationId).toBeNull();

    act(() => result.current.setSelectedPlacementId("console-1"));
    act(() => result.current.setSelectedOperationId("operation-1"));
    expect(result.current.selectedOperationId).toBe("operation-1");
  });

  it("clears only a matching selection kind", () => {
    const { result, store } = renderSelectionState();

    act(() => result.current.setSelectedWallId("wall-1"));
    act(() => result.current.setSelectedEnemyId(null));
    expect(store.getState().tacticalEditor.selection.object).toEqual({ kind: "wall", id: "wall-1" });

    act(() => result.current.setSelectedWallId(null));
    expect(store.getState().tacticalEditor.selection.object).toBeNull();
  });

  it("clears modern and legacy area selections through the shared setter", () => {
    const { result, store } = renderSelectionState();

    act(() => result.current.setSelectedRaisedAreaId("region-1"));
    act(() => result.current.setSelectedRaisedAreaId(null));

    expect(store.getState().tacticalEditor.selection.object).toBeNull();
    expect(result.current.selectedRaisedAreaId).toBeNull();
    expect(result.current.selectedTerrainRegionId).toBeNull();
  });
});
