/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import type {
  TacticalEditorLayerObject,
  TacticalEditorLayerObjectKind,
} from "../tacticalEditorLayers";
import { useTacticalEditorLayerSelection } from "../useTacticalEditorLayerSelection";

type LayerSelectionOptions = Parameters<typeof useTacticalEditorLayerSelection>[0];

const layerObject = (
  kind: TacticalEditorLayerObjectKind,
  id = `${kind}-1`,
): TacticalEditorLayerObject => ({
  key: `${kind}:${id}`,
  id,
  kind,
  label: id,
  detail: kind,
  reorderable: kind !== "portal",
});

const renderSelection = (overrides: Partial<LayerSelectionOptions> = {}) => {
  const commands = {
    clearEditorSelection: jest.fn(),
    activateSelectTool: jest.fn(),
    selectTerrainPlacement: jest.fn(),
    selectEnemy: jest.fn(),
    selectWall: jest.fn(),
    selectArea: jest.fn(),
    selectTerrainRegion: jest.fn(),
    selectTerrainPrimitive: jest.fn(),
    selectNaturalTerrain: jest.fn(),
    selectElevationTransition: jest.fn(),
    selectPortal: jest.fn(),
    selectFire: jest.fn(),
    showAreaProperties: jest.fn(),
    showObjectProperties: jest.fn(),
  };
  const options: LayerSelectionOptions = {
    lockedLayerKeys: new Set(),
    ...commands,
    ...overrides,
  };
  return {
    ...renderHook(() => useTacticalEditorLayerSelection(options)),
    commands,
  };
};

describe("useTacticalEditorLayerSelection", () => {
  it.each([
    ["terrain-placement", "selectTerrainPlacement"],
    ["enemy", "selectEnemy"],
    ["wall", "selectWall"],
    ["primitive", "selectTerrainPrimitive"],
    ["natural-terrain", "selectNaturalTerrain"],
    ["elevation-transition", "selectElevationTransition"],
    ["portal", "selectPortal"],
  ] as const)("routes %s selection", (kind, command) => {
    const object = layerObject(kind);
    const { result, commands } = renderSelection();

    let selected = false;
    act(() => {
      selected = result.current.selectEditorLayerObject(object);
    });

    expect(selected).toBe(true);
    expect(commands.clearEditorSelection).toHaveBeenCalledTimes(1);
    expect(commands.activateSelectTool).toHaveBeenCalledTimes(1);
    expect(commands[command]).toHaveBeenCalledWith(object.id);
  });

  it("selects modern areas and opens their properties HUD", () => {
    const { result, commands } = renderSelection();

    act(() => result.current.selectEditorLayerObject(layerObject("area", "room-1")));

    expect(commands.selectArea).toHaveBeenCalledWith("room-1");
    expect(commands.showAreaProperties).toHaveBeenCalledTimes(1);
  });

  it("selects legacy raised areas without opening the modern area HUD", () => {
    const { result, commands } = renderSelection();

    act(() => result.current.selectEditorLayerObject(layerObject("raised-area", "legacy-1")));

    expect(commands.selectArea).toHaveBeenCalledWith("legacy-1");
    expect(commands.showAreaProperties).not.toHaveBeenCalled();
  });

  it("selects both identities for a terrain region and opens object properties", () => {
    const { result, commands } = renderSelection();

    act(() => result.current.selectEditorLayerObject(layerObject("terrain-region", "region-1")));

    expect(commands.selectArea).toHaveBeenCalledWith("region-1");
    expect(commands.selectTerrainRegion).toHaveBeenCalledWith("region-1");
    expect(commands.showObjectProperties).toHaveBeenCalledTimes(1);
  });

  it("parses a fire layer ID into map coordinates", () => {
    const { result, commands } = renderSelection();

    act(() => result.current.selectEditorLayerObject(layerObject("fire", "12:7")));

    expect(commands.selectFire).toHaveBeenCalledWith({ x: 12, y: 7 });
  });

  it("does not select a locked non-enemy object", () => {
    const object = layerObject("wall", "locked-wall");
    const { result, commands } = renderSelection({ lockedLayerKeys: new Set([object.key]) });

    expect(result.current.selectEditorLayerObject(object)).toBe(false);
    expect(commands.clearEditorSelection).not.toHaveBeenCalled();
    expect(commands.activateSelectTool).not.toHaveBeenCalled();
    expect(commands.selectWall).not.toHaveBeenCalled();
  });

  it("allows a locked enemy to be selected for unlocking", () => {
    const object = layerObject("enemy", "locked-enemy");
    const { result, commands } = renderSelection({ lockedLayerKeys: new Set([object.key]) });

    expect(result.current.selectEditorLayerObject(object)).toBe(true);
    expect(commands.selectEnemy).toHaveBeenCalledWith("locked-enemy");
  });
});
