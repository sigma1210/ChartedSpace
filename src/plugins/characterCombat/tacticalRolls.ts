import type { DicePair } from "./combatResolution";
import { pointKey } from "./geometry";
import type { TacticalCollateralRolls } from "./tacticalCollateral";
import type { TacticalMoveConfirmation } from "./tacticalPlayerMovementReducers";
import type { TacticalEnemyPhaseRolls } from "./tacticalTurnLifecycle";
import type { Combatant, TacticalMapState } from "./types";

export type TacticalDiceRoller = () => DicePair;
export type TacticalD6Roller = () => number;

export const rollTacticalDicePair: TacticalDiceRoller = () => ({
  first: Math.floor(Math.random() * 6) + 1,
  second: Math.floor(Math.random() * 6) + 1,
});

export const rollTacticalD6: TacticalD6Roller = () => Math.floor(Math.random() * 6) + 1;

export type TacticalMeleeExchangeRolls = {
  attackRoll: number;
  responseRoll: number;
};

export const buildTacticalMeleeExchangeRolls = (
  rollD6: TacticalD6Roller = rollTacticalD6,
): TacticalMeleeExchangeRolls => ({
  attackRoll: rollD6(),
  responseRoll: rollD6(),
});

export type TacticalAdjacencyReactionRolls = {
  fire: boolean;
  hitDice: DicePair;
  woundDice: DicePair;
};

export const buildTacticalAdjacencyReactionRolls = (
  fire: boolean,
  roll: TacticalDiceRoller = rollTacticalDicePair,
): TacticalAdjacencyReactionRolls => ({
  fire,
  hitDice: roll(),
  woundDice: roll(),
});

export type TacticalConsoleCheckRolls = {
  operationId: string;
  dice: DicePair;
};

export const buildTacticalConsoleCheckRolls = (
  operationId: string,
  roll: TacticalDiceRoller = rollTacticalDicePair,
): TacticalConsoleCheckRolls => ({
  operationId,
  dice: roll(),
});

export type TacticalStructuralFireRolls = {
  hitDice: DicePair;
};

export const buildTacticalStructuralFireRolls = (
  roll: TacticalDiceRoller = rollTacticalDicePair,
): TacticalStructuralFireRolls => ({
  hitDice: roll(),
});

export type TacticalCoveringFireSnapRolls = TacticalAdjacencyReactionRolls & {
  targetId?: string;
  phaseRolls: TacticalEnemyPhaseRolls;
};

export const buildTacticalCoveringFireSnapRolls = (
  map: TacticalMapState,
  fire: boolean,
  targetId?: string,
  roll: TacticalDiceRoller = rollTacticalDicePair,
): TacticalCoveringFireSnapRolls => ({
  fire,
  targetId,
  hitDice: roll(),
  woundDice: roll(),
  phaseRolls: buildTacticalEnemyPhaseRolls(map, roll),
});

const buildLivingTacticalCollateralRolls = (
  map: TacticalMapState,
  roll: TacticalDiceRoller,
): TacticalCollateralRolls => Object.fromEntries(
  map.scenario.combatants
    .filter((combatant) => !combatant.defeated)
    .map(({ id }) => [
      id,
      { checkDice: roll(), woundDice: roll() },
    ]),
);

export type TacticalRangedAttackPayload = {
  hitDice: DicePair;
  woundDice: DicePair;
  secondaryRolls?: Record<string, { hitDice: DicePair; woundDice: DicePair }>;
  collateralRolls?: TacticalCollateralRolls;
};

export type TacticalRangedAttackRolls = TacticalRangedAttackPayload & {
  secondaryRolls: NonNullable<TacticalRangedAttackPayload["secondaryRolls"]>;
  collateralRolls: NonNullable<TacticalRangedAttackPayload["collateralRolls"]>;
};

export const buildTacticalRangedAttackRolls = (
  map: TacticalMapState,
  secondaryTargets: readonly Pick<Combatant, "id">[],
  roll: TacticalDiceRoller = rollTacticalDicePair,
): TacticalRangedAttackRolls => ({
  hitDice: roll(),
  woundDice: roll(),
  secondaryRolls: Object.fromEntries(
    secondaryTargets.map(({ id }) => [
      id,
      { hitDice: roll(), woundDice: roll() },
    ]),
  ),
  collateralRolls: Object.fromEntries(
    map.scenario.combatants.map(({ id }) => [
      id,
      { checkDice: roll(), woundDice: roll() },
    ]),
  ),
});

