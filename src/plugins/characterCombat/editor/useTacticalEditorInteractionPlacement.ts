import {
  tacticalPlacementSupportsConsoleOperations,
  type TacticalTerrainPlacement,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { TacticalTerminalKind } from "@/plugins/characterCombat/tacticalTerrain";
import {
  defaultTacticalInteractiveHumanCombatProfile,
  type TacticalInteractiveHumanCombatProfile,
} from "@/plugins/characterCombat/tacticalInteractiveHuman";

type TerminalUpdate = {
  label?: string;
  terminalKind?: TacticalTerminalKind;
  facing?: TacticalTerrainPlacement["rotation"];
  operational?: boolean;
  completesScenario?: boolean;
  combatProfile?: TacticalInteractiveHumanCombatProfile;
};

type UseTacticalEditorInteractionPlacementOptions = {
  placements: TacticalTerrainPlacement[];
  selectedPlacement: TacticalTerrainPlacement | null;
  updatePlacements: (placements: TacticalTerrainPlacement[]) => boolean;
};

export const useTacticalEditorInteractionPlacement = ({
  placements,
  selectedPlacement,
  updatePlacements,
}: UseTacticalEditorInteractionPlacementOptions) => {
  const selectedHasTerminal = Boolean(
    selectedPlacement && tacticalPlacementSupportsConsoleOperations(selectedPlacement),
  );
  const selectedIsInteractiveHuman = selectedPlacement?.terrainDefinitionId === "interactive-human";
  const selectedHumanCombatProfile = selectedPlacement?.objectSettings?.terminal?.combatProfile
    ?? defaultTacticalInteractiveHumanCombatProfile;

  const updateSelectedTerminal = (settings: TerminalUpdate) => {
    if (!selectedPlacement || !selectedHasTerminal) return false;
    return updatePlacements(placements.map((placement) => placement.id === selectedPlacement.id
      ? {
        ...placement,
        objectSettings: {
          ...placement.objectSettings,
          terminal: { ...placement.objectSettings?.terminal, ...settings },
        },
      }
      : placement));
  };

  const updateSelectedHumanCombatProfile = (
    settings: Partial<TacticalInteractiveHumanCombatProfile>,
  ) => updateSelectedTerminal({
    combatProfile: {
      ...selectedHumanCombatProfile,
      ...settings,
      skills: (settings.skills ?? selectedHumanCombatProfile.skills)
        .map((skill) => ({ ...skill })),
    },
  });

  return {
    selectedHasTerminal,
    selectedIsInteractiveHuman,
    selectedHumanCombatProfile,
    updateSelectedTerminal,
    updateSelectedHumanCombatProfile,
  };
};
