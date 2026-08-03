import type {
  Combatant,
  GridPoint,
} from "@/plugins/characterCombat/types";

export type TacticalCombatantSelection =
  | { type: "preview-covering-fire"; point: GridPoint }
  | { type: "preview-grenade"; point: GridPoint }
  | { type: "preview-melee-dive"; combatantId: string }
  | { type: "select-attack-target"; combatantId: string }
  | { type: "preview-melee"; combatantId: string }
  | {
      type: "activate-character";
      combatantId: string;
      profileCharacterId: string;
    }
  | { type: "none" };

type TacticalCombatantSelectionOptions = {
  combatant: Combatant;
  coveringFireTargeting: boolean;
  grenadeTargeting: boolean;
  validMeleeDiveTargetIds: ReadonlySet<string>;
  validTargetIds: ReadonlySet<string>;
  validMeleeTargetIds: ReadonlySet<string>;
};

export const resolveTacticalCombatantSelection = ({
  combatant,
  coveringFireTargeting,
  grenadeTargeting,
  validMeleeDiveTargetIds,
  validTargetIds,
  validMeleeTargetIds,
}: TacticalCombatantSelectionOptions): TacticalCombatantSelection => {
  if (coveringFireTargeting) {
    return {
      type: "preview-covering-fire",
      point: combatant.position,
    };
  }
  if (combatant.side === "enemy") {
    if (grenadeTargeting) {
      return {
        type: "preview-grenade",
        point: combatant.position,
      };
    }
    if (validMeleeDiveTargetIds.has(combatant.id)) {
      return {
        type: "preview-melee-dive",
        combatantId: combatant.id,
      };
    }
    if (validTargetIds.has(combatant.id)) {
      return {
        type: "select-attack-target",
        combatantId: combatant.id,
      };
    }
    if (validMeleeTargetIds.has(combatant.id)) {
      return {
        type: "preview-melee",
        combatantId: combatant.id,
      };
    }
    return { type: "none" };
  }

  return {
    type: "activate-character",
    combatantId: combatant.id,
    profileCharacterId: combatant.sourceCharacterId ?? combatant.id,
  };
};
