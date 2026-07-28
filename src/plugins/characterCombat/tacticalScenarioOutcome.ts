import type { TacticalMapState } from "./types";

export const concludeTacticalScenario = (map: TacticalMapState, status: "victory" | "defeat", event: string) => {
  if (map.scenarioStatus !== "active") return;
  map.scenarioStatus = status;
  map.activeCharacterId = null;
  map.movementMode = null;
  map.pendingAdjacencyReaction = null;
  map.plannedDestination = null;
  map.plannedEnemyEntryTargetId = null;
  map.plannedAttackTargetId = null;
  map.plannedAttackMode = null;
  map.plannedMeleeTargetId = null;
  map.grenadeTargeting = false;
  map.plannedGrenadeTarget = null;
  map.plannedExtinguishFire = null;
  map.coveringFireTargeting = false;
  map.plannedCoveringFireTarget = null;
  map.plannedTreatmentTargetId = null;
  map.selectedTerrainObjectId = null;
  Object.keys(map.actionPointsByCharacterId).forEach((id) => { map.actionPointsByCharacterId[id] = 0; });
  map.events.unshift(event);
};

export const resolveTacticalDefeat = (map: TacticalMapState) => {
  const crew = map.scenario.combatants.filter((unit) => unit.side === "player");
  if (crew.length > 0 && crew.every((unit) => unit.defeated)) concludeTacticalScenario(map, "defeat", "Defeat — all crew are incapacitated");
};
