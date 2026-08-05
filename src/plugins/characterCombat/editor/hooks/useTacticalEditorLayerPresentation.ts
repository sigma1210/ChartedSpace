"use client";

import { useCallback, useMemo } from "react";
import type { TacticalScenarioDefinitionFile } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import {
  moveTacticalEditorLayerObjectInDefinition,
  tacticalEditorLayerGroups,
  tacticalEditorVisibleDefinition,
  type TacticalEditorLayerObject,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorLayers";

type TacticalEditorDraftUpdate = TacticalScenarioDefinitionFile
  | ((current: TacticalScenarioDefinitionFile) => TacticalScenarioDefinitionFile);

export const useTacticalEditorLayerPresentation = (
  draft: TacticalScenarioDefinitionFile,
  hiddenLayerKeys: ReadonlySet<string>,
  setDraft: (update: TacticalEditorDraftUpdate) => void,
) => {
  const layerGroups = useMemo(() => tacticalEditorLayerGroups(draft), [draft]);
  const previewDefinition = useMemo(
    () => tacticalEditorVisibleDefinition(draft, hiddenLayerKeys),
    [draft, hiddenLayerKeys],
  );
  const moveEditorLayerObject = useCallback((
    object: TacticalEditorLayerObject,
    direction: -1 | 1,
  ) => {
    setDraft((current) => moveTacticalEditorLayerObjectInDefinition(
      current,
      object,
      direction,
    ));
  }, [setDraft]);

  return {
    layerGroups,
    previewDefinition,
    moveEditorLayerObject,
  };
};
