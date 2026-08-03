import { hasLineOfSight, pointKey, prepareTacticalVisibilityContext, tacticalVisibilityAssessment } from "./geometry";
import type { CombatScenario, GridPoint, TacticalMapState } from "./types";

export const tacticalPathObservedByCrew = (map: TacticalMapState, points: GridPoint[]) => map.scenario.combatants
  .filter((observer) => observer.side === "player" && !observer.defeated && !observer.surrendered)
  .some((observer) => points.some((point) => pointKey(observer.position) === pointKey(point) || hasLineOfSight(map.scenario, observer.position, point)));

export const recordTacticalObservedEvent = (map: TacticalMapState, unit: CombatScenario["combatants"][number], event: string, points: GridPoint[] = [unit.position]) => {
  if (unit.side === "player" || tacticalPathObservedByCrew(map, points)) map.events.unshift(event);
};

export const recordTacticalMovementAnimation = (map: TacticalMapState, unit: CombatScenario["combatants"][number], origin: GridPoint, path: GridPoint[], mode: "walk" | "run") => {
  const observed = unit.side === "player" || tacticalPathObservedByCrew(map, [origin, ...path]);
  if (!observed) {
    delete map.movementAnimationByCharacterId[unit.id];
    return;
  }
  map.movementAnimationByCharacterId[unit.id] = { sequence: (map.movementAnimationByCharacterId[unit.id]?.sequence ?? 0) + 1, path: [origin, ...path.map((point) => ({ ...point }))], mode };
};

export const tacticalVisibilitySnapshot = (scenario: CombatScenario) => {
  const visibility = prepareTacticalVisibilityContext(scenario);
  return Object.fromEntries(scenario.combatants.map((observer) => [observer.id, scenario.combatants
    .filter((target) => target.side !== observer.side
      && !target.defeated
      && tacticalVisibilityAssessment(scenario, observer, target, visibility).observable)
    .map((target) => target.id)]));
};