export type TacticalGrenadePayload = {
  rollsByCombatantId: Record<string, DicePair>;
  throwDice: DicePair;
  scatterDice: DicePair;
  occupiedSquareRolls?: Record<string, number>;
  collateralRolls: TacticalCollateralRolls;
};

export type TacticalGrenadeRolls = TacticalGrenadePayload & {
  occupiedSquareRolls: NonNullable<TacticalGrenadePayload["occupiedSquareRolls"]>;
};

export const buildTacticalGrenadeRolls = (
  map: TacticalMapState,
  roll: TacticalDiceRoller = rollTacticalDicePair,
  rollD6: TacticalD6Roller = rollTacticalD6,
): TacticalGrenadeRolls => {
  const activeCombatants = map.scenario.combatants.filter(
    (combatant) => !combatant.defeated,
  );

  return {
    rollsByCombatantId: Object.fromEntries(
      activeCombatants.map(({ id }) => [id, roll()]),
    ),
    throwDice: roll(),
    scatterDice: roll(),
    occupiedSquareRolls: Object.fromEntries(
      activeCombatants.map(({ position }) => [pointKey(position), rollD6()]),
    ),
    collateralRolls: buildLivingTacticalCollateralRolls(map, roll),
  };
};

export type TacticalSatchelDetonationRolls = {
  chargeId: string;
  rollsByCombatantId: TacticalCollateralRolls;
};

export const buildTacticalSatchelDetonationRolls = (
  map: TacticalMapState,
  chargeId: string,
  roll: TacticalDiceRoller = rollTacticalDicePair,
): TacticalSatchelDetonationRolls => ({
  chargeId,
  rollsByCombatantId: buildLivingTacticalCollateralRolls(map, roll),
});

export const buildTacticalMoveConfirmationRolls = (
  map: TacticalMapState,
  roll: TacticalDiceRoller = rollTacticalDicePair,
  rollD6: TacticalD6Roller = rollTacticalD6,
): TacticalMoveConfirmation => ({
  moraleDice: roll(),
  snapDice: {
    hitDice: roll(),
    woundDice: roll(),
  },
  enemyReactionRolls: Object.fromEntries(
    map.scenario.combatants
      .filter((combatant) => combatant.side === "enemy" && !combatant.defeated)
      .map((enemy) => [enemy.id, {
        hitDice: roll(),
        woundDice: roll(),
      }]),
  ),
  meleeDice: {
    attackRoll: rollD6(),
    responseRoll: rollD6(),
  },
});

export const buildTacticalEnemyPhaseRolls = (
  map: TacticalMapState,
  roll: TacticalDiceRoller = rollTacticalDicePair,
): TacticalEnemyPhaseRolls => {
  const activeEnemies = map.scenario.combatants.filter(
    (unit) => unit.side === "enemy" && !unit.defeated,
  );
  const rollsFor = () => ({ hitDice: roll(), woundDice: roll() });

  return {
    enemyRolls: Object.fromEntries(activeEnemies.map((enemy) => [enemy.id, rollsFor()])),
    coveringFireRolls: Object.fromEntries(map.coveringFireLanes.map((lane) => [
      lane.attackerId,
      Object.fromEntries(map.scenario.combatants.map((unit) => [unit.id, rollsFor()])),
    ])),
    dangerSpaceRolls: Object.fromEntries(activeEnemies.map((enemy) => [
      enemy.id,
      Object.fromEntries(map.scenario.combatants.map((unit) => [unit.id, rollsFor()])),
    ])),
    coweringRecoveryRolls: Object.fromEntries(
      (map.coweringCombatantIds ?? []).map((id) => [id, roll()]),
    ),
    casualtyMoraleRolls: Object.fromEntries(map.scenario.combatants.map((witness) => [
      witness.id,
      Object.fromEntries(map.scenario.combatants.map((casualty) => [casualty.id, roll()])),
    ])),
    unexpectedFireMoraleRolls: Object.fromEntries(map.scenario.combatants.map((target) => [
      target.id,
      Object.fromEntries(map.scenario.combatants.map((attacker) => [attacker.id, roll()])),
    ])),
    coveringFireMoraleRolls: Object.fromEntries(
      activeEnemies.map((enemy) => [enemy.id, roll()]),
    ),
    movingAdjacentMoraleRolls: Object.fromEntries(
      activeEnemies.map((enemy) => [enemy.id, roll()]),
    ),
    movingAdjacentSnapRolls: Object.fromEntries(
      activeEnemies.map((enemy) => [enemy.id, rollsFor()]),
    ),
  };
};
