import { accumulateWound, type AhlMeleeEffect } from "./combatResolution";
import { queueTacticalCasualtyMoraleChecks } from "./tacticalMorale";
import { resolveTacticalDefeat } from "./tacticalScenarioOutcome";
import type { CombatScenario, TacticalMapState } from "./types";

export const applyTacticalWound = (map: TacticalMapState, unit: CombatScenario["combatants"][number], woundState: CombatScenario["combatants"][number]["woundState"]) => {
  const previousWoundState = unit.woundState;
  const wound = accumulateWound(unit.woundState, woundState, unit.seriousWounds);
  unit.woundState = wound.woundState;
  unit.seriousWounds = wound.seriousWounds;
  unit.defeated = wound.woundState === "serious" || wound.woundState === "unconscious" || wound.woundState === "dead";
  if (unit.defeated) unit.health = 0;
  if (unit.woundState !== previousWoundState && (unit.woundState === "serious" || unit.woundState === "unconscious" || unit.woundState === "dead")) queueTacticalCasualtyMoraleChecks(map, unit);
  resolveTacticalDefeat(map);
};

export const applyTacticalAhlMeleeEffect = (map: TacticalMapState, unit: CombatScenario["combatants"][number], effect: AhlMeleeEffect) => {
  if (effect === "none") return;
  if (effect === "stun") {
    map.ahlMeleeStunUntilTurnById[unit.id] = map.turn + 1;
    if (unit.woundState === "healthy") unit.woundState = "light";
    return;
  }
  applyTacticalWound(map, unit, effect === "light" ? "light" : effect === "unconscious" ? "unconscious" : "dead");
};
