import type { TacticalMapState } from "./types";

export const tacticalPlayerIds = (map: TacticalMapState) => (
  map.scenario.combatants.filter((unit) => unit.side === "player").map((unit) => unit.id)
);

export const tacticalCombatant = (map: TacticalMapState, id: string | null | undefined) => (
  id ? map.scenario.combatants.find((unit) => unit.id === id) ?? null : null
);

export const advanceTacticalPlayerActivation = (map: TacticalMapState) => {
  if (map.scenarioStatus !== "active") {
    map.activeCharacterId = null;
    return;
  }
  const remaining = tacticalPlayerIds(map).filter((id) => (
    !map.actedCharacterIds.includes(id)
    && (map.actionPointsByCharacterId[id] ?? 0) > 0
    && !tacticalCombatant(map, id)?.defeated
  ));
  map.activeCharacterId = remaining[0] ?? null;
};
