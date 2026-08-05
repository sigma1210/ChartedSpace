import {
  resolveTacticalScenarioTerrain,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { TacticalEditorScenarioPropertiesDraft } from "@/plugins/characterCombat/editor/state/tacticalEditorSlice";
import { cellKey } from "@/plugins/characterCombat/editor/tacticalEditorSupport";

type DraftUpdate = TacticalScenarioDefinitionFile
  | ((current: TacticalScenarioDefinitionFile) => TacticalScenarioDefinitionFile);

type UseTacticalEditorScenarioPropertiesOptions = {
  draft: TacticalScenarioDefinitionFile;
  propertiesDraft: TacticalEditorScenarioPropertiesDraft | null;
  setDraft: (update: DraftUpdate) => void;
  closeFileDialog: () => void;
  rejectScenarioProperties: (message: string) => void;
  setPlacementError: (error: string | null) => void;
};

export const useTacticalEditorScenarioProperties = ({
  draft,
  propertiesDraft,
  setDraft,
  closeFileDialog,
  rejectScenarioProperties,
  setPlacementError,
}: UseTacticalEditorScenarioPropertiesOptions) => {
  const updateDimension = (field: "width" | "height", value: string) => {
    const parsed = Number.parseInt(value, 10);
    setDraft((current) => ({
      ...current,
      map: { ...current.map, [field]: Number.isFinite(parsed) ? parsed : 0 },
    }));
  };

  const applyScenarioProperties = () => {
    if (!propertiesDraft) return false;
    const candidate = { ...draft, ...propertiesDraft };
    try {
      const terrain = resolveTacticalScenarioTerrain(candidate);
      if (terrain.deploymentCells.length < 2) {
        throw new Error(
          "Define a crew deployment edge or designate a drawn area for crew deployment before saving or playtesting.",
        );
      }
      const deploymentCells = new Set(terrain.deploymentCells.map(cellKey));
      const enemy = (candidate.enemyPlacements ?? [])
        .find((item) => deploymentCells.has(cellKey(item.position)));
      if (enemy) {
        throw new Error(
          `Enemy ${enemy.name} cannot occupy the crew deployment zone at ${cellKey(enemy.position)}.`,
        );
      }
      setDraft(candidate);
      closeFileDialog();
      setPlacementError(null);
      return true;
    } catch (error) {
      rejectScenarioProperties(error instanceof Error
        ? error.message
        : "Those scenario properties are not valid.");
      return false;
    }
  };

  return { updateDimension, applyScenarioProperties };
};
