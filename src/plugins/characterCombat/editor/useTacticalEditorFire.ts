import type { TacticalScenarioDefinitionFile } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { tacticalEditorLayerKey } from "@/plugins/characterCombat/editor/tacticalEditorLayers";
import { FIRE_TOOL_ID, cellKey, gridPoint } from "@/plugins/characterCombat/editor/tacticalEditorSupport";

type DraftUpdate = TacticalScenarioDefinitionFile
  | ((current: TacticalScenarioDefinitionFile) => TacticalScenarioDefinitionFile);

type FirePoint = { x: number; y: number };

type UseTacticalEditorFireOptions = {
  draft: TacticalScenarioDefinitionFile;
  setDraft: (update: DraftUpdate) => void;
  activeDrawingTool: string | null;
  selectedFire: FirePoint | null;
  lockedLayerKeys: ReadonlySet<string>;
  setSelectedFire: (position: FirePoint | null) => void;
  setPlacementError: (error: string | null) => void;
};

export const useTacticalEditorFire = ({
  draft,
  setDraft,
  activeDrawingTool,
  selectedFire,
  lockedLayerKeys,
  setSelectedFire,
  setPlacementError,
}: UseTacticalEditorFireOptions) => {
  const fireLayerKey = (point: FirePoint) => tacticalEditorLayerKey("fire", cellKey(point));

  const placeFire = (origin: FirePoint) => {
    if (activeDrawingTool !== FIRE_TOOL_ID) return false;
    const inBounds = origin.x >= 0 && origin.y >= 0
      && origin.x < draft.map.width && origin.y < draft.map.height;
    if (!inBounds) {
      setPlacementError("Fire must be placed inside the map.");
      return true;
    }
    if (draft.fireCells.some((cell) => cellKey(cell) === cellKey(origin))) {
      setPlacementError(`A fire already exists at ${cellKey(origin)}.`);
      return true;
    }
    setDraft({ ...draft, fireCells: [...draft.fireCells, gridPoint(origin)] });
    setPlacementError(null);
    return true;
  };

  const selectFire = (point: FirePoint | null) => {
    if (point && lockedLayerKeys.has(fireLayerKey(point))) return;
    setSelectedFire(point);
  };

  const deleteSelectedFire = () => {
    if (!selectedFire || lockedLayerKeys.has(fireLayerKey(selectedFire))) return false;
    setDraft((current) => ({
      ...current,
      fireCells: current.fireCells
        .filter((cell) => cellKey(cell) !== cellKey(selectedFire)),
    }));
    setSelectedFire(null);
    setPlacementError(null);
    return true;
  };

  return {
    placeFire,
    selectFire,
    deleteSelectedFire,
  };
};
