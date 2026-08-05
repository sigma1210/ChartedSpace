/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { useTacticalEditorSelectionDeletion } from "../useTacticalEditorSelectionDeletion";

type DeletionOptions = Parameters<typeof useTacticalEditorSelectionDeletion>[0];

const renderDeletion = (overrides: Partial<DeletionOptions> = {}) => {
  const commands = {
    deleteSelectedAreaAnchor: jest.fn(),
    deleteSelectedPlacement: jest.fn(() => true),
    deleteSelectedEnemy: jest.fn(),
    deleteSelectedNaturalTerrain: jest.fn(),
    deleteSelectedPrimitive: jest.fn(() => true),
    deleteSelectedArea: jest.fn(),
    deleteSelectedLegacyRaisedArea: jest.fn(),
    deleteSelectedTerrainRegion: jest.fn(),
    deleteSelectedWall: jest.fn(() => true),
    deleteSelectedPortal: jest.fn(() => true),
    deleteSelectedElevationTransition: jest.fn(() => true),
    deleteSelectedFire: jest.fn(() => true),
  };
  const options: DeletionOptions = {
    primaryTool: "select",
    hasSelectedAreaAnchor: false,
    hasSelectedPlacement: false,
    hasSelectedEnemy: false,
    selectedEnemyLocked: false,
    hasSelectedNaturalTerrain: false,
    hasSelectedPrimitive: false,
    hasSelectedArea: false,
    hasSelectedLegacyRaisedArea: false,
    hasSelectedTerrainRegion: false,
    hasSelectedWall: false,
    hasSelectedPortal: false,
    hasSelectedElevationTransition: false,
    hasSelectedFire: false,
    ...commands,
    ...overrides,
  };
  return { ...renderHook(() => useTacticalEditorSelectionDeletion(options)), commands };
};

describe("useTacticalEditorSelectionDeletion", () => {
  it.each([
    ["hasSelectedPlacement", "deleteSelectedPlacement"],
    ["hasSelectedEnemy", "deleteSelectedEnemy"],
    ["hasSelectedNaturalTerrain", "deleteSelectedNaturalTerrain"],
    ["hasSelectedPrimitive", "deleteSelectedPrimitive"],
    ["hasSelectedArea", "deleteSelectedArea"],
    ["hasSelectedLegacyRaisedArea", "deleteSelectedLegacyRaisedArea"],
    ["hasSelectedTerrainRegion", "deleteSelectedTerrainRegion"],
    ["hasSelectedWall", "deleteSelectedWall"],
    ["hasSelectedPortal", "deleteSelectedPortal"],
    ["hasSelectedElevationTransition", "deleteSelectedElevationTransition"],
    ["hasSelectedFire", "deleteSelectedFire"],
  ] as const)("delegates Delete for %s", (selectionKey, commandKey) => {
    const { result, commands } = renderDeletion({ [selectionKey]: true });

    let handled = false;
    act(() => {
      handled = result.current.deleteSelectionForKeyboard("Delete");
    });

    expect(handled).toBe(true);
    expect(commands[commandKey]).toHaveBeenCalledTimes(1);
  });

  it("gives node-anchor deletion priority for either key", () => {
    const { result, commands } = renderDeletion({
      primaryTool: "node",
      hasSelectedAreaAnchor: true,
      hasSelectedPlacement: true,
    });

    act(() => result.current.deleteSelectionForKeyboard("Backspace"));

    expect(commands.deleteSelectedAreaAnchor).toHaveBeenCalledTimes(1);
    expect(commands.deleteSelectedPlacement).not.toHaveBeenCalled();
  });

  it("allows Backspace only for a placement outside node editing", () => {
    const enemy = renderDeletion({ hasSelectedEnemy: true });
    const placement = renderDeletion({ hasSelectedPlacement: true });

    expect(enemy.result.current.deleteSelectionForKeyboard("Backspace")).toBe(false);
    expect(enemy.commands.deleteSelectedEnemy).not.toHaveBeenCalled();
    expect(placement.result.current.deleteSelectionForKeyboard("Backspace")).toBe(true);
    expect(placement.commands.deleteSelectedPlacement).toHaveBeenCalledTimes(1);
  });

  it("does not delete a locked enemy", () => {
    const { result, commands } = renderDeletion({
      hasSelectedEnemy: true,
      selectedEnemyLocked: true,
    });

    expect(result.current.deleteSelectionForKeyboard("Delete")).toBe(false);
    expect(commands.deleteSelectedEnemy).not.toHaveBeenCalled();
  });

  it("returns a domain command's deletion failure", () => {
    const deleteSelectedWall = jest.fn(() => false);
    const { result } = renderDeletion({ hasSelectedWall: true, deleteSelectedWall });

    expect(result.current.deleteSelectionForKeyboard("Delete")).toBe(false);
    expect(deleteSelectedWall).toHaveBeenCalledTimes(1);
  });

  it("returns false when nothing is selected", () => {
    const { result } = renderDeletion();

    expect(result.current.deleteSelectionForKeyboard("Delete")).toBe(false);
  });
});
