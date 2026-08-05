import { buildDefaultTacticalScenario } from "@/plugins/characterCombat/defaultTacticalScenario";
import {
  resolveTacticalScenarioTerrain,
  tacticalPlacementSupportsConsoleOperations,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import {
  validateTacticalConsoleVictoryDefinition,
  type TacticalConsoleVictoryDefinitionFile,
} from "@/plugins/characterCombat/tacticalConsoleVictory";
import {
  defaultTacticalInteractiveHumanCombatProfile,
  validateTacticalInteractiveHumanCombatProfile,
} from "@/plugins/characterCombat/tacticalInteractiveHuman";

export type TacticalEditorIssue = {
  severity: "warning" | "error";
  message: string;
};

export type TacticalEditorValidation = {
  resolutionError: string | null;
  victoryTaskRequired: boolean;
  draftBlocked: boolean;
  playtestBlocked: boolean;
};

const cellKey = (point: { x: number; y: number }) => `${point.x}:${point.y}`;

export const validateTacticalEditorDocument = (
  draft: TacticalScenarioDefinitionFile,
  consoleVictory: TacticalConsoleVictoryDefinitionFile,
): TacticalEditorValidation => {
  let resolutionError: string | null = null;
  try {
    const terrain = resolveTacticalScenarioTerrain(draft);
    terrain.terrainObjects
      .filter((object) => object.kind === "terminal" && object.visualKind === "human")
      .forEach((human) => validateTacticalInteractiveHumanCombatProfile(
        human.kind === "terminal"
          ? human.combatProfile ?? defaultTacticalInteractiveHumanCombatProfile
          : defaultTacticalInteractiveHumanCombatProfile,
      ));
    if (terrain.deploymentCells.length < 2) {
      throw new Error(
        "Define a crew deployment edge or designate a drawn area for crew deployment before saving or playtesting.",
      );
    }
    const enemyIds = new Set<string>();
    const enemyCells = new Set<string>();
    (draft.enemyPlacements ?? []).forEach((enemy) => {
      const position = cellKey(enemy.position);
      if (!enemy.name.trim()) throw new Error(`Enemy ${enemy.id} requires a name.`);
      if (enemyIds.has(enemy.id)) throw new Error(`Duplicate enemy ID: ${enemy.id}.`);
      if (
        enemy.position.x < 0
        || enemy.position.y < 0
        || enemy.position.x >= draft.map.width
        || enemy.position.y >= draft.map.height
      ) {
        throw new Error(`Enemy ${enemy.name} is outside the map at ${position}.`);
      }
      if (enemyCells.has(position)) throw new Error(`Two enemies occupy ${position}.`);
      if (
        terrain.objects.some((object) => cellKey(object.position) === position)
        || terrain.closeMachineryCells.some((cell) => cellKey(cell) === position)
      ) {
        throw new Error(`Enemy ${enemy.name} cannot occupy blocked terrain at ${position}.`);
      }
      if (terrain.deploymentCells.some((cell) => cellKey(cell) === position)) {
        throw new Error(
          `Enemy ${enemy.name} cannot occupy the crew deployment zone at ${position}.`,
        );
      }
      enemyIds.add(enemy.id);
      enemyCells.add(position);
    });
    if (consoleVictory.operations.length > 0) {
      validateTacticalConsoleVictoryDefinition(
        consoleVictory,
        draft.terrainPlacements
          .filter(tacticalPlacementSupportsConsoleOperations)
          .map((placement) => placement.id),
        draft.terrainPlacements
          .filter((placement) => placement.terrainDefinitionId === "interactive-human")
          .map((placement) => placement.id),
      );
      buildDefaultTacticalScenario(undefined, draft, consoleVictory);
    }
  } catch (error) {
    resolutionError = error instanceof Error
      ? error.message
      : "The draft could not be resolved.";
  }

  const victoryTaskRequired = consoleVictory.operations.length === 0;
  const draftBlocked = Boolean(resolutionError);
  return {
    resolutionError,
    victoryTaskRequired,
    draftBlocked,
    playtestBlocked: draftBlocked || victoryTaskRequired,
  };
};

export const tacticalEditorIssues = (
  validation: TacticalEditorValidation,
  placementError: string | null,
): TacticalEditorIssue[] => [
  ...(placementError
    ? [{ severity: "warning" as const, message: placementError }]
    : []),
  ...(validation.victoryTaskRequired
    ? [{
      severity: "warning" as const,
      message: "This scenario has no victory task. It can be saved, but add a console or interactive human and a victory task before playtesting.",
    }]
    : []),
  ...(validation.resolutionError
    ? [{ severity: "error" as const, message: validation.resolutionError }]
    : []),
];
