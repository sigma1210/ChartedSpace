import { resolveSnapShot, type DicePair } from "./combatResolution";
import { coverProtection, pointKey, tacticalVisibilityAssessment } from "./geometry";
import { spendTacticalAmmunition } from "./tacticalAmmunition";
import { tacticalHitRollEvent } from "./tacticalFire";
import { queueTacticalUnexpectedFireMoraleCheck } from "./tacticalMorale";
import { tacticalCombatant } from "./tacticalStateHelpers";
import type { CombatScenario, CoveringFireLane, GridPoint, TacticalMapState, WeaponProfile } from "./types";
import { applyTacticalWound } from "./tacticalWounds";

export const coveringFireAmmunitionCost = (weapon: WeaponProfile) => weapon.burstSize ?? (weapon.automatic ? 3 : 1);

export const resolveTacticalCoveringFire = (map: TacticalMapState, primary: CombatScenario["combatants"][number], lane: CoveringFireLane, rolls: Record<string, { hitDice: DicePair; woundDice: DicePair }>, crossing: boolean) => {
  map.coveringFireLanes = map.coveringFireLanes.filter((candidate) => candidate !== lane);
  const attacker = tacticalCombatant(map, lane.attackerId);
  const ammunitionCost = attacker ? coveringFireAmmunitionCost(attacker.weapon) : 1;
  if (!attacker || attacker.defeated || (attacker.weapon.highEnergy && !map.bracedCombatantIds.includes(attacker.id)) || (map.ammunitionByCharacterId[attacker.id] ?? 0) < ammunitionCost) return new Set<string>();
  const targetCells = crossing ? new Set([pointKey(primary.position)]) : new Set(lane.cells.map(pointKey));
  const targets = map.scenario.combatants
    .filter((unit) => unit.id !== attacker.id && !unit.defeated && targetCells.has(pointKey(unit.position)))
    .sort((first, second) => lane.cells.findIndex((cell) => pointKey(cell) === pointKey(first.position)) - lane.cells.findIndex((cell) => pointKey(cell) === pointKey(second.position)) || map.scenario.combatants.indexOf(first) - map.scenario.combatants.indexOf(second));
  if (targets.length === 0 || !spendTacticalAmmunition(map, attacker, ammunitionCost)) return new Set<string>();
  const defeatedIds = new Set<string>();
  const automaticDangerSpace = attacker.weapon.automatic || attacker.weapon.inherentAutomaticFireBonus || attacker.weapon.attacksEveryoneInSquare;
  let hits = 0;
  for (let index = 0; index < targets.length;) {
    const squareKey = pointKey(targets[index].position);
    const squareTargets = targets.filter((target) => pointKey(target.position) === squareKey);
    for (const target of squareTargets) {
      const dice = rolls[target.id] ?? rolls[primary.id];
      if (!dice) continue;
      const result = resolveSnapShot(attacker, target, dice.hitDice, dice.woundDice, coverProtection(map.scenario, attacker.id, target.id), "covering", false, map.suppressedCombatantIds.includes(attacker.id), map.bracedCombatantIds.includes(attacker.id), tacticalVisibilityAssessment(map.scenario, attacker, target).darknessModifier);
      if (!result) continue;
      queueTacticalUnexpectedFireMoraleCheck(map, attacker, target);
      if (result.hit) {
        hits += 1;
        applyTacticalWound(map, target, result.woundState);
      }
      if (target.defeated) defeatedIds.add(target.id);
      map.events.unshift(`${attacker.name} covering fired ${crossing ? `as ${primary.name} crossed the lane` : `at ${target.name}`}: ${tacticalHitRollEvent(result)} · ${result.hit ? `wound ${result.woundTotal} (${result.woundState})` : "miss"}`);
      if (!automaticDangerSpace && result.hit) return defeatedIds;
    }
    if (automaticDangerSpace && hits >= 2) break;
    index += squareTargets.length;
  }
  return defeatedIds;
};

export const tacticalCoverAtPosition = (map: TacticalMapState, attackerId: string, target: CombatScenario["combatants"][number], position: GridPoint) => coverProtection({
  ...map.scenario,
  combatants: map.scenario.combatants.map((unit) => unit.id === target.id ? { ...unit, position } : unit),
}, attackerId, target.id);
