/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { tacticalEditorLayerKey } from "../../lib/tacticalEditorLayers";
import { useTacticalEditorLayerPresentation } from "../useTacticalEditorLayerPresentation";

const renderLayerPresentation = (
  definition: TacticalScenarioDefinitionFile,
  hiddenLayerKeys: ReadonlySet<string> = new Set(),
) => renderHook(
  ({ hiddenKeys }: { hiddenKeys: ReadonlySet<string> }) => {
    const [draft, setDraft] = useState(definition);
    return {
      draft,
      ...useTacticalEditorLayerPresentation(draft, hiddenKeys, setDraft),
    };
  },
  { initialProps: { hiddenKeys: hiddenLayerKeys } },
);

describe("useTacticalEditorLayerPresentation", () => {
  it("derives the layer groups from the current draft", () => {
    const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    definition.fireCells = [{ x: 4, y: 7 }];

    const { result } = renderLayerPresentation(definition);

    expect(result.current.layerGroups.map((group) => group.id)).toEqual([
      "areas",
      "walls",
      "elevation",
      "terrain",
      "fixtures",
      "combatants",
      "effects",
    ]);
    expect(result.current.layerGroups.find((group) => group.id === "effects")?.objects)
      .toContainEqual(expect.objectContaining({ key: tacticalEditorLayerKey("fire", "4:7") }));
  });

  it("uses the current draft directly when no layers are hidden", () => {
    const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);

    const { result } = renderLayerPresentation(definition);

    expect(result.current.previewDefinition).toBe(result.current.draft);
  });

  it("removes hidden objects only from the preview", () => {
    const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    definition.fireCells = [{ x: 1, y: 2 }, { x: 3, y: 4 }];

    const { result } = renderLayerPresentation(
      definition,
      new Set([tacticalEditorLayerKey("fire", "1:2")]),
    );

    expect(result.current.previewDefinition.fireCells).toEqual([{ x: 3, y: 4 }]);
    expect(result.current.draft.fireCells).toEqual([{ x: 1, y: 2 }, { x: 3, y: 4 }]);
  });

  it("moves a layer object backward and forward in its draft collection", () => {
    const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    definition.fireCells = [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }];
    const { result } = renderLayerPresentation(definition);
    const middle = result.current.layerGroups
      .find((group) => group.id === "effects")?.objects[1];
    expect(middle).toBeDefined();

    act(() => result.current.moveEditorLayerObject(middle!, -1));
    expect(result.current.draft.fireCells).toEqual([
      { x: 2, y: 2 },
      { x: 1, y: 1 },
      { x: 3, y: 3 },
    ]);

    act(() => result.current.moveEditorLayerObject(middle!, 1));
    expect(result.current.draft.fireCells).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ]);
  });
});
