import {
  tacticalPlacementSupportsConsoleOperations,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { QuestScenarioEntity } from "./types";

const configuredPlacementLabel = (
  placement: TacticalScenarioDefinitionFile["terrainPlacements"][number],
) => Object.values(placement.objectSettings ?? {})
  .map((settings) => settings.label?.trim())
  .find((label): label is string => Boolean(label));

export const questEntitiesFromScenario = (
  definition: TacticalScenarioDefinitionFile,
): QuestScenarioEntity[] => definition.terrainPlacements
  .filter(tacticalPlacementSupportsConsoleOperations)
  .map((placement) => {
    const interactiveHuman = placement.terrainDefinitionId === "interactive-human";
    return {
      sourcePlacementId: placement.id,
      entityType: interactiveHuman ? "interactive-human" : "console",
      title: configuredPlacementLabel(placement)
        ?? (interactiveHuman ? "Interactive humanoid" : "Console"),
    };
  });

