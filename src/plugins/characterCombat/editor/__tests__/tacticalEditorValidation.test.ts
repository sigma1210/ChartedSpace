import {
  cloneTacticalConsoleVictoryDefinition,
  defaultTacticalConsoleVictoryDefinition,
} from "@/plugins/characterCombat/tacticalConsoleVictory";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import {
  tacticalEditorIssues,
  validateTacticalEditorDocument,
} from "../tacticalEditorValidation";

describe("tacticalEditorValidation", () => {
  it("allows a valid scenario document to be saved and playtested", () => {
    const validation = validateTacticalEditorDocument(
      cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition),
      cloneTacticalConsoleVictoryDefinition(defaultTacticalConsoleVictoryDefinition),
    );

    expect(validation).toEqual({
      resolutionError: null,
      victoryTaskRequired: false,
      draftBlocked: false,
      playtestBlocked: false,
    });
    expect(tacticalEditorIssues(validation, null)).toEqual([]);
  });

  it("blocks an invalid terrain document and exposes its resolution error", () => {
    const draft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    draft.deploymentEdges = [];
    draft.drawnAreas = (draft.drawnAreas ?? []).map((area) => ({
      ...area,
      deployment: "none",
    }));

    const validation = validateTacticalEditorDocument(
      draft,
      cloneTacticalConsoleVictoryDefinition(defaultTacticalConsoleVictoryDefinition),
    );

    expect(validation.resolutionError).toBe(
      "Define a crew deployment edge or designate a drawn area for crew deployment before saving or playtesting.",
    );
    expect(validation.draftBlocked).toBe(true);
    expect(validation.playtestBlocked).toBe(true);
    expect(tacticalEditorIssues(validation, null)).toEqual([
      { severity: "error", message: validation.resolutionError },
    ]);
  });

  it("allows saving but blocks playtesting when no victory task exists", () => {
    const consoleVictory = cloneTacticalConsoleVictoryDefinition(
      defaultTacticalConsoleVictoryDefinition,
    );
    consoleVictory.operations = [];

    const validation = validateTacticalEditorDocument(
      cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition),
      consoleVictory,
    );

    expect(validation).toEqual({
      resolutionError: null,
      victoryTaskRequired: true,
      draftBlocked: false,
      playtestBlocked: true,
    });
    expect(tacticalEditorIssues(validation, "Placement warning.")).toEqual([
      { severity: "warning", message: "Placement warning." },
      {
        severity: "warning",
        message: "This scenario has no victory task. It can be saved, but add a console or interactive human and a victory task before playtesting.",
      },
    ]);
  });
});
