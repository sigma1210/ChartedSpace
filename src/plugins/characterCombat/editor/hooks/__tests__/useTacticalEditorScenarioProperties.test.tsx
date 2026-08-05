/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { TacticalEditorScenarioPropertiesDraft } from "../../redux/tacticalEditorSlice";
import { useTacticalEditorScenarioProperties } from "../useTacticalEditorScenarioProperties";

const properties = (
  update: Partial<TacticalEditorScenarioPropertiesDraft> = {},
): TacticalEditorScenarioPropertiesDraft => ({
  title: "Updated title",
  briefing: "Updated briefing",
  objective: "Updated objective",
  deploymentEdges: ["south"],
  ...update,
});

const renderProperties = ({
  initialDraft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition),
  propertiesDraft = properties(),
}: {
  initialDraft?: TacticalScenarioDefinitionFile;
  propertiesDraft?: TacticalEditorScenarioPropertiesDraft | null;
} = {}) => {
  const closeFileDialog = jest.fn();
  const rejectScenarioProperties = jest.fn();
  const hook = renderHook(() => {
    const [draft, setDraft] = useState(initialDraft);
    const [placementError, setPlacementError] = useState<string | null>("Previous error");
    return {
      ...useTacticalEditorScenarioProperties({
        draft,
        propertiesDraft,
        setDraft,
        closeFileDialog,
        rejectScenarioProperties,
        setPlacementError,
      }),
      draft,
      placementError,
    };
  });
  return { ...hook, closeFileDialog, rejectScenarioProperties };
};

describe("useTacticalEditorScenarioProperties", () => {
  it("updates map dimensions using the entered integer", () => {
    const { result } = renderProperties();

    act(() => result.current.updateDimension("width", "80"));
    act(() => result.current.updateDimension("height", "60px"));

    expect(result.current.draft.map).toEqual({ width: 80, height: 60 });
  });

  it("sets an invalid map dimension to zero", () => {
    const { result } = renderProperties();

    act(() => result.current.updateDimension("width", "invalid"));

    expect(result.current.draft.map.width).toBe(0);
  });

  it("applies valid staged properties and closes the dialog", () => {
    const { result, closeFileDialog, rejectScenarioProperties } = renderProperties();

    let applied = false;
    act(() => {
      applied = result.current.applyScenarioProperties();
    });

    expect(applied).toBe(true);
    expect(result.current.draft).toMatchObject(properties());
    expect(result.current.placementError).toBeNull();
    expect(closeFileDialog).toHaveBeenCalledTimes(1);
    expect(rejectScenarioProperties).not.toHaveBeenCalled();
  });

  it("rejects properties without a crew deployment zone", () => {
    const { result, closeFileDialog, rejectScenarioProperties } = renderProperties({
      propertiesDraft: properties({ deploymentEdges: [] }),
    });

    let applied = true;
    act(() => {
      applied = result.current.applyScenarioProperties();
    });

    expect(applied).toBe(false);
    expect(rejectScenarioProperties).toHaveBeenCalledWith(
      "Define a crew deployment edge or designate a drawn area for crew deployment before saving or playtesting.",
    );
    expect(closeFileDialog).not.toHaveBeenCalled();
  });

  it("rejects an enemy inside the crew deployment zone", () => {
    const initialDraft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    initialDraft.enemyPlacements = [{
      ...initialDraft.enemyPlacements[0]!,
      id: "deployment-enemy",
      name: "Deployment Enemy",
      position: { x: 10, y: initialDraft.map.height - 1 },
    }];
    const { result, closeFileDialog, rejectScenarioProperties } = renderProperties({ initialDraft });

    let applied = true;
    act(() => {
      applied = result.current.applyScenarioProperties();
    });

    expect(applied).toBe(false);
    expect(rejectScenarioProperties).toHaveBeenCalledWith(
      `Enemy Deployment Enemy cannot occupy the crew deployment zone at 10:${initialDraft.map.height - 1}.`,
    );
    expect(closeFileDialog).not.toHaveBeenCalled();
  });

  it("does nothing when no properties are staged", () => {
    const { result, closeFileDialog, rejectScenarioProperties } = renderProperties({
      propertiesDraft: null,
    });

    expect(result.current.applyScenarioProperties()).toBe(false);
    expect(closeFileDialog).not.toHaveBeenCalled();
    expect(rejectScenarioProperties).not.toHaveBeenCalled();
  });
});
