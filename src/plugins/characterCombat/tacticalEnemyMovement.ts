import { pathWithinMovementAllowance, routeAllowingClosedDoors, shortestPathToAny, type TacticalPathfindingContext } from "./geometry";
import { irisValveAcrossPressureDifferential } from "./tacticalDoors";
import { distanceBetween, facingTowardFieldOfFire } from "./enemyTactics";
import { recordTacticalObservedEvent } from "./tacticalObservation";
import type { CombatScenario, Combatant, GridPoint, TacticalMapState } from "./types";

export type TacticalEnemyMovementPlan =
  | { status: "resolved" }
  | { status: "move"; origin: GridPoint; path: GridPoint[]; trotting: boolean; finalFacing: Combatant["facing"] };

export const planTacticalEnemyMovement = (
  map: TacticalMapState,
  enemy: Combatant,
  livingPlayers: Combatant[],
  routeScenario: CombatScenario,
  pathfinding?: TacticalPathfindingContext,
): TacticalEnemyMovementPlan => {
  const target = [...livingPlayers].sort((a, b) => distanceBetween(enemy.position, a.position) - distanceBetween(enemy.position, b.position) || a.id.localeCompare(b.id))[0];
  const goals = [
    { x: target.position.x + 1, y: target.position.y }, { x: target.position.x, y: target.position.y + 1 },
    { x: target.position.x - 1, y: target.position.y }, { x: target.position.x, y: target.position.y - 1 },
  ].filter((point) => point.x >= 0 && point.y >= 0 && point.x < map.scenario.width && point.y < map.scenario.height);
  let route = shortestPathToAny(routeScenario, enemy.id, goals, pathfinding);
  if (!route) {
    const doorRoute = routeAllowingClosedDoors(routeScenario, enemy.id, goals);
    if (doorRoute?.door && doorRoute.doorStepIndex === 0) {
      if (map.actionPointsByCharacterId[enemy.id] < 6) {
        recordTacticalObservedEvent(map, enemy, `${enemy.name} lacked AP to open ${doorRoute.door.id}`);
        return { status: "resolved" };
      }
      const scenarioDoor = map.scenario.doors.find((door) => door.id === doorRoute.door!.id);
      if (!scenarioDoor) return { status: "resolved" };
      if (irisValveAcrossPressureDifferential(map, scenarioDoor.id)) {
        recordTacticalObservedEvent(map, enemy, `${enemy.name} could not open ${scenarioDoor.id} across a pressure differential`);
        return { status: "resolved" };
      }
      scenarioDoor.open = true;
      map.doorOpenById[scenarioDoor.id] = true;
      map.actionPointsByCharacterId[enemy.id] -= 6;
      recordTacticalObservedEvent(map, enemy, `${enemy.name} opened ${scenarioDoor.id}`);
      return { status: "resolved" };
    }
    route = doorRoute?.door ? doorRoute.path.slice(0, doorRoute.doorStepIndex) : doorRoute?.path ?? null;
  }
  if (!route?.length) {
    recordTacticalObservedEvent(map, enemy, `${enemy.name} held position`);
    return { status: "resolved" };
  }
  const trotting = distanceBetween(enemy.position, target.position) > 4 && enemy.posture === "standing" && !map.suppressedCombatantIds.includes(enemy.id);
  const path = pathWithinMovementAllowance(routeScenario, enemy.position, route, Math.min(map.actionPointsByCharacterId[enemy.id], trotting ? 6 : map.suppressedCombatantIds.includes(enemy.id) ? 2 : 3), enemy.facing, trotting);
  if (!path.length) {
    recordTacticalObservedEvent(map, enemy, `${enemy.name} held position`);
    return { status: "resolved" };
  }
  const destination = path[path.length - 1];
  return {
    status: "move",
    origin: { ...enemy.position },
    path,
    trotting,
    finalFacing: facingTowardFieldOfFire(enemy, destination)?.facing ?? enemy.facing,
  };
};
