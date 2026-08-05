/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { tacticalEditorLayerKey } from "../tacticalEditorLayers";
import { FIRE_TOOL_ID } from "../tacticalEditorSupport";
import { useTacticalEditorFire } from "../useTacticalEditorFire";

const emptyDraft = (): TacticalScenarioDefinitionFile => ({
  ...cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition),
  fireCells: [],
});

const renderFire = ({
  initialDraft = emptyDraft(),
  activeDrawingTool = null,
  initialSelectedFire = null,
  lockedLayerKeys = new Set<string>(),
}: {
  initialDraft?: TacticalScenarioDefinitionFile;
  activeDrawingTool?: string | null;
  initialSelectedFire?: { x: number; y: number } | null;
  lockedLayerKeys?: ReadonlySet<string>;
} = {}) => renderHook(() => {
  const [draft, setDraft] = useState(initialDraft);
  const [selectedFire, setSelectedFire] = useState(initialSelectedFire);
  const [placementError, setPlacementError] = useState<string | null>(null);
  return {
    ...useTacticalEditorFire({
      draft,
      setDraft,
      activeDrawingTool,
      selectedFire,
      lockedLayerKeys,
      setSelectedFire,
      setPlacementError,
    }),
    draft,
    selectedFire,
    placementError,
  };
});

describe("useTacticalEditorFire", () => {
  it("places fire when the fire tool is active", () => {
    const { result } = renderFire({ activeDrawingTool: FIRE_TOOL_ID });

    let handled = false;
    act(() => { handled = result.current.placeFire({ x: 5, y: 6 }); });

    expect(handled).toBe(true);
    expect(result.current.draft.fireCells).toEqual([{ x: 5, y: 6 }]);
    expect(result.current.placementError).toBeNull();
  });

  it("does not handle placement for another drawing tool", () => {
    const { result } = renderFire({ activeDrawingTool: "scenario-tree" });

    expect(result.current.placeFire({ x: 5, y: 6 })).toBe(false);
    expect(result.current.draft.fireCells).toEqual([]);
  });

  it("rejects out-of-bounds and duplicate placement", () => {
    const draft = { ...emptyDraft(), fireCells: [{ x: 5, y: 6 }] };
    const { result } = renderFire({ initialDraft: draft, activeDrawingTool: FIRE_TOOL_ID });

    act(() => { result.current.placeFire({ x: -1, y: 0 }); });
    expect(result.current.placementError).toBe("Fire must be placed inside the map.");
    act(() => { result.current.placeFire({ x: 5, y: 6 }); });
    expect(result.current.placementError).toBe("A fire already exists at 5:6.");
    expect(result.current.draft.fireCells).toEqual([{ x: 5, y: 6 }]);
  });

  it("selects and deletes an unlocked fire cell", () => {
    const { result } = renderFire({ initialDraft: { ...emptyDraft(), fireCells: [{ x: 5, y: 6 }] } });

    act(() => result.current.selectFire({ x: 5, y: 6 }));
    expect(result.current.selectedFire).toEqual({ x: 5, y: 6 });
    let deleted = false;
    act(() => { deleted = result.current.deleteSelectedFire(); });

    expect(deleted).toBe(true);
    expect(result.current.draft.fireCells).toEqual([]);
    expect(result.current.selectedFire).toBeNull();
  });

  it("does not select or delete a locked fire cell", () => {
    const point = { x: 5, y: 6 };
    const lockedLayerKeys = new Set([tacticalEditorLayerKey("fire", "5:6")]);
    const unselected = renderFire({
      initialDraft: { ...emptyDraft(), fireCells: [point] },
      lockedLayerKeys,
    });

    act(() => unselected.result.current.selectFire(point));
    expect(unselected.result.current.selectedFire).toBeNull();

    const selected = renderFire({
      initialDraft: { ...emptyDraft(), fireCells: [point] },
      initialSelectedFire: point,
      lockedLayerKeys,
    });
    expect(selected.result.current.deleteSelectedFire()).toBe(false);
    expect(selected.result.current.draft.fireCells).toEqual([point]);
  });
});
