import {
  randomTacticalEnemyAvatarPath,
  tacticalEnemyPalette,
} from "@/plugins/characterCombat/tacticalEnemyDefinitions";
import {
  resolveTacticalScenarioTerrain,
  type TacticalEnemyPlacement,
  type TacticalEnemyType,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { tacticalEditorLayerKey } from "@/plugins/characterCombat/editor/lib/tacticalEditorLayers";
import { cellKey, gridPoint } from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

type DraftUpdate = TacticalScenarioDefinitionFile
  | ((current: TacticalScenarioDefinitionFile) => TacticalScenarioDefinitionFile);

type UseTacticalEditorEnemiesOptions = {
  draft: TacticalScenarioDefinitionFile;
  setDraft: (update: DraftUpdate) => void;
  activeEnemyType: TacticalEnemyType | null;
  selectedEnemyId: string | null;
  lockedLayerKeys: ReadonlySet<string>;
  setSelectedPlacementId: (id: string | null) => void;
  setSelectedEnemyId: (id: string | null) => void;
  setSelectedFire: (position: { x: number; y: number } | null) => void;
  setPlacementError: (error: string | null) => void;
  showEnemyEditor: () => void;
};

export const useTacticalEditorEnemies = ({
  draft,
  setDraft,
  activeEnemyType,
  selectedEnemyId,
  lockedLayerKeys,
  setSelectedPlacementId,
  setSelectedEnemyId,
  setSelectedFire,
  setPlacementError,
  showEnemyEditor,
}: UseTacticalEditorEnemiesOptions) => {
  const selectedEnemy = (draft.enemyPlacements ?? [])
    .find((enemy) => enemy.id === selectedEnemyId) ?? null;
  const selectedEnemyLocked = Boolean(
    selectedEnemyId
      && lockedLayerKeys.has(tacticalEditorLayerKey("enemy", selectedEnemyId)),
  );

  const enemyPositionError = (
    position: { x: number; y: number },
    ignoredEnemyId?: string,
  ) => {
    const positionKey = cellKey(position);
    if (position.x < 0 || position.y < 0
      || position.x >= draft.map.width || position.y >= draft.map.height) {
      return "Enemies must be placed inside the map.";
    }
    if ((draft.enemyPlacements ?? []).some((enemy) => (
      enemy.id !== ignoredEnemyId && cellKey(enemy.position) === positionKey
    ))) {
      return `Another enemy already occupies ${positionKey}.`;
    }
    const terrain = resolveTacticalScenarioTerrain(draft);
    if (terrain.objects.some((object) => cellKey(object.position) === positionKey)
      || terrain.closeMachineryCells.some((cell) => cellKey(cell) === positionKey)
      || terrain.treeTrunkCells.some((cell) => cellKey(cell) === positionKey)) {
      return `An enemy cannot occupy blocked terrain at ${positionKey}.`;
    }
    if (terrain.deploymentCells.some((cell) => cellKey(cell) === positionKey)) {
      return `An enemy cannot occupy the crew deployment zone at ${positionKey}.`;
    }
    return null;
  };

  const placeEnemy = (position: { x: number; y: number }) => {
    if (!activeEnemyType) return;
    const error = enemyPositionError(position);
    if (error) {
      setPlacementError(error);
      return;
    }
    let suffix = 1;
    let id = `${activeEnemyType}-${suffix}`;
    while ((draft.enemyPlacements ?? []).some((enemy) => enemy.id === id)) {
      suffix += 1;
      id = `${activeEnemyType}-${suffix}`;
    }
    const label = tacticalEnemyPalette
      .find((enemy) => enemy.id === activeEnemyType)?.label ?? "Enemy";
    const enemy: TacticalEnemyPlacement = {
      id,
      type: activeEnemyType,
      name: `${label} ${suffix}`,
      position: gridPoint(position),
      facing: "north",
      avatarPath: randomTacticalEnemyAvatarPath(),
    };
    setDraft({ ...draft, enemyPlacements: [...(draft.enemyPlacements ?? []), enemy] });
    setSelectedPlacementId(null);
    setSelectedEnemyId(id);
    setSelectedFire(null);
    setPlacementError(null);
    showEnemyEditor();
  };

  const moveEnemy = (id: string, position: { x: number; y: number }) => {
    const enemy = (draft.enemyPlacements ?? []).find((item) => item.id === id);
    if (!enemy || lockedLayerKeys.has(tacticalEditorLayerKey("enemy", id))
      || cellKey(enemy.position) === cellKey(position)) return;
    const error = enemyPositionError(position, id);
    if (error) {
      setPlacementError(error);
      return;
    }
    setDraft({
      ...draft,
      enemyPlacements: (draft.enemyPlacements ?? []).map((item) => (
        item.id === id ? { ...item, position: gridPoint(position) } : item
      )),
    });
    setPlacementError(null);
  };

  const selectEnemy = (id: string | null) => {
    setSelectedEnemyId(id);
    if (id) showEnemyEditor();
  };

  const updateSelectedEnemyName = (name: string) => {
    if (!selectedEnemy || selectedEnemyLocked) return;
    setDraft((current) => ({
      ...current,
      enemyPlacements: (current.enemyPlacements ?? []).map((enemy) => (
        enemy.id === selectedEnemy.id ? { ...enemy, name } : enemy
      )),
    }));
  };

  const rotateSelectedEnemy = () => {
    if (!selectedEnemy || selectedEnemyLocked) return;
    const facings = ["north", "east", "south", "west"] as const;
    const facing = facings[
      (facings.indexOf(selectedEnemy.facing ?? "north") + 1) % facings.length
    ];
    setDraft((current) => ({
      ...current,
      enemyPlacements: (current.enemyPlacements ?? []).map((enemy) => (
        enemy.id === selectedEnemy.id ? { ...enemy, facing } : enemy
      )),
    }));
  };

  const deleteSelectedEnemy = () => {
    if (!selectedEnemy || selectedEnemyLocked) return;
    setDraft((current) => ({
      ...current,
      enemyPlacements: (current.enemyPlacements ?? [])
        .filter((enemy) => enemy.id !== selectedEnemy.id),
    }));
    setSelectedEnemyId(null);
    setPlacementError(null);
  };

  return {
    selectedEnemy,
    selectedEnemyLocked,
    enemyPositionError,
    placeEnemy,
    moveEnemy,
    selectEnemy,
    updateSelectedEnemyName,
    rotateSelectedEnemy,
    deleteSelectedEnemy,
  };
};
