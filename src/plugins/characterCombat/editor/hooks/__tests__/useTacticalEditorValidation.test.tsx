/** @jest-environment jsdom */

import { renderHook } from "@testing-library/react";
import {
  cloneTacticalConsoleVictoryDefinition,
  defaultTacticalConsoleVictoryDefinition,
} from "@/plugins/characterCombat/tacticalConsoleVictory";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { useTacticalEditorValidation } from "../useTacticalEditorValidation";

describe("useTacticalEditorValidation", () => {
  it("allows a valid draft to be saved and playtested", () => {
    const { result } = renderHook(() => useTacticalEditorValidation(
      cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition),
      cloneTacticalConsoleVictoryDefinition(defaultTacticalConsoleVictoryDefinition),
      null,
    ));

    expect(result.current).toEqual({
      resolutionError: null,
      victoryTaskRequired: false,
      draftBlocked: false,
      playtestBlocked: false,
      editorIssues: [],
    });
  });

  it("blocks saving and playtesting an invalid draft", () => {
    const draft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    draft.deploymentEdges = [];
    draft.drawnAreas = (draft.drawnAreas ?? []).map((area) => ({
      ...area,
      deployment: "none",
    }));

    const { result } = renderHook(() => useTacticalEditorValidation(
      draft,
      cloneTacticalConsoleVictoryDefinition(defaultTacticalConsoleVictoryDefinition),
      null,
    ));

    expect(result.current.draftBlocked).toBe(true);
    expect(result.current.playtestBlocked).toBe(true);
    expect(result.current.editorIssues).toEqual([
      { severity: "error", message: result.current.resolutionError },
    ]);
  });

  it("requires a victory task only for playtesting", () => {
    const consoleVictory = cloneTacticalConsoleVictoryDefinition(
      defaultTacticalConsoleVictoryDefinition,
    );
    consoleVictory.operations = [];

    const { result } = renderHook(() => useTacticalEditorValidation(
      cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition),
      consoleVictory,
      null,
    ));

    expect(result.current.victoryTaskRequired).toBe(true);
    expect(result.current.draftBlocked).toBe(false);
    expect(result.current.playtestBlocked).toBe(true);
    expect(result.current.editorIssues).toHaveLength(1);
    expect(result.current.editorIssues[0].message).toContain("no victory task");
  });

  it("includes the current placement error without blocking the draft", () => {
    const { result } = renderHook(() => useTacticalEditorValidation(
      cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition),
      cloneTacticalConsoleVictoryDefinition(defaultTacticalConsoleVictoryDefinition),
      "Placement warning.",
    ));

    expect(result.current.draftBlocked).toBe(false);
    expect(result.current.playtestBlocked).toBe(false);
    expect(result.current.editorIssues).toEqual([
      { severity: "warning", message: "Placement warning." },
    ]);
  });
});
