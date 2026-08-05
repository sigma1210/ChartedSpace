/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import type { TacticalTerrainPlacement } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type {
  TacticalConsoleOperation,
  TacticalConsoleVictoryDefinitionFile,
} from "@/plugins/characterCombat/tacticalConsoleVictory";
import { useTacticalEditorInteractionOperations } from "../useTacticalEditorInteractionOperations";

const placement = (
  id = "console-1",
  terrainDefinitionId = "console-1x1",
  label = "Bridge Console",
): TacticalTerrainPlacement => ({
  id,
  terrainDefinitionId,
  origin: { x: 1, y: 2 },
  rotation: 0,
  objectSettings: { terminal: { label } },
});

const operation = (
  id: string,
  result: TacticalConsoleOperation["result"] = { type: "unlock", operationIds: [] },
  consolePlacementId = "console-1",
): TacticalConsoleOperation => ({
  id,
  consolePlacementId,
  label: id,
  prerequisites: { mode: "all", operationIds: [] },
  checks: [{ id: `${id}-check-1`, skill: "Security", difficulty: "average", apCost: 6 }],
  result,
});

const definition = (operations: TacticalConsoleOperation[] = []): TacticalConsoleVictoryDefinitionFile => ({
  schemaVersion: 1,
  id: "test-operations",
  scenarioId: "test-scenario",
  operations,
});

const renderOperations = ({
  initialDefinition = definition(),
  selectedPlacement = placement(),
  initialSelectedOperationId = null,
  supportsOperations = true,
}: {
  initialDefinition?: TacticalConsoleVictoryDefinitionFile;
  selectedPlacement?: TacticalTerrainPlacement | null;
  initialSelectedOperationId?: string | null;
  supportsOperations?: boolean;
} = {}) => renderHook(() => {
  const [consoleVictory, setConsoleVictory] = useState(initialDefinition);
  const [selectedOperationId, setSelectedOperationId] = useState(initialSelectedOperationId);
  return {
    ...useTacticalEditorInteractionOperations({
      consoleVictory,
      setConsoleVictory,
      selectedPlacement,
      selectedPlacementSupportsOperations: supportsOperations,
      selectedOperationId,
      setSelectedOperationId,
    }),
    consoleVictory,
    selectedOperationId,
  };
});

describe("useTacticalEditorInteractionOperations", () => {
  it("derives the selected placement operations and selected operation", () => {
    const local = operation("local");
    const remote = operation("remote", { type: "victory" }, "console-2");
    const { result } = renderOperations({
      initialDefinition: definition([local, remote]),
      initialSelectedOperationId: "remote",
    });

    expect(result.current.selectedConsoleOperations).toEqual([local]);
    expect(result.current.selectedOperation).toEqual(remote);
  });

  it("adds and selects the first operation as the victory task", () => {
    const { result } = renderOperations();

    act(() => result.current.addConsoleOperation());

    expect(result.current.selectedOperationId).toBe("console-1-operation-1");
    expect(result.current.selectedOperation).toMatchObject({
      id: "console-1-operation-1",
      label: "Operate Bridge Console",
      checks: [{ skill: "Security", difficulty: "average", apCost: 6 }],
      result: { type: "victory" },
    });
  });

  it("uses interactive-human defaults and does not create a second victory task", () => {
    const existingVictory = operation("victory", { type: "victory" }, "console-2");
    const { result } = renderOperations({
      initialDefinition: definition([existingVictory]),
      selectedPlacement: placement("human-1", "interactive-human", "Mara Venn"),
    });

    act(() => result.current.addConsoleOperation());

    expect(result.current.selectedOperation).toMatchObject({
      label: "Interact with Mara Venn",
      checks: [{ skill: "Persuade" }],
      result: { type: "unlock", operationIds: [] },
      successTransformation: "ally",
      failureTransformation: "enemy",
    });
  });

  it("updates an operation through its ID", () => {
    const { result } = renderOperations({
      initialDefinition: definition([operation("task-1", { type: "victory" })]),
      initialSelectedOperationId: "task-1",
    });

    act(() => result.current.updateConsoleOperation("task-1", (current) => ({
      ...current,
      label: "Updated task",
    })));

    expect(result.current.selectedOperation?.label).toBe("Updated task");
  });

  it("reassigns victory and removes dependencies on the new victory task", () => {
    const oldVictory = operation("old-victory", { type: "victory" });
    const newVictory = {
      ...operation("new-victory"),
      prerequisites: { mode: "all" as const, operationIds: ["old-victory"] },
    };
    const dependent = {
      ...operation("dependent"),
      prerequisites: { mode: "all" as const, operationIds: ["new-victory"] },
    };
    const { result } = renderOperations({
      initialDefinition: definition([oldVictory, newVictory, dependent]),
    });

    act(() => result.current.updateConsoleOperationResult("new-victory", "victory"));

    expect(result.current.consoleVictory.operations).toEqual([
      { ...oldVictory, result: { type: "unlock", operationIds: [] } },
      { ...newVictory, result: { type: "victory" } },
      { ...dependent, prerequisites: { mode: "all", operationIds: [] } },
    ]);
  });

  it("keeps prerequisite and unlock relationships synchronized", () => {
    const predecessor = operation("predecessor");
    const target = operation("target", { type: "victory" });
    const { result } = renderOperations({ initialDefinition: definition([predecessor, target]) });

    act(() => result.current.toggleConsoleOperationPrerequisite("target", "predecessor", true));
    act(() => result.current.toggleConsoleOperationPrerequisite("target", "predecessor", true));

    expect(result.current.consoleVictory.operations[0].result).toEqual({
      type: "unlock",
      operationIds: ["target"],
    });
    expect(result.current.consoleVictory.operations[1].prerequisites.operationIds).toEqual(["predecessor"]);

    act(() => result.current.toggleConsoleOperationUnlock("predecessor", "target", false));

    expect(result.current.consoleVictory.operations[0].result).toEqual({ type: "unlock", operationIds: [] });
    expect(result.current.consoleVictory.operations[1].prerequisites.operationIds).toEqual([]);
  });

  it("deletes an operation and removes every reference to it", () => {
    const selected = operation("selected");
    const predecessor = operation("predecessor", { type: "unlock", operationIds: ["selected"] });
    const dependent = {
      ...operation("dependent", { type: "victory" }),
      prerequisites: { mode: "all" as const, operationIds: ["selected"] },
    };
    const { result } = renderOperations({
      initialDefinition: definition([selected, predecessor, dependent]),
      initialSelectedOperationId: "selected",
    });

    act(() => result.current.deleteSelectedOperation());

    expect(result.current.selectedOperationId).toBeNull();
    expect(result.current.consoleVictory.operations).toEqual([
      { ...predecessor, result: { type: "unlock", operationIds: [] } },
      { ...dependent, prerequisites: { mode: "all", operationIds: [] } },
    ]);
  });
});
