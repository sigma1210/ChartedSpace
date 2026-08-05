/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import {
  CIRCLE_TOOL_ID,
  PEN_AREA_TOOL_ID,
  WALL_TOOL_ID,
} from "../../lib/tacticalEditorSupport";
import { useTacticalEditorToolActivation } from "../useTacticalEditorToolActivation";

type ToolActivationOptions = Parameters<typeof useTacticalEditorToolActivation>[0];

const renderActivation = (overrides: Partial<ToolActivationOptions> = {}) => {
  const commands = {
    setPrimaryTool: jest.fn(),
    setDrawingTool: jest.fn(),
    setEnemyTool: jest.fn(),
    closeToolGroup: jest.fn(),
    clearPlacementHover: jest.fn(),
    clearEnemyHover: jest.fn(),
    clearPortalHover: jest.fn(),
    clearWallDraft: jest.fn(),
    clearCircleDraft: jest.fn(),
    clearRampDraft: jest.fn(),
    clearAreaDraft: jest.fn(),
    clearAreaControlDrag: jest.fn(),
    clearPlacementError: jest.fn(),
    showCircleProperties: jest.fn(),
  };
  const options: ToolActivationOptions = {
    areaDraftTarget: null,
    ...commands,
    ...overrides,
  };
  return {
    ...renderHook(() => useTacticalEditorToolActivation(options)),
    commands,
  };
};

const expectCommonDraftsCleared = (
  commands: ReturnType<typeof renderActivation>["commands"],
) => {
  expect(commands.clearPlacementHover).toHaveBeenCalledTimes(1);
  expect(commands.clearEnemyHover).toHaveBeenCalledTimes(1);
  expect(commands.clearPortalHover).toHaveBeenCalledTimes(1);
  expect(commands.clearWallDraft).toHaveBeenCalledTimes(1);
  expect(commands.clearCircleDraft).toHaveBeenCalledTimes(1);
  expect(commands.clearRampDraft).toHaveBeenCalledTimes(1);
  expect(commands.clearPlacementError).toHaveBeenCalledTimes(1);
};

describe("useTacticalEditorToolActivation", () => {
  it("clears every active tool draft by default", () => {
    const { result, commands } = renderActivation({ areaDraftTarget: "area" });

    act(() => result.current.clearActiveToolDrafts());

    expectCommonDraftsCleared(commands);
    expect(commands.clearAreaDraft).toHaveBeenCalledTimes(1);
    expect(commands.clearAreaControlDrag).toHaveBeenCalledTimes(1);
  });

  it("preserves a compatible in-progress area draft", () => {
    const { result, commands } = renderActivation({ areaDraftTarget: "area" });

    act(() => result.current.clearActiveToolDrafts("area"));

    expectCommonDraftsCleared(commands);
    expect(commands.clearAreaDraft).not.toHaveBeenCalled();
    expect(commands.clearAreaControlDrag).not.toHaveBeenCalled();
  });

  it("activates a primary tool and clears active drafts", () => {
    const { result, commands } = renderActivation({ areaDraftTarget: "area" });

    act(() => result.current.activatePrimaryTool("node"));

    expect(commands.setPrimaryTool).toHaveBeenCalledWith("node");
    expectCommonDraftsCleared(commands);
    expect(commands.clearAreaDraft).toHaveBeenCalledTimes(1);
  });

  it("closes the tool group before HUD primary-tool activation", () => {
    const { result, commands } = renderActivation();

    act(() => result.current.activatePrimaryToolFromHud("hand"));

    expect(commands.closeToolGroup).toHaveBeenCalledTimes(1);
    expect(commands.setPrimaryTool).toHaveBeenCalledWith("hand");
    expect(commands.closeToolGroup.mock.invocationCallOrder[0])
      .toBeLessThan(commands.setPrimaryTool.mock.invocationCallOrder[0]!);
  });

  it("preserves a Pen draft but clears it for an incompatible drawing tool", () => {
    const pen = renderActivation({ areaDraftTarget: "area" });
    const wall = renderActivation({ areaDraftTarget: "area" });

    act(() => pen.result.current.activateDrawingTool(PEN_AREA_TOOL_ID));
    act(() => wall.result.current.activateDrawingTool(WALL_TOOL_ID));

    expect(pen.commands.setDrawingTool).toHaveBeenCalledWith(PEN_AREA_TOOL_ID);
    expect(pen.commands.clearAreaDraft).not.toHaveBeenCalled();
    expect(wall.commands.setDrawingTool).toHaveBeenCalledWith(WALL_TOOL_ID);
    expect(wall.commands.clearAreaDraft).toHaveBeenCalledTimes(1);
  });

  it("opens Circle Properties when activating the legacy circle tool", () => {
    const { result, commands } = renderActivation();

    act(() => result.current.activateDrawingTool(CIRCLE_TOOL_ID));

    expect(commands.setDrawingTool).toHaveBeenCalledWith(CIRCLE_TOOL_ID);
    expect(commands.showCircleProperties).toHaveBeenCalledTimes(1);
  });

  it("activates an enemy tool and clears active drafts", () => {
    const { result, commands } = renderActivation({ areaDraftTarget: "area" });

    act(() => result.current.activateEnemyTool("gang-leader"));

    expect(commands.setEnemyTool).toHaveBeenCalledWith("gang-leader");
    expectCommonDraftsCleared(commands);
    expect(commands.clearAreaDraft).toHaveBeenCalledTimes(1);
  });
});
