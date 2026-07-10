import type {
  MaydayDamageState,
  MaydayEncounter,
  MaydayScenario,
  ObjectiveStatus,
} from "./maydayRules";

export interface MaydayPlayerCombatResult {
  outcome: "victory" | "defeat";
  missilesConsumed: number;
  sandConsumed: number;
  damageSustained: MaydayDamageState;
  destroyed: boolean;
}

const noDamage = (): MaydayDamageState => ({
  mDriveDisabled: false,
  jDriveDisabled: false,
  weaponsDisabled: false,
  computerDisabled: false,
  detonated: false,
});

export const summarizeMaydayPlayerCombatResult = (
  startedScenario: MaydayScenario,
  completedEncounter: MaydayEncounter,
  objectiveStatus: ObjectiveStatus,
): MaydayPlayerCombatResult | null => {
  if (objectiveStatus === "in-progress") return null;

  const startingShip = startedScenario.encounter.ships.find((ship) => ship.side === "player");
  const completedShip = completedEncounter.ships.find((ship) => ship.side === "player");
  if (!startingShip || !completedShip) return null;

  const startingDamage = startingShip.damage ?? noDamage();
  const completedDamage = completedShip.damage ?? noDamage();
  const damageSustained: MaydayDamageState = {
    mDriveDisabled: !startingDamage.mDriveDisabled && completedDamage.mDriveDisabled,
    jDriveDisabled: !startingDamage.jDriveDisabled && completedDamage.jDriveDisabled,
    weaponsDisabled: !startingDamage.weaponsDisabled && completedDamage.weaponsDisabled,
    computerDisabled: !startingDamage.computerDisabled && completedDamage.computerDisabled,
    detonated: !startingDamage.detonated && completedDamage.detonated,
  };

  return {
    outcome: objectiveStatus === "success" ? "victory" : "defeat",
    missilesConsumed: Math.max(0, (startingShip.missiles ?? 0) - (completedShip.missiles ?? 0)),
    sandConsumed: Math.max(0, (startingShip.sand ?? 0) - (completedShip.sand ?? 0)),
    damageSustained,
    destroyed: completedDamage.detonated,
  };
};
